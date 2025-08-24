'use server';

import {
  analyzeCodeQuality,
  type AnalyzeCodeQualityOutput,
} from '@/ai/flows/analyze-code-quality';

interface ActionResult {
  analysis: AnalyzeCodeQualityOutput | null;
  error: string | null;
}

export async function analyzeCodeAction(input: {
  code: string;
  language: string;
}): Promise<ActionResult> {
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
