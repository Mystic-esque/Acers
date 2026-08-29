import { createClient } from '@/lib/supabase/server';
import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { NextResponse } from 'next/server';

export const maxDuration = 120; // Audio generation might take a bit

interface DialogueTurn {
  speaker: 'Host1' | 'Host2';
  text: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return new Response('Unauthorized', { status: 401 });

    const { materialId } = await req.json();
    if (!materialId) return new Response('Missing materialId', { status: 400 });

    const { data: material, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (error || !material || !material.raw_content) {
      return new Response('Material not found or empty', { status: 404 });
    }

    // Check if we already generated and saved the overview
    const fileName = `overviews/${materialId}_overview_v2.wav`;
    
    // Check if the file exists using list
    const { data: files } = await supabase.storage.from('materials').list('overviews', { search: `${materialId}_overview_v2.wav` });
    if (files && files.length > 0 && (files[0].metadata?.size ?? 0) > 0) {
      const { data: publicUrlData } = supabase.storage.from('materials').getPublicUrl(fileName);
      return NextResponse.json({ audioUrl: publicUrlData.publicUrl });
    }

    // Step 1: Generate Script
    const systemPrompt = `You are a podcast producer for "Deep Dive", a show where two hosts explain educational topics in an engaging, conversational way.
Your task is to take the provided document and create a short 6-10 turn dialogue script.
Host1 (voice: casual, curious) guides the discussion, asks questions, and uses analogies.
Host2 (voice: expert, analytical) explains the details.
Return JSON with a "dialogue" array containing objects with "speaker" (either "Host1" or "Host2") and "text". Keep each turn short and engaging!`;

    const generateScript = async (modelName: string) => {
      const { object } = await generateObject({
        model: google(modelName),
        system: systemPrompt,
        prompt: `Document Title: ${material.title}\n\nContent to summarize:\n${material.raw_content.substring(0, 10000)}`,
        schema: z.object({
          dialogue: z.array(z.object({
            speaker: z.enum(['Host1', 'Host2']),
            text: z.string()
          })).min(4).max(12)
        })
      });
      return object;
    };

    let object;
    try {
      object = await generateScript('gemini-3.5-flash-lite');
    } catch (error) {
      console.warn(`gemini-3.5-flash-lite failed, falling back to gemini-3.1-flash-lite`, error);
      object = await generateScript('gemini-3.1-flash-lite');
    }

    const script: DialogueTurn[] = object.dialogue;

    let fullScript = "";
    for (const turn of script) {
      fullScript += `${turn.speaker === 'Host1' ? 'Alex' : 'Jordan'} says: ${turn.text} ... `;
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    // TTS Generation with Fallback
    const requestTts = async (modelName: string) => {
      const ttsUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      return await fetch(ttsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullScript }] }],
          generationConfig: { responseModalities: ["AUDIO"] }
        }),
      });
    };

    let ttsResponse = await requestTts('gemini-2.5-flash-preview-tts');
    
    // If rate limited or error, fallback to 3.1
    if (!ttsResponse.ok) {
      console.warn(`2.5 TTS failed with ${ttsResponse.status}, falling back to gemini-3.1-flash-preview-tts`);
      ttsResponse = await requestTts('gemini-3.1-flash-preview-tts');
    }

    if (!ttsResponse.ok) {
      throw new Error(`TTS API failed: ${ttsResponse.statusText}`);
    }

    const ttsData = await ttsResponse.json();
    
    const parts = ttsData.candidates?.[0]?.content?.parts || [];
    let inlineData = null;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
        inlineData = part.inlineData;
        break;
      }
    }

    if (!inlineData || !inlineData.data) {
      throw new Error("No audio data returned by model");
    }

    const base64Audio = inlineData.data;
    let mimeType = inlineData.mimeType || 'audio/wav';
    
    // Convert base64 to buffer
    let buffer = Buffer.from(base64Audio, 'base64');
    
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

    let uploadError = null;
    let retryCount = 0;
    
    while (retryCount < 2) {
      const { error } = await supabase.storage
        .from('materials')
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        });
        
      if (!error) {
        uploadError = null;
        break;
      }
      uploadError = error;
      retryCount++;
      // Wait a second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (uploadError) {
      console.error("Failed to save audio to storage after retries:", uploadError);
      // Fallback to data URI if storage fails, making sure to use the buffer that has the WAV header
      return NextResponse.json({ audioUrl: `data:${mimeType};base64,${buffer.toString('base64')}` });
    }

    // Get public URL for the saved audio
    const { data: publicUrlData } = supabase.storage
      .from('materials')
      .getPublicUrl(fileName);

    return NextResponse.json({ audioUrl: publicUrlData.publicUrl });

  } catch (error: any) {
    console.error("Audio overview generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
