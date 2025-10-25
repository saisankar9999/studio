
'use server';

/**
 * @fileOverview A flow for generating a tailored interview response that uses Firestore for conversation history.
 *
 * - generateInterviewResponse - Generates an answer to the user's question, contextualized by resume, JD, and chat history.
 * - GenerateInterviewResponseInput - The input type for the function.
 * - GenerateInterviewResponseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { configureFirebase } from '@/lib/firebase/firebase-admin';

const GenerateInterviewResponseInputSchema = z.object({
  question: z.string().describe("The user's question to the AI mentor."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
  profileId: z.string().describe('The unique identifier for the user profile and conversation session.'),
});
export type GenerateInterviewResponseInput = z.infer<typeof GenerateInterviewResponseInputSchema>;

// The output is now just a confirmation, as the result is streamed to Firestore.
const GenerateInterviewResponseOutputSchema = z.object({
  success: z.boolean(),
});
export type GenerateInterviewResponseOutput = z.infer<typeof GenerateInterviewResponseOutputSchema>;

export async function generateInterviewResponse(
  input: GenerateInterviewResponseInput
): Promise<GenerateInterviewResponseOutput> {
  await generateInterviewResponseFlow(input);
  return { success: true };
}


// Define a schema for conversation history messages
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
type ChatMessage = z.infer<typeof ChatMessageSchema>;

const prompt = ai.definePrompt({
  name: 'generateInterviewResponsePrompt',
  input: {
    schema: z.object({
      resume: z.string(),
      jobDescription: z.string(),
      question: z.string(),
      // Make conversationHistory optional in the prompt itself
      conversationHistory: z.array(ChatMessageSchema).optional(),
    })
  },
  output: { schema: z.object({ answer: z.string() }) },
  prompt: `You are an expert AI career coach and interview mentor, like ChatGPT. Your goal is to help a candidate prepare for their job interview by providing detailed, accurate, and helpful information. Your persona is that of a knowledgeable and direct assistant. You are not the candidate. Do not role-play. Answer the user's questions directly.

Your tone should be supportive and insightful. Your responses MUST be highly structured and easy to read.

Follow these formatting rules STRICTLY:
- Use clear headings with '##' for main topics.
- Use bullet points ('•') for lists and key points.
- Use **bold text** to highlight key terms, concepts, and important phrases.
- Use numbered lists for step-by-step processes.
- Provide concrete, relevant examples to illustrate your points, especially when explaining technical concepts or behavioral strategies.
- Keep the language clear, concise, and professional.

CONTEXT FOR THE INTERVIEW:
Candidate's Resume:
---
{{{resume}}}
---
Job Description:
---
{{{jobDescription}}}
---
{{#if conversationHistory}}
CONVERSATION HISTORY:
---
{{#each conversationHistory}}
{{#if (eq this.role 'user')}}User: {{this.content}}{{/if}}
{{#if (eq this.role 'model')}}AI: {{this.content}}{{/if}}
{{/each}}
---
{{/if}}

The user, who you are coaching, has just asked the following question:
"{{{question}}}"

Your Response (as the AI coach):`,
});

const generateInterviewResponseFlow = ai.defineFlow(
  {
    name: 'generateInterviewResponseFlow',
    inputSchema: GenerateInterviewResponseInputSchema,
    outputSchema: z.void(), // This flow doesn't directly return to the client
  },
  async ({ question, resume, jobDescription, profileId }) => {
    const { db, firestore } = configureFirebase();
    if (!db || !firestore) {
      console.error("Firestore not initialized. Cannot proceed.");
      throw new Error('Server-side Firestore is not configured.');
    }

    const conversationRef = db.collection('prepConversations').doc(profileId).collection('messages');

    // 1. Save the user's question to Firestore immediately.
    const userMessageRef = conversationRef.doc();
    await userMessageRef.set({
        role: 'user',
        content: question,
        timestamp: firestore.FieldValue.serverTimestamp(),
    });

    // 2. Fetch the last 4 messages for context
    let conversationHistory: ChatMessage[] = [];
    try {
      const snapshot = await conversationRef.orderBy('timestamp', 'desc').limit(4).get();
      if (!snapshot.empty) {
        // We add the new user question to the history for the AI prompt
        conversationHistory = [
            { role: 'user', content: question },
            ...snapshot.docs.map(doc => doc.data() as ChatMessage)
        ].reverse();
      } else {
        conversationHistory = [{ role: 'user', content: question }];
      }
    } catch (error) {
      console.error("Error fetching conversation history from Firestore:", error);
      // Proceed with just the current question if history fails
      conversationHistory = [{ role: 'user', content: question }];
    }

    // 3. Generate the AI response
    const { output } = await prompt({
      question,
      resume,
      jobDescription,
      conversationHistory
    });

    if (!output || !output.answer) {
      throw new Error('Failed to generate an answer from the AI model.');
    }

    // 4. Save the AI's answer to Firestore
    const modelMessageRef = conversationRef.doc();
    await modelMessageRef.set({
        role: 'model',
        content: output.answer,
        timestamp: firestore.FieldValue.serverTimestamp(),
    });
  }
);
