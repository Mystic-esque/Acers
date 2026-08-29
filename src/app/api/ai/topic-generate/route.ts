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

  const { materialId, topic } = await req.json();

  if (!materialId || !topic) {
    return new Response('Missing materialId or topic', { status: 400 });
  }

  const systemPrompt = `You are an expert educator creating a comprehensive, beautifully structured study guide for a student.
Generate a rich, multi-section overview of the topic provided.
Requirements:
1. Format with clean Markdown headers (## Introduction, ## Core Mechanisms, ## Key Concepts, ## Real-World Applications, ## Summary).
2. Break into 4-6 distinct, informative sections.
3. Ensure the concepts are explained sequentially from foundational to advanced.`;

  const userPrompt = `Topic: ${topic}\n\nPlease generate the comprehensive, section-structured study guide.`;

  try {
    let result;
    try {
      result = await generateObject({
        model: google('gemini-3.5-flash-lite'),
        system: systemPrompt,
        prompt: userPrompt,
        schema: z.object({
          content: z.string().describe("The comprehensive educational content formatted with Markdown section headings (## Heading) and paragraphs."),
        }),
      });
    } catch (apiError: any) {
      console.warn("Primary model failed. Retrying with fallback...", apiError);
      result = await generateObject({
        model: google('gemini-3.1-flash-lite'),
        system: systemPrompt,
        prompt: userPrompt,
        schema: z.object({
          content: z.string().describe("The comprehensive educational content formatted with Markdown section headings (## Heading) and paragraphs."),
        }),
      });
    }

    const { error: updateError } = await supabase
      .from('materials')
      .update({ raw_content: result.object.content })
      .eq('id', materialId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error("Error updating material:", updateError);
      return new Response('Failed to update material', { status: 500 });
    }

    return Response.json({ success: true, content: result.object.content });
  } catch (error) {
    console.error("Error generating topic:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
