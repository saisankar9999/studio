
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateInterviewResponse } from '@/ai/flows/generate-interview-response';

const generateAnswerRequest = z.object({
  transcription: z.string(),
  resume: z.string(),
  jobDescription: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = generateAnswerRequest.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { transcription, resume, jobDescription } = validation.data;

    // Use the correct Genkit flow
    const { answer } = await generateInterviewResponse({
        transcription,
        resume,
        jobDescription,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error generating answer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to generate answer: ${errorMessage}` }, { status: 500 });
  }
}

    