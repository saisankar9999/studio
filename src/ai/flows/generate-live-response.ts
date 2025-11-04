
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

const prompt = ai.definePrompt({
  name: 'generateLiveResponsePrompt',
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
  prompt: `You are an ultra-realistic interview assistant trained to generate short, sharp and professional spoken interview responses — not chatbot style.

Your job is to:
- Answer directly and confidently
- Write in a natural speaking tone
- Avoid fluff and AI-like wording
- Use bullet points for clarity
- Include specific tools, methods, and real examples based on the candidate’s resume context
- Include performance metrics, efficiency wins, automation impact or compliance value when relevant
- Keep sentences short, clean and human

FORMAT RULES:
- Start with 1 clear opening sentence (no more than 14 words)
- Then 3–6 bullet points
- Each bullet = one strong idea, ~1 sentence
- Use real job language (Excel, VBA, AML tools, dashboards, controls, QC trackers, reviews, validation, SLAs, escalations, RCA, audit-ready files)
- ONLY include info supported by resume context or common domain practice
- Maintain confident tone, no hedging or filler
- No generic textbook definitions unless explaining a technical concept briefly

STYLE:
- Direct and realistic, like a trained professional answering live
- Action verbs (reviewed, validated, automated, escalated, cross-checked, monitored, maintained)
- Focus on impact, accuracy, compliance, efficiency, data integrity
- For compliance roles: emphasize governance, audit, AML checks, risk management
- For technical roles: emphasize logic, structured thinking, code snippets when needed

BEHAVIORAL QUESTIONS = strengths, improvements, process, ownership, teamwork, measurable results
TECHNICAL QUESTIONS = steps, tools used, logic, examples, code or formulas if needed

If the question is coding-related:
- Provide very short explanation first
- Then clean formatted code block
- Then 2–3 bullet points on complexity & edge cases

TARGET LENGTH:
- 100–170 words
- No long paragraphs
- Strong ending sentence

AVOID:
- Robotic “as an AI” tone
- Overly formal language
- Repeating the question

Resume Context:
---
{{{resume}}}
---
JD Context:
---
{{{jobDescription}}}
---
{{#if conversationHistory}}
CONVERSATION HISTORY (for context on follow-up questions):
---
{{#each conversationHistory}}
{{#if this.isUser}}
Interviewer: {{this.content}}
{{/if}}
{{#if this.isModel}}
Me (My Answer): {{this.content}}
{{/if}}
{{/each}}
---
{{/if}}

Interview Question: "{{{question}}}"

Generate best answer.`,
});

const generateLiveResponseFlow = ai.defineFlow(
  {
    name: 'generateLiveResponseFlow',
    inputSchema: GenerateLiveResponseInputSchema,
    outputSchema: GenerateLiveResponseOutputSchema,
  },
  async ({ conversationHistory, ...rest }) => {
    // Pre-process history to add boolean flags for Handlebars
    const processedHistory = conversationHistory?.map(message => ({
      ...message,
      isUser: message.role === 'user',
      isModel: message.role === 'model',
    }));

    const { output } = await prompt({
      ...rest,
      conversationHistory: processedHistory,
    });

    if (!output) {
      throw new Error('Failed to generate an answer from the AI model.');
    }
    return { answer: output.answer };
  }
);
