import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // Extend duration for long streams if needed, 60s max on hobby

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages, sessionId, materialId, selectedContext } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // Fetch the material to provide full context to the AI (only needed if we want to pass the whole doc)
  // For the MVP, we can fetch it, or rely heavily on the selectedContext to save tokens.
  const { data: material } = await supabase
    .from('materials')
    .select('raw_content, title')
    .eq('id', materialId)
    .single();

  // Increment AI Dependence Count
  if (sessionId) {
    const { data: session } = await supabase
      .from('study_sessions')
      .select('ai_dependence_count')
      .eq('id', sessionId)
      .single();
      
    if (session) {
      await supabase
        .from('study_sessions')
        .update({ ai_dependence_count: session.ai_dependence_count + 1 })
        .eq('id', sessionId);
    }
  }

  const systemPrompt = `You are Acers, a strict and intelligent study assistant.
Your goal is to help the student master the material, NOT to just give them the answers easily.
You are currently helping the student with the document: "${material?.title || 'Unknown Document'}".

${selectedContext ? `The student has highlighted the following context from the document:\n"""\n${selectedContext}\n"""\nFocus your answer heavily on this highlighted context.` : `The student has not highlighted any specific text, so answer based on the general document.`}

When explaining, use analogies. When quizzing, ask one question at a time and wait for their response. Do not hallucinate information outside the document unless providing a real-world example. Keep responses concise.`;

  const result = streamText({
    model: google('gemini-3.5-flash-lite'),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
