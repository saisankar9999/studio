'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing code quality during a live coding interview.
 *
 * - analyzeCodeQuality - A function that takes code as input and returns an analysis of its quality, efficiency, and correctness.
 * - AnalyzeCodeQualityInput - The input type for the analyzeCodeQuality function.
 * - AnalyzeCodeQualityOutput - The return type for the analyzeCodeQuality function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCodeQualityInputSchema = z.object({
  code: z.string().describe('The code to be analyzed.'),
  language: z.string().describe('The programming language of the code.'),
});
export type AnalyzeCodeQualityInput = z.infer<typeof AnalyzeCodeQualityInputSchema>;

const AnalyzeCodeQualityOutputSchema = z.object({
  qualityScore: z.number().describe('A score representing the overall code quality (0-100).'),
  efficiencySuggestions: z.string().describe('Suggestions for improving code efficiency.'),
  correctnessAnalysis: z.string().describe('Analysis of the code for correctness, including potential errors.'),
  bestPractices: z.string().describe('Recommendations for adhering to best practices.'),
});
export type AnalyzeCodeQualityOutput = z.infer<typeof AnalyzeCodeQualityOutputSchema>;

export async function analyzeCodeQuality(input: AnalyzeCodeQualityInput): Promise<AnalyzeCodeQualityOutput> {
  return analyzeCodeQualityFlow(input);
}

const analyzeCodeQualityTool = ai.defineTool({
  name: 'analyzeCode',
  description: 'Analyzes code for quality, efficiency, and correctness, providing a score and suggestions for improvement.',
  inputSchema: AnalyzeCodeQualityInputSchema,
  outputSchema: AnalyzeCodeQualityOutputSchema,
},
async (input) => {
  // Placeholder implementation for code analysis.
  // In a real application, this would involve static analysis tools,
  // linters, and potentially execution within a sandbox.
  // For now, return some dummy data.
  return {
    qualityScore: 75,
    efficiencySuggestions: 'Consider using more efficient algorithms for large datasets.',
    correctnessAnalysis: 'No immediate errors detected, but further testing is recommended.',
    bestPractices: 'Follow language-specific coding style guidelines.',
  };
});

const analyzeCodeQualityPrompt = ai.definePrompt({
  name: 'analyzeCodeQualityPrompt',
  input: {schema: AnalyzeCodeQualityInputSchema},
  output: {schema: AnalyzeCodeQualityOutputSchema},
  tools: [analyzeCodeQualityTool],
  prompt: `You are an expert software engineer reviewing code submitted during a live interview.
Analyze the following code for quality, efficiency, and correctness. Provide a quality score (0-100), suggestions for improvement, and an analysis of potential errors.

Code:
\`\`\`{{{language}}}
{{{code}}}
\`\`\`

Use the analyzeCode tool to perform the analysis.
`,
});

const analyzeCodeQualityFlow = ai.defineFlow(
  {
    name: 'analyzeCodeQualityFlow',
    inputSchema: AnalyzeCodeQualityInputSchema,
    outputSchema: AnalyzeCodeQualityOutputSchema,
  },
  async input => {
    const {output} = await analyzeCodeQualityPrompt(input);
    return output!;
  }
);
