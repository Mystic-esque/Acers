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

  const { conceptId, question, userAnswer, sessionId } = await req.json();

  if (!conceptId || !question || !userAnswer || !sessionId) {
    return new Response('Missing required fields', { status: 400 });
  }

  const { data: concept, error } = await supabase
    .from('concepts')
    .select('name, description')
    .eq('id', conceptId)
    .single();

  if (error || !concept) {
    return new Response('Concept not found', { status: 404 });
  }

  const systemPrompt = `You are a strict, intelligent study assistant grading a student's answer to an active recall question.
You will be given the concept, the question asked, and the student's answer.
Grade the student's answer fairly but rigorously. Provide constructive feedback.

Your output must contain:
1. accuracy: 0-100 score on how factually correct the answer is.
2. completeness: 0-100 score on how thoroughly the answer covers the core concept.
3. misconceptions: an array of strings detailing any misunderstandings (empty if none).
4. feedback_text: a brief, encouraging, but direct message explaining their score and what they missed.`;

  const userPrompt = `Concept Name: ${concept.name}
Concept Description: ${concept.description}

Question Asked: ${question}
Student's Answer: ${userAnswer}

Grade the answer according to the schema.`;

  try {
    const result = await generateObject({
      model: google('gemini-3.1-flash-lite'),
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        accuracy: z.number().min(0).max(100),
        completeness: z.number().min(0).max(100),
        misconceptions: z.array(z.string()),
        feedback_text: z.string(),
      }),
    });

    const aiFeedback = result.object;

    // 1. Insert into recall_attempts
    await supabase.from('recall_attempts').insert({
      session_id: sessionId,
      concept_id: conceptId,
      user_id: user.id,
      input_text: userAnswer,
      ai_feedback: aiFeedback
    });

    // 2. Upsert concept_mastery for understanding
    // Average accuracy and completeness for understanding score
    const understandingScore = (aiFeedback.accuracy + aiFeedback.completeness) / 2;
    
    // Check if independence should also be updated
    const { data: session } = await supabase
      .from('study_sessions')
      .select('ai_dependence_count')
      .eq('id', sessionId)
      .single();

    const dimensionsToUpsert = [{
      concept_id: conceptId,
      user_id: user.id,
      dimension: 'understanding',
      score: understandingScore
    }];

    if (session && session.ai_dependence_count === 0) {
      dimensionsToUpsert.push({
        concept_id: conceptId,
        user_id: user.id,
        dimension: 'independence',
        score: 100 // Full independence if no AI used
      });
    }

    // Upsert each dimension (using raw SQL/rpc or doing an insert with onConflict)
    for (const dim of dimensionsToUpsert) {
      await supabase
        .from('concept_mastery')
        .upsert({
          concept_id: dim.concept_id,
          user_id: dim.user_id,
          dimension: dim.dimension,
          score: dim.score,
          last_updated: new Date().toISOString()
        }, { onConflict: 'concept_id, dimension' });
    }

    return Response.json(aiFeedback);
  } catch (err) {
    console.error("Error grading recall question:", err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
