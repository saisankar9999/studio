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
  analysis: z.string().describe('A detailed analysis of the content on the screen (e.g., what a piece of code does, its potential issues, or the key point of a question).'),
  suggestion: z.string().describe('A specific, actionable suggestion. For code, this could be a full implementation of an algorithm or a corrected code block. For questions, a structured answer. Use markdown for formatting, like code blocks and bullet points.'),
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
Your task is to analyze the provided screenshot and offer helpful, comprehensive advice.

The screenshot could contain:
- A coding problem.
- A technical question on a slide.
- A system design diagram.

Based on the image, provide:
1.  A detailed 'analysis' of what you see. For a coding problem, explain the intuition, the algorithm, and any edge cases. For a question, break down what the interviewer is looking for.
2.  A detailed 'suggestion'. For a coding problem, provide a complete and correct code implementation. For a question, provide a well-structured, comprehensive answer. Use markdown for formatting (code blocks, bullet points, etc.) to make it easy to read.

Be discreet, but thorough and accurate.

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
