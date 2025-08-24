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
  resume: z.string().optional().describe("The candidate's resume text content."),
  jobDescription: z.string().optional().describe('The job description for the role.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  transcribedQuestion: z.string().describe('The transcribed question from the audio.'),
  answer: z
    .string()
    .describe(
      'A tailored answer to the question based on the resume and job description.'
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
      resume: z.string().optional(),
      jobDescription: z.string().optional(),
    }),
  },
  output: { schema: z.object({ answer: z.string() }) },
  prompt: `You are an expert career coach acting as an applicant in a high-stakes job interview. 
Your goal is to answer the interviewer's questions as if you were the applicant. Your responses must be conversational, natural, and in the first person ("I," "my," "we").

Generate a clear, precise, and complete answer to the question. Structure your response logically with a brief introduction, detailed points, and a concise conclusion. The answer should be detailed and professional.

{{#if resume}}
CONTEXT:
Here is my resume:
{{{resume}}}
{{/if}}

{{#if jobDescription}}
The job I am interviewing for is described as:
{{{jobDescription}}}
{{/if}}

THE INTERVIEW:
The interviewer just asked:
"{{{question}}}"
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
      throw new Error('Failed to transcribe audio or audio was empty.');
    }

    // 2. Generate the answer based on the transcribed text
    const { output } = await prompt({
      question: transcribedQuestion,
      resume,
      jobDescription,
    });

    return {
        transcribedQuestion: transcribedQuestion,
        answer: output!.answer,
    };
  }
);
