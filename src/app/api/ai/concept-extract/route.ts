import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // 60s max for hobby

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { materialId } = await req.json();

  if (!materialId) {
    return new Response('Missing materialId', { status: 400 });
  }

  const { data: material, error } = await supabase
    .from('materials')
    .select('raw_content, title')
    .eq('id', materialId)
    .single();

  if (error || !material) {
    return new Response('Material not found', { status: 404 });
  }

  if (!material.raw_content) {
    return new Response('Material has no content to extract from', { status: 400 });
  }

  const systemPrompt = `You are an expert educational content analyzer.
Your task is to analyze the provided educational material and extract 3 to 6 key concepts that a student needs to master.
CRITICAL INSTRUCTIONS:
1. Extract concepts in CHRONOLOGICAL ORDER as they appear in the text from beginning to end.
2. For each concept, provide:
   - name: A short, clear name (e.g., "Mitochondria").
   - description: A 1-2 sentence description summarizing the core idea.
   - location_marker: The exact section heading or a distinctive 5-8 word verbatim phrase from the text where this concept is first introduced.
   - page_hint: The approximate 1-indexed page number (or section number) where this concept is located (if detectable), or an estimate based on progress through the text (e.g., 1 for beginning, 2 for middle).`;

  const userPrompt = `Material Title: ${material.title}\n\nContent:\n${material.raw_content.substring(0, 15000)}`;

  try {
    let result;
    const schema = z.object({
      concepts: z.array(z.object({
        name: z.string(),
        description: z.string(),
        location_marker: z.string(),
        page_hint: z.number().optional(),
      })).min(1).max(10),
    });

    try {
      result = await generateObject({
        model: google('gemini-3.5-flash-lite'),
        system: systemPrompt,
        prompt: userPrompt,
        schema
      });
    } catch (apiError: any) {
      console.warn("Primary model failed. Retrying with fallback...", apiError);
      result = await generateObject({
        model: google('gemini-3.1-flash-lite'),
        system: systemPrompt,
        prompt: userPrompt,
        schema
      });
    }

    const conceptsToInsert = result.object.concepts.map((c, index) => ({
      material_id: materialId,
      user_id: user.id,
      name: c.name,
      description: c.description,
      location_marker: c.location_marker || `Section ${index + 1}`,
    }));

    const { data: insertedConcepts, error: insertError } = await supabase
      .from('concepts')
      .insert(conceptsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting concepts:", insertError);
      return new Response('Failed to save concepts', { status: 500 });
    }

    return Response.json({ concepts: insertedConcepts });
  } catch (error) {
    console.error("Error extracting concepts:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
