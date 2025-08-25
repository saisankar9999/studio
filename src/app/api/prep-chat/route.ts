
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateInterviewResponse } from '@/ai/flows/generate-interview-response';
import { configureFirebase } from '@/lib/firebase/firebase-admin';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore/lite';

const prepChatRequest = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  resumeText: z.string(),
  jdText: z.string(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = prepChatRequest.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { messages, resumeText, jdText, userId } = validation.data;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content;
    if (!lastUserMessage) {
        return NextResponse.json({ error: 'No user message found' }, { status: 400 });
    }
    
    // Use the correct Genkit flow for generating a grounded answer
    const { answer } = await generateInterviewResponse({
        transcription: lastUserMessage,
        resume: resumeText,
        jobDescription: jdText,
    });
    
    // Save conversation to Firestore for model training
    if (userId) {
      try {
        const { db } = configureFirebase();
        if (db) {
            await addDoc(collection(db, 'prepConversations'), {
              userId,
              messages, // Storing the conversation history
              resume: resumeText,
              jobDescription: jdText,
              timestamp: serverTimestamp(),
            });
        }
      } catch (firestoreError) {
        console.error('Error saving conversation to Firestore:', firestoreError);
      }
    }

    return NextResponse.json({ response: answer });
  } catch (error) {
    console.error('Error in prep chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to get response: ${errorMessage}` }, { status: 500 });
  }
}
