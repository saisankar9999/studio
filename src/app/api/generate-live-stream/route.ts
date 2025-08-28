// src/app/api/generate-live-stream/route.ts
import { generateLiveResponseStream } from '@/ai/flows/generate-live-response';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { configureFirebase } from '@/lib/firebase/firebase-admin';

// Initialize Firebase Admin for server-side operations if needed by other parts,
// though this specific flow doesn't directly use it.
configureFirebase();

const requestSchema = z.object({
  resume: z.string(),
  jobDescription: z.string(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(validation.error.format(), { status: 400 });
    }

    const { resume, jobDescription, conversationHistory } = validation.data;

    // The last message in the history is the current question
    const question = conversationHistory[conversationHistory.length - 1].content;

    const stream = await generateLiveResponseStream({
      question,
      resume,
      jobDescription,
      conversationHistory,
    });

    // Return a streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Streaming failed: ${error}` }, { status: 500 });
  }
}
