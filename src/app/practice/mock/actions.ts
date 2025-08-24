'use server';

import {
  analyzeInterviewPerformance,
  type AnalyzeInterviewPerformanceOutput,
} from '@/ai/flows/analyze-interview-performance';

interface ActionResult {
  feedback: AnalyzeInterviewPerformanceOutput | null;
  error: string | null;
}

export async function analyzeAnswerAction(input: {
  question: string;
  answer: string;
  resume: string;
  jobDescription: string;
}): Promise<ActionResult> {
  try {
    const feedback = await analyzeInterviewPerformance({
      question: input.question,
      answer: input.answer,
      resume: input.resume,
      jobDescription: input.jobDescription,
    });
    return { feedback, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { feedback: null, error };
  }
}
