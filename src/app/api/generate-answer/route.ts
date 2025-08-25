
import { NextRequest, NextResponse } from 'next/server';
import { generate } from 'genkit/ai';
import { geminiPro } from 'genkitx/googleai';
import { z } from 'zod';

const generateAnswerRequest = z.object({
  prompt: z.string(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = generateAnswerRequest.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { prompt } = validation.data;

    const llmResponse = await generate({
      model: geminiPro,
      prompt: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 250,
      },
    });

    return NextResponse.json({ answer: llmResponse.text() });
  } catch (error) {
    console.error('Error generating answer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to generate answer: ${errorMessage}` }, { status: 500 });
  }
}
