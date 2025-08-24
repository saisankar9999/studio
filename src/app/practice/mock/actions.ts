'use server';

import {
  analyzeInterviewPerformance,
  type AnalyzeInterviewPerformanceOutput,
} from '@/ai/flows/analyze-interview-performance';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';

interface ActionResult {
  feedback: AnalyzeInterviewPerformanceOutput | null;
  transcribedText: string | null;
  error: string | null;
}

export async function transcribeAndAnalyzeAnswerAction(input: {
  question: string;
  audioDataUri: string;
  resume: string;
  jobDescription: string;
}): Promise<ActionResult> {
  try {
    // 1. Transcribe the audio
    const { text: transcribedAnswer } = await transcribeAudio({
      audioDataUri: input.audioDataUri,
    });

    if (!transcribedAnswer) {
      return {
        feedback: null,
        transcribedText: null,
        error: 'Could not transcribe audio. Please try again.',
      };
    }

    // 2. Analyze the transcribed answer
    const feedback = await analyzeInterviewPerformance({
      question: input.question,
      answer: transcribedAnswer,
      resume: input.resume,
      jobDescription: input.jobDescription,
    });
    return { feedback, transcribedText: transcribedAnswer, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { feedback: null, transcribedText: null, error };
  }
}
