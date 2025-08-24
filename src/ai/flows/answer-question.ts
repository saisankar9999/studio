'use server';

/**
 * @fileOverview A flow for transcribing an interviewer's question and generating an answer.
 *
 * - answerQuestion - Transcribes audio, summarizes the question, and generates an answer.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { transcribeAudio } from './transcribe-audio';

const AnswerQuestionInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A recorded audio of the interviewer's question, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  resume: z.string().describe("The candidate's resume text content."),
  jobDescription: z.string().describe('The job description for the role.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  summarizedQuestion: z
    .string()
    .describe('A summarized version of the transcribed question.'),
  answer: z
    .string()
    .describe(
      'A tailored answer to the question based on the resume and job description. Use markdown for formatting, like bullet points.'
    ),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;

export async function answerQuestion(
  input: AnswerQuestionInput
): Promise<AnswerQuestionOutput> {
  return answerQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerQuestionPrompt',
  input: {
    schema: z.object({
      question: z.string(),
      resume: z.string(),
      jobDescription: z.string(),
    }),
  },
  output: { schema: AnswerQuestionOutputSchema },
  prompt: `You are an expert career coach. Your task is to help a candidate answer an interview question in real-time.

First, summarize the provided interview question.

Then, generate a concise and confident answer tailored to the candidate's resume and the job description. The answer should be structured clearly, using markdown bullet points for key talking points, and highlight the candidate's relevant skills and experiences.

Resume:
{{{resume}}}

Job Description:
{{{jobDescription}}}

Interview Question:
{{{question}}}
`,
});

const answerQuestionFlow = ai.defineFlow(
  {
    name: 'answerQuestionFlow',
    inputSchema: AnswerQuestionInputSchema,
    outputSchema: AnswerQuestionOutputSchema,
  },
  async ({ audioDataUri, resume, jobDescription }) => {
    // 1. Transcribe the audio to get the question text
    const {text: transcribedQuestion} = await transcribeAudio({ audioDataUri });

    if (!transcribedQuestion) {
      throw new Error('Failed to transcribe audio.');
    }

    // 2. Generate the answer based on the transcribed text
    const { output } = await prompt({
      question: transcribedQuestion,
      resume,
      jobDescription,
    });

    return output!;
  }
);
