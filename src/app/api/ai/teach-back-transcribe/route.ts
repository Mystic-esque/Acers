import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;
    const conceptName = formData.get('conceptName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase storage for records
    const fileName = `teach_back_audio/${user.id}/${Date.now()}.webm`;
    await supabase.storage.from('materials').upload(fileName, file);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // Use a standard multimodal model for speech-to-text.
    // gemini-3.5-transcribe is a Live API model (WebSocket-only) and does NOT work
    // with the generateContent REST endpoint. Instead, we use gemini-3.5-flash-lite
    // which accepts audio inline and transcribes accurately, with a much higher
    // rate limit (15 RPM vs 3 RPM).
    const transcribeWithModel = async (modelName: string): Promise<Response> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are a precise speech-to-text transcriber. Transcribe the following audio recording EXACTLY as spoken. Output ONLY the transcription text — no timestamps, no speaker labels, no commentary, no formatting. The speaker is explaining the concept "${conceptName}" in their own words.`
                },
                {
                  inlineData: {
                    mimeType: file.type || 'audio/webm',
                    data: buffer.toString('base64')
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1 // Low temperature for accurate transcription
          }
        })
      });
    };

    // Primary: gemini-3.5-flash-lite (15 RPM)
    let response = await transcribeWithModel('gemini-3.5-flash-lite');

    // Fallback: gemini-3.1-flash-lite if rate limited
    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      console.warn(`3.5-flash-lite transcription failed with ${response.status}, falling back to gemini-3.1-flash-lite`);
      response = await transcribeWithModel('gemini-3.1-flash-lite');
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("Transcription API error:", errText);
      return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }

    const data = await response.json();
    const transcriptText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // If Gemini didn't return text (e.g. they were silent), just return empty
    // so the user can see they need to record again, instead of throwing a 500.
    if (!transcriptText.trim()) {
      return NextResponse.json({ transcript: '' });
    }

    return NextResponse.json({ transcript: transcriptText.trim() });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
