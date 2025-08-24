
'use server';

import {
  extractTextFromFile,
  type ExtractTextFromFileOutput,
} from '@/ai/flows/extract-text-from-file';

interface ActionResult {
  text: ExtractTextFromFileOutput | null;
  error: string | null;
}

export async function extractTextFromFileAction(input: {
  fileDataUri: string;
  mimeType: string;
}): Promise<ActionResult> {
  try {
    const text = await extractTextFromFile(input);
    return { text, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { text: null, error };
  }
}

    