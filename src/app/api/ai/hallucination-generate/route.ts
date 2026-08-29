import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { conceptId } = await req.json();
  if (!conceptId) return new Response('Missing conceptId', { status: 400 });

  // 1. Fetch Concept
  const { data: concept, error: conceptError } = await supabase
    .from('concepts')
    .select('*, materials(raw_content)')
    .eq('id', conceptId)
    .single();

  if (conceptError || !concept) return new Response('Concept not found', { status: 404 });

  // 2. Generate Hallucination
  const systemPrompt = `You are an expert educator testing a student's discrimination skills.
Your task is to generate 3 statements about the concept: 2 must be entirely TRUE, and 1 must be subtly FALSE (a hallucination).
The false statement should be a common misconception or a subtle inversion of a fact, not something obviously absurd.

Return:
1. statements: An array of exactly 3 strings.
2. false_index: The array index (0, 1, or 2) of the false statement.
3. hallucination_type: A short label for why it's wrong (e.g., "Inverted cause and effect", "Common misconception").`;

  const materialContent = Array.isArray(concept.materials) ? concept.materials[0]?.raw_content : (concept.materials as any)?.raw_content;
  
  const userPrompt = `Concept: ${concept.name}\nDescription: ${concept.description}\n\nContext:\n${materialContent ? materialContent.substring(0, 5000) : "No additional context."}`;

  try {
    const schema = z.object({
      statements: z.array(z.string()).length(3),
      false_index: z.number().min(0).max(2),
      hallucination_type: z.string(),
    });

    let result;
    try {
      result = await generateObject({
        model: google('gemini-3.6-flash'),
        system: systemPrompt,
        prompt: userPrompt,
        schema,
      });
    } catch (apiError: any) {
      console.warn("Primary model failed, falling back to gemini-3.1-flash-lite", apiError);
      result = await generateObject({
        model: google('gemini-3.1-flash-lite'),
        system: systemPrompt,
        prompt: userPrompt,
        schema,
      });
    }

    const { statements, false_index, hallucination_type } = result.object;

    // 3. Store draft securely on the server
    const { data: attempt, error: insertError } = await supabase
      .from('assessment_attempts')
      .insert({
        concept_id: conceptId,
        user_id: user.id,
        format: 'hallucination',
        status: 'in_progress',
        input: { statements, false_index, hallucination_type }
      })
      .select()
      .single();

    if (insertError || !attempt) {
      console.error("DB Error:", insertError);
      return new Response('Failed to save draft attempt', { status: 500 });
    }

    // 4. Return to client WITHOUT the false_index so they can't cheat
    return Response.json({
      attemptId: attempt.id,
      statements,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
