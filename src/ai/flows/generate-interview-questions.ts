'use server';

/**
 * @fileOverview Generates interview questions based on a resume and job description.
 *
 * - generateInterviewQuestions - A function that generates interview questions.
 * - GenerateInterviewQuestionsInput - The input type for the generateInterviewQuestions function.
 * - GenerateInterviewQuestionsOutput - The return type for the generateInterviewQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  resume: z
    .string()
    .describe('The resume of the candidate.'),
  jobDescription: z.string().describe('The job description for the position.'),
});
export type GenerateInterviewQuestionsInput = z.infer<
  typeof GenerateInterviewQuestionsInputSchema
>;

const InterviewQuestionSchema = z.object({
  question: z.string().describe('The interview question.'),
  suggestedAnswer: z.string().describe('A suggested answer to the question.'),
});

const GenerateInterviewQuestionsOutputSchema = z.array(
  InterviewQuestionSchema
);
export type GenerateInterviewQuestionsOutput = z.infer<
  typeof GenerateInterviewQuestionsOutputSchema
>;

export async function generateInterviewQuestions(
  input: GenerateInterviewQuestionsInput
): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are an expert career coach specializing in interview preparation.

You will generate 20 possible questions that might be asked in an interview based on the candidate's resume and the job description provided. For each question, provide a suggested answer that is tailored to the candidate's resume and experience; the answers should not be generic. The questions and answers should be aimed at determining if the candidate is a good fit for the role.

Resume: {{{resume}}}
Job Description: {{{jobDescription}}}

Format your output as a JSON array of objects, where each object has a 'question' and a 'suggestedAnswer' key.
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
