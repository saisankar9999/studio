
'use server';

/**
 * @fileOverview A flow for generating a tailored interview response for the Live Co-pilot.
 *
 * - generateLiveResponse - Generates an answer to a question, contextualized by resume, JD, and conversation history.
 * - GenerateLiveResponseInput - The input type for the function.
 * - GenerateLiveResponseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { classifyQuestion, pickPrompt } from '@/lib/qa/router';


// Define a schema for conversation history messages
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
type ChatMessage = z.infer<typeof ChatMessageSchema>;


const GenerateLiveResponseInputSchema = z.object({
  question: z.string().describe("The interview question that was asked."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
  conversationHistory: z.array(ChatMessageSchema).optional().describe("History of the conversation so far, for context on follow-up questions."),
});
export type GenerateLiveResponseInput = z.infer<typeof GenerateLiveResponseInputSchema>;

const GenerateLiveResponseOutputSchema = z.object({
  answer: z.string().describe("A concise, first-person answer to the interview question."),
});
export type GenerateLiveResponseOutput = z.infer<typeof GenerateLiveResponseOutputSchema>;

export async function generateLiveResponse(
  input: GenerateLiveResponseInput
): Promise<GenerateLiveResponseOutput> {
  return generateLiveResponseFlow(input);
}


const generateLiveResponseFlow = ai.defineFlow(
  {
    name: 'generateLiveResponseFlow',
    inputSchema: GenerateLiveResponseInputSchema,
    outputSchema: GenerateLiveResponseOutputSchema,
  },
  async ({ question, jobDescription, conversationHistory, resume }) => {
    // 1. Classify the question to pick the right prompt.
    const questionType = classifyQuestion(question, jobDescription);
    const promptTemplate = pickPrompt(questionType);

    // 2. Pre-process history to add boolean flags for Handlebars
    const processedHistory = conversationHistory?.map(message => ({
      ...message,
      isUser: message.role === 'user',
      isModel: message.role === 'model',
    }));
    
    // 3. Define and run the dynamic prompt
    const dynamicPrompt = ai.definePrompt({
        name: 'dynamicLiveResponsePrompt',
        prompt: promptTemplate,
        input: {
            schema: z.object({
                question: z.string(),
                resume: z.string(),
                jobDescription: z.string(),
                conversationHistory: z.array(ChatMessageSchema.extend({
                    isUser: z.boolean(),
                    isModel: z.boolean(),
                })).optional(),
            }),
        },
        output: { schema: GenerateLiveResponseOutputSchema },
    });

    const { output } = await dynamicPrompt({
      question,
      resume,
      jobDescription,
      conversationHistory: processedHistory,
    });

    if (!output) {
      throw new Error('Failed to generate an answer from the AI model.');
    }
    return { answer: output.answer };
  }
);
