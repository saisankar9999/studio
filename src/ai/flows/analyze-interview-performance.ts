'use server';

/**
 * @fileOverview A flow for analyzing interview performance and providing a score.
 *
 * - analyzeInterviewPerformance - A function that analyzes the interview performance.
 * - AnalyzeInterviewPerformanceInput - The input type for the analyzeInterviewPerformance function.
 * - AnalyzeInterviewPerformanceOutput - The return type for the analyzeInterviewPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeInterviewPerformanceInputSchema = z.object({
  question: z.string().describe('The interview question asked.'),
  answer: z.string().describe("The candidate's answer to the question."),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
});
export type AnalyzeInterviewPerformanceInput = z.infer<
  typeof AnalyzeInterviewPerformanceInputSchema
>;

const AnalyzeInterviewPerformanceOutputSchema = z.object({
  score: z
    .number()
    .describe(
      "A score between 0 and 100 representing the candidate's performance."
    ),
  feedback: z
    .string()
    .describe(
      "Feedback on the candidate's answer, including confidence and relevance, personalized according to the resume."
    ),
});
export type AnalyzeInterviewPerformanceOutput = z.infer<
  typeof AnalyzeInterviewPerformanceOutputSchema
>;

export async function analyzeInterviewPerformance(
  input: AnalyzeInterviewPerformanceInput
): Promise<AnalyzeInterviewPerformanceOutput> {
  return analyzeInterviewPerformanceFlow(input);
}

const analyzeInterviewPerformancePrompt = ai.definePrompt({
  name: 'analyzeInterviewPerformancePrompt',
  input: {schema: AnalyzeInterviewPerformanceInputSchema},
  output: {schema: AnalyzeInterviewPerformanceOutputSchema},
  prompt: `You are an expert interview performance analyst. Your task is to evaluate a candidate's answer to an interview question and provide a score and feedback.

Consider the following information about the candidate:
Resume: {{{resume}}}
Job Description: {{{jobDescription}}}

Evaluate the candidate's answer to the following question:
Question: {{{question}}}
Candidate's Answer: {{{answer}}}

Provide a score between 0 and 100, where 0 is a very poor answer and 100 is an excellent answer. Base the score on the confidence level and relevance of the answer to the question, personalized according to the resume and job description.

In your feedback, provide specific suggestions for improvement, focusing on how the candidate can demonstrate more confidence and better align their answer with their resume and the requirements of the job.

Output: {{output}}`,
});

const analyzeInterviewPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeInterviewPerformanceFlow',
    inputSchema: AnalyzeInterviewPerformanceInputSchema,
    outputSchema: AnalyzeInterviewPerformanceOutputSchema,
  },
  async input => {
    const {output} = await analyzeInterviewPerformancePrompt(input);
    return output!;
  }
);
