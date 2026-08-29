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

  const { attemptId, userPickIndex, userExplanation } = await req.json();
  if (!attemptId || userPickIndex === undefined || !userExplanation) {
    return new Response('Missing required fields', { status: 400 });
  }

  // 1. Fetch draft attempt securely
  const { data: attempt, error: attemptError } = await supabase
    .from('assessment_attempts')
    .select('*, concepts(name, description)')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single();

  if (attemptError || !attempt || attempt.status !== 'in_progress') {
    return new Response('Invalid or completed attempt', { status: 400 });
  }

  const inputData = attempt.input as any;
  const pickCorrect = userPickIndex === inputData.false_index;
  const falseStatement = inputData.statements[inputData.false_index];

  // 2. Grade the explanation
  const systemPrompt = `You are an expert educator grading a student's explanation for why a specific statement is false.
The concept is: ${(attempt.concepts as any).name}
The false statement they were analyzing is: "${falseStatement}"
The student's task was to explain WHY it is false.

Evaluate their explanation. Did they correctly identify the error? Did they demonstrate true understanding, or just guess?

Return:
1. explanation_quality: 0 to 100 score. (If they picked the wrong statement entirely, this should be 0).
2. feedback_text: A short, encouraging but corrective feedback message addressing their explanation.`;

  const userPrompt = `Student picked: ${inputData.statements[userPickIndex]} (Correct answer was index ${inputData.false_index})\nStudent Explanation: "${userExplanation}"`;

  try {
    const schema = z.object({
      explanation_quality: z.number().min(0).max(100),
      feedback_text: z.string(),
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

    // If they picked the wrong one, force explanation quality to 0 regardless of AI output
    const explanation_quality = pickCorrect ? result.object.explanation_quality : 0;
    const ai_grading = {
      pick_correct: pickCorrect,
      explanation_quality,
      feedback_text: result.object.feedback_text
    };

    // 3. Update attempt to completed
    await supabase
      .from('assessment_attempts')
      .update({ status: 'completed', ai_grading })
      .eq('id', attemptId);

    // 4. Upsert concept_mastery
    // Discrimination: 100 if correct pick, 0 if wrong
    await supabase
      .from('concept_mastery')
      .upsert(
        { concept_id: attempt.concept_id, user_id: user.id, dimension: 'discrimination', score: pickCorrect ? 100 : 0 },
        { onConflict: 'concept_id, dimension' }
      );

    // Understanding: from explanation quality
    await supabase
      .from('concept_mastery')
      .upsert(
        { concept_id: attempt.concept_id, user_id: user.id, dimension: 'understanding', score: explanation_quality },
        { onConflict: 'concept_id, dimension' }
      );

    return Response.json(ai_grading);
  } catch (error) {
    console.error("Grading error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
