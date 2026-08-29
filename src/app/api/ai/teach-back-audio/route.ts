import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { conceptName, transcript, grading } = await req.json();

    const systemPrompt = `You are an encouraging, expert tutor talking directly to a student. 
The student just explained "${conceptName}". 
Here is their transcript: "${transcript}"
Here is the AI grading: Accuracy: ${grading.accuracy_score}, Completeness: ${grading.completeness_score}.
General Feedback: ${grading.general_feedback}

Your task: Generate the EXACT text of a short, conversational response (under 20 seconds of speech).
Praise what they got right, and gently point out what they missed or got wrong. 
Speak naturally, as a human tutor would. Output ONLY the spoken text, with no formatting or speaker labels.`;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // 1. Generate the spoken script using a standard LLM
    const scriptRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
      })
    });
    
    if (!scriptRes.ok) throw new Error("Failed to generate script");
    const scriptData = await scriptRes.json();
    const spokenText = scriptData.candidates?.[0]?.content?.parts?.[0]?.text || "Great job!";
    
    // 2. Generate audio from the text script
    const requestTts = async (modelName: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Important: Only give the TTS model the exact text to read!
          contents: [{ role: 'user', parts: [{ text: spokenText }] }],
          generationConfig: { responseModalities: ["AUDIO"] }
        })
      });
    };

    let response = await requestTts('gemini-2.5-flash-preview-tts');
    
    // If rate limited or error, fallback to 3.1
    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      console.warn(`2.5 TTS failed with ${response.status}, falling back to gemini-3.1-flash-preview-tts`);
      response = await requestTts('gemini-3.1-flash-preview-tts');
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("Audio generation failed:", errText);
      return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
    }

    const data = await response.json();
    
    // Extract base64 audio from the response
    // Typical structure: data.candidates[0].content.parts[0].inlineData.data
    const parts = data.candidates?.[0]?.content?.parts || [];
    let audioBase64 = null;
    let mimeType = 'audio/wav';
    let fallbackText = null;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
        let rawBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
        
        let buffer = Buffer.from(rawBase64, 'base64');
        
        // If Gemini returned raw PCM (e.g. 'audio/L16;codec=pcm;rate=24000'), it lacks a WAV header. We must add it so browsers can play it natively.
        if (mimeType.includes('pcm') || mimeType.includes('L16') || mimeType.includes('raw')) {
          const pcmLength = buffer.length;
          const sampleRate = 24000;
          const numChannels = 1;
          const bitsPerSample = 16;
          
          const header = Buffer.alloc(44);
          header.write('RIFF', 0);
          header.writeUInt32LE(36 + pcmLength, 4);
          header.write('WAVE', 8);
          header.write('fmt ', 12);
          header.writeUInt32LE(16, 16); // PCM format chunk size
          header.writeUInt16LE(1, 20); // Audio format (1 = PCM)
          header.writeUInt16LE(numChannels, 22);
          header.writeUInt32LE(sampleRate, 24);
          header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // Byte rate
          header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // Block align
          header.writeUInt16LE(bitsPerSample, 34);
          header.write('data', 36);
          header.writeUInt32LE(pcmLength, 40);
          
          buffer = Buffer.concat([header, buffer]);
          mimeType = 'audio/wav'; // Update mimeType since it's now a valid WAV file
        }
        
        audioBase64 = buffer.toString('base64');
      } else if (part.text) {
        fallbackText = part.text;
      }
    }

    if (audioBase64) {
      return NextResponse.json({ audioBase64, mimeType, text: fallbackText });
    } else {
      // If no audio returned, we can fallback to text for client-side TTS
      return NextResponse.json({ text: fallbackText, error: "No audio data returned by model" });
    }

  } catch (error) {
    console.error("Audio generation error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
