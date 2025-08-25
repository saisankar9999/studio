
import { NextRequest, NextResponse } from 'next/server';
import { generate } from 'genkit/ai';
import { geminiPro } from 'genkitx/googleai';
import { z } from 'zod';
import { configureFirebase } from '@/lib/firebase/firebase-admin';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore/lite';

const prepChatRequest = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  resumeAnalysis: z.string().optional(),
  userId: z.string().optional(), // Assuming you'll pass userId for logging
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = prepChatRequest.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { messages, resumeAnalysis, userId } = validation.data;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      content: [{text: msg.content}],
    }));

    const systemInstruction = {
      role: 'system',
      content: `You are an expert interview preparation assistant. Your goal is to help the user prepare for their job interview by providing detailed, accurate, and helpful information based on their resume and the job description analysis.

Resume and Job Description Analysis:
---
${resumeAnalysis || 'No analysis provided'}
---

Your responses must be:
- Comprehensive and detailed.
- Include specific examples where relevant.
- Explain concepts clearly and step-by-step.
- Address the user's questions directly.
- Provide actionable advice for interview preparation.
- Help the user understand how, where, and why technologies were used in their experience.

This conversation is helping to train a model that will assist the user during their live interview, so be thorough and precise. Use markdown for formatting.`
    };
    
    const llmResponse = await generate({
      model: geminiPro,
      prompt: {
          system: systemInstruction.content,
          messages: formattedMessages.map(m => m.content[0].text)
      },
      config: {
        temperature: 0.5,
      },
    });
    
    const responseText = llmResponse.text();

    // Save conversation to Firestore for model training
    if (userId) {
      try {
        const { db } = configureFirebase();
        if (db) {
            await addDoc(collection(db, 'prepConversations'), {
              userId,
              messages,
              resumeAnalysis,
              timestamp: serverTimestamp(),
            });
        }
      } catch (firestoreError) {
        console.error('Error saving conversation to Firestore:', firestoreError);
        // Continue even if saving fails
      }
    }

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Error in prep chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to get response: ${errorMessage}` }, { status: 500 });
  }
}
