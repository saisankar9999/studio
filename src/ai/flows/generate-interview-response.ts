
'use server';

/**
 * @fileOverview A flow for generating a tailored interview response that uses Firestore for conversation history.
 *
 * - generateInterviewResponse - Generates an answer to the user's question, contextualized by resume, JD, and chat history.
 * - GenerateInterviewResponseInput - The input type for the function.
 * - GenerateInterviewResponseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { configureFirebase } from '@/lib/firebase/firebase-admin';

const GenerateInterviewResponseInputSchema = z.object({
  question: z.string().describe("The user's question to the AI mentor."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
  profileId: z.string().describe('The unique identifier for the user profile and conversation session.'),
});
export type GenerateInterviewResponseInput = z.infer<typeof GenerateInterviewResponseInputSchema>;

const GenerateInterviewResponseOutputSchema = z.object({
  answer: z
    .string()
    .describe(
      'A helpful, direct answer from the perspective of an AI career coach.'
    ),
});
export type GenerateInterviewResponseOutput = z.infer<typeof GenerateInterviewResponseOutputSchema>;

export async function generateInterviewResponse(
  input: GenerateInterviewResponseInput
): Promise<GenerateInterviewResponseOutput> {
  return generateInterviewResponseFlow(input);
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
  output: { schema: GenerateInterviewResponseOutputSchema },
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
    outputSchema: GenerateInterviewResponseOutputSchema,
  },
  async ({ question, resume, jobDescription, profileId }) => {
    const { db, firestore } = configureFirebase();

    let conversationHistory: ChatMessage[] = [];
    if (db) {
      try {
        const conversationRef = db.collection('prepConversations').doc(profileId).collection('messages');
        const snapshot = await conversationRef.orderBy('timestamp', 'desc').limit(4).get();
        if (!snapshot.empty) {
          conversationHistory = snapshot.docs.map(doc => doc.data() as ChatMessage).reverse();
        }
      } catch (error) {
        console.error("Error fetching conversation history from Firestore:", error);
        // Proceed without history if Firestore fetch fails
      }
    }

    const { output } = await prompt({
      question,
      resume,
      jobDescription,
      conversationHistory
    });

    if (!output) {
      throw new Error('Failed to generate an answer.');
    }

    // Save the new question and answer to Firestore
    if (db) {
       try {
        const conversationRef = db.collection('prepConversations').doc(profileId).collection('messages');
        const userMessageRef = conversationRef.doc();
        const modelMessageRef = conversationRef.doc();

        const batch = db.batch();
        batch.set(userMessageRef, {
            role: 'user',
            content: question,
            timestamp: firestore.FieldValue.serverTimestamp(),
        });
        batch.set(modelMessageRef, {
            role: 'model',
            content: output.answer,
            timestamp: firestore.FieldValue.serverTimestamp(),
        });
        await batch.commit();

       } catch (error) {
           console.error("Error saving conversation to Firestore:", error);
           // Do not throw error to user, just log it. The primary function is to return an answer.
       }
    }
    
    return {
      answer: output.answer,
    };
  }
);
