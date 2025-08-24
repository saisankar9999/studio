'use server';

/**
 * @fileOverview A flow for analyzing a screenshot of an interview screen.
 *
 * - analyzeScreen - A function that analyzes a screenshot for questions or code.
 * - AnalyzeScreenInput - The input type for the analyzeScreen function.
 * - AnalyzeScreenOutput - The return type for the analyzeScreen function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeScreenInputSchema = z.object({
  screenshotDataUri: z
    .string()
    .describe(
      "A screenshot of the interview screen, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeScreenInput = z.infer<typeof AnalyzeScreenInputSchema>;

const AnalyzeScreenOutputSchema = z.object({
  analysis: z.string().describe('An analysis of the content on the screen (e.g., what a piece of code does, or the key point of a question).'),
  suggestion: z.string().describe('A specific suggestion, such as how to answer a question, how to improve the code, or what to do next.'),
});
export type AnalyzeScreenOutput = z.infer<typeof AnalyzeScreenOutputSchema>;

export async function analyzeScreen(
  input: AnalyzeScreenInput
): Promise<AnalyzeScreenOutput> {
  return analyzeScreenFlow(input);
}

const analyzeScreenPrompt = ai.definePrompt({
  name: 'analyzeScreenPrompt',
  input: { schema: AnalyzeScreenInputSchema },
  output: { schema: AnalyzeScreenOutputSchema },
  prompt: `You are an AI co-pilot for a software engineer in a live interview.
Your task is to analyze the provided screenshot and offer helpful, concise advice.

The screenshot could contain:
- A coding problem.
- A technical question on a slide.
- A system design diagram.
- A conversation in a chat window.

Based on the image, provide:
1.  A brief 'analysis' of what you see (e.g., "This is a Python function to find prime numbers," or "The question asks about the trade-offs of microservices.").
2.  A 'suggestion' for the candidate (e.g., "Consider edge cases like negative numbers or zero," or "Mention scalability and fault tolerance in your answer.").

Be discreet and to the point.

Screenshot:
{{media url=screenshotDataUri}}`,
});

const analyzeScreenFlow = ai.defineFlow(
  {
    name: 'analyzeScreenFlow',
    inputSchema: AnalyzeScreenInputSchema,
    outputSchema: AnalyzeScreenOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeScreenPrompt(input);
    return output!;
  }
);

    