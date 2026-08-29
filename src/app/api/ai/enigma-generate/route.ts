import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { conceptId } = await req.json();
    if (!conceptId) return NextResponse.json({ error: 'Missing conceptId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Fetch Concept & Material
    const { data: concept, error: conceptError } = await supabase
      .from('concepts')
      .select('*, materials(*)')
      .eq('id', conceptId)
      .single();

    if (conceptError || !concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    const materialContext = concept.materials?.raw_content?.substring(0, 5000) || "No context";

    // 2. Generate Enigma Payload using the Elimination Funnel rules
    const systemPrompt = `You are an expert educational game designer creating a 'Concept Enigma' deduction puzzle.
Your goal is to test deep understanding by forcing the user to deduce the answer through an Elimination Funnel.
No single clue should give away the answer entirely. The answer must emerge from the intersection of clues.

TARGET CONCEPT: "${concept.name}"
CONCEPT DESCRIPTION: "${concept.description}"
MATERIAL CONTEXT: "${materialContext}"

Generate exactly 5 clues following this strict deductive scaffolding:
1. THE SHADOW: A broad quality, consequence, or overarching problem it solves. MUST be ambiguous enough to apply to at least 5 other concepts in this domain. DO NOT use specific terminology.
2. THE CONSTRAINT: A structural rule, requirement, or mechanic. Must eliminate half the possibilities, but still NOT use any textbook vocabulary from the concept's name.
3. THE BEHAVIOR: How the concept acts, its dynamics, or measurable properties. Narrows to 2-3 candidates.
4. THE LENS: A real-world visual analogy or parallel mental model.
5. THE KEYSTONE: The textbook giveaway, referencing its canonical context, contrasts, or literal definition.

CRITICAL RULES:
- NEVER use the word(s) in the concept name in ANY of the clues.
- The clues should range from extremely difficult/abstract (Clue 1) to obvious (Clue 5).
- Also provide an array of 'accepted_answers' (including common abbreviations, synonyms, and slight variations of the concept name) for fuzzy matching.`;

    let enigmaPayload;

    const schema = z.object({
      clues: z.array(z.string()).length(5).describe("Exactly 5 clues following the scaffold"),
      accepted_answers: z.array(z.string()).min(1).describe("Valid answers the user might type, e.g., ['Breadth First Search', 'BFS']")
    });

    try {
      const result = await generateObject({
        model: google('gemini-3.7-flash'),
        system: systemPrompt,
        prompt: `Generate the Enigma puzzle for "${concept.name}".`,
        schema
      });
      enigmaPayload = result.object;
    } catch (apiError) {
      console.warn("Primary model failed (Rate limit). Retrying with lite...", apiError);
      try {
        const fallbackResult = await generateObject({
          model: google('gemini-3.1-flash-lite'),
          system: systemPrompt,
          prompt: `Generate the Enigma puzzle for "${concept.name}".`,
          schema
        });
        enigmaPayload = fallbackResult.object;
      } catch (fallbackError) {
        console.error("Both models failed", fallbackError);
        return NextResponse.json({ error: 'Rate limit exhausted', code: 'RATE_LIMIT_EXHAUSTED' }, { status: 429 });
      }
    }

    return NextResponse.json({ enigma: enigmaPayload });
  } catch (err: any) {
    console.error("Enigma Generation API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
