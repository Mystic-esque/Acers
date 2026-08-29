import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { conceptId, transcript } = await req.json();

    if (!conceptId || !transcript) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 1. Fetch Concept context
    const { data: concept } = await supabase
      .from('concepts')
      .select('*, materials(raw_content)')
      .eq('id', conceptId)
      .single();

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    const materialContent = Array.isArray(concept.materials) ? concept.materials[0]?.raw_content : (concept.materials as any)?.raw_content;

    // 2. Grade the transcript
    const systemPrompt = `You are an expert educator grading a student's explanation of a concept.
Concept: ${concept.name}
Description: ${concept.description}
Material Context: ${materialContent ? materialContent.substring(0, 3000) : "No context"}

Evaluate the student's transcript based on:
1. Accuracy: Are the facts correct?
2. Completeness: Did they cover the main ideas?
3. Reasoning Quality: Is the explanation logical and well-structured?

Also, identify specific "weak spots" or "hallucinations" by extracting exact quotes from their transcript and providing a correction.

Output JSON with:
- accuracy_score (0-100)
- completeness_score (0-100)
- reasoning_score (0-100)
- general_feedback (A short summary of their performance)
- weak_spots: Array of { quote: "exact text from transcript", correction: "why it's wrong" }`;

    let grading;
    try {
      const result = await generateObject({
        model: google('gemini-3.7-flash'),
        system: systemPrompt,
        prompt: `Student Transcript:\n"${transcript}"`,
        schema: z.object({
          accuracy_score: z.number().min(0).max(100),
          completeness_score: z.number().min(0).max(100),
          reasoning_score: z.number().min(0).max(100),
          general_feedback: z.string(),
          weak_spots: z.array(z.object({
            quote: z.string(),
            correction: z.string()
          }))
        }),
      });
      grading = result.object;
    } catch (apiError: any) {
      console.warn("Primary model failed (likely rate limit). Retrying with lite fallback...", apiError);
      try {
        const fallbackResult = await generateObject({
          model: google('gemini-3.1-flash-lite'),
          system: systemPrompt,
          prompt: `Student Transcript:\n"${transcript}"`,
          schema: z.object({
            accuracy_score: z.number().min(0).max(100),
            completeness_score: z.number().min(0).max(100),
            reasoning_score: z.number().min(0).max(100),
            general_feedback: z.string(),
            weak_spots: z.array(z.object({
              quote: z.string(),
              correction: z.string()
            }))
          }),
        });
        grading = fallbackResult.object;
      } catch (fallbackError: any) {
        console.error("Fallback model also failed:", fallbackError);
        return NextResponse.json({ 
          error: 'Rate limit exceeded for all available AI models.',
          code: 'RATE_LIMIT_EXHAUSTED' 
        }, { status: 429 });
      }
    }

    // 3. Save attempt
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .insert({
        concept_id: conceptId,
        user_id: user.id,
        format: 'teach_back',
        status: 'completed',
        input: { transcript },
        ai_grading: grading
      })
      .select()
      .single();

    // 4. Upsert mastery (average the scores for understanding and independence)
    const understandingScore = Math.round((grading.accuracy_score + grading.completeness_score) / 2);
    const independenceScore = grading.reasoning_score;

    await supabase
      .from('concept_mastery')
      .upsert(
        { concept_id: conceptId, user_id: user.id, dimension: 'understanding', score: understandingScore },
        { onConflict: 'concept_id, dimension' }
      );
    
    await supabase
      .from('concept_mastery')
      .upsert(
        { concept_id: conceptId, user_id: user.id, dimension: 'independence', score: independenceScore },
        { onConflict: 'concept_id, dimension' }
      );

    return NextResponse.json({ grading, attemptId: attempt?.id });
  } catch (error) {
    console.error("Grading error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
