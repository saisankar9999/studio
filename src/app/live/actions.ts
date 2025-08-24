'use server';

import {
  analyzeCodeQuality,
  type AnalyzeCodeQualityOutput,
} from '@/ai/flows/analyze-code-quality';
import {
  answerQuestion,
  type AnswerQuestionInput,
  type AnswerQuestionOutput,
} from '@/ai/flows/answer-question';
import {
  analyzeScreen,
  type AnalyzeScreenInput,
  type AnalyzeScreenOutput,
} from '@/ai/flows/analyze-screen';

interface CodeActionResult {
  analysis: AnalyzeCodeQualityOutput | null;
  error: string | null;
}

export async function analyzeCodeAction(input: {
  code: string;
  language: string;
}): Promise<CodeActionResult> {
  try {
    const analysis = await analyzeCodeQuality({
      code: input.code,
      language: input.language,
    });
    return { analysis, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { analysis: null, error };
  }
}

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

interface AnalyzeScreenResult {
  analysis: AnalyzeScreenOutput | null;
  error: string | null;
}

export async function analyzeScreenAction(
  input: AnalyzeScreenInput
): Promise<AnalyzeScreenResult> {
  try {
    const analysis = await analyzeScreen(input);
    return { analysis, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { analysis: null, error };
  }
}
