
'use server';

import {
  answerQuestion,
  type AnswerQuestionInput,
  type AnswerQuestionOutput,
} from '@/ai/flows/answer-question';

interface AnswerQuestionResult {
  answer: AnswerQuestionOutput | null;
  error: string | null;
}

export async function answerQuestionAction(
  input: AnswerQuestionInput
): Promise<AnswerQuestionResult> {
  try {
    const answer = await answerQuestion(input);
    return { answer, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { answer: null, error };
  }
}

    