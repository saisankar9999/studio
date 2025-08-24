'use server';

import {
  generateInterviewQuestions,
  type GenerateInterviewQuestionsOutput,
} from '@/ai/flows/generate-interview-questions';

interface FormState {
  questions: GenerateInterviewQuestionsOutput | null;
  error: string | null;
}

export async function generateQuestionsAction(input: {
  resume: string;
  jobDescription: string;
}): Promise<FormState> {
  try {
    const questions = await generateInterviewQuestions({
      resume: input.resume,
      jobDescription: input.jobDescription,
    });
    return { questions, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { questions: null, error };
  }
}
