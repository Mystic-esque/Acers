import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // Extend duration for long streams if needed, 60s max on hobby

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { conceptId } = await req.json();

  if (!conceptId) {
    return new Response('Missing conceptId', { status: 400 });
  }

  const { data: concept, error } = await supabase
    .from('concepts')
    .select('name, description')
    .eq('id', conceptId)
    .single();

  if (error || !concept) {
    return new Response('Concept not found', { status: 404 });
  }

  const systemPrompt = `You are an expert study assistant. Your task is to generate a single, highly targeted active recall question based on the provided concept name and description.
The question should test the student's understanding of the core idea of the concept.
Do not make it a multiple choice question. It should require a free-text response.
Keep the question concise and directly related to the concept details provided.`;

  const userPrompt = `Concept Name: ${concept.name}
Concept Description: ${concept.description}

Generate a single active recall question for this concept.`;

  try {
    const result = await generateObject({
      model: google('gemini-3.1-flash-lite'),
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        question: z.string().describe("The active recall question testing the concept"),
      }),
    });

    return Response.json(result.object);
  } catch (err) {
    console.error("Error generating recall question:", err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
