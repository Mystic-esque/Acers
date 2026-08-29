import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export async function synthesizeStudyReport(
  recallAttempts: any[],
  aiDependenceCount: number,
  concepts: any[]
) {
  const systemPrompt = `You are an expert study assistant analyzing a student's recent study session.
You have data on the active recall questions they answered, their scores (accuracy and completeness), and how many times they asked AI for help (aiDependenceCount = ${aiDependenceCount}).
The concepts in this document are:
${concepts.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

Your task is to synthesize this data into a study report.
1. Categorize concepts into strong, uncertain, and weak based on their scores. If there are no attempts for a concept, make an educated guess based on related concepts or put it in uncertain if unsure.
2. Calculate a retrieval_score (0-100) representing overall performance across all recall attempts.
3. Recommend a next step (e.g. "Review X before moving on" or "You're ready to test your knowledge on Y").
4. Recommend a specific concept ID to focus on next.
5. Recommend an assessment format for it from the following options: 'teach_back', 'hallucination', 'progressive_case'.`;

  const userPrompt = `Recall Attempts Data:
${JSON.stringify(recallAttempts, null, 2)}

Analyze this session and return the structured report.`;

  try {
    const result = await generateObject({
      model: google('gemini-3.5-flash'), // 3.5-flash for synthesis
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        strong_concept_ids: z.array(z.string()),
        uncertain_concept_ids: z.array(z.string()),
        weak_concept_ids: z.array(z.string()),
        retrieval_score: z.number().min(0).max(100),
        recommended_next_step: z.string(),
        recommended_concept_id: z.string().nullable(),
        recommended_format: z.string().nullable()
      }),
    });

    return result.object;
  } catch (error) {
    console.error("Error synthesizing report:", error);
    // Return a safe fallback so the app doesn't crash
    return {
      strong_concept_ids: [],
      uncertain_concept_ids: concepts.map(c => c.id),
      weak_concept_ids: [],
      retrieval_score: 0,
      recommended_next_step: "Keep studying to generate a more accurate report.",
      recommended_concept_id: concepts.length > 0 ? concepts[0].id : null,
      recommended_format: 'teach_back'
    };
  }
}
