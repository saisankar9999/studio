
'use server';

interface ActionResult {
  text: string | null;
  error: string | null;
}

export async function extractTextFromFileAction(input: {
  fileDataUri: string;
  mimeType: string;
}): Promise<ActionResult> {
  try {
    // We are now calling a dedicated API route instead of a Genkit flow.
    // This is to isolate the pdf-parse dependency which causes issues with the Next.js server build.
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extract-text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        cache: 'no-store', // Ensure fresh execution
    });
    
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Failed to extract text from file.');
    }

    return { text: result.text, error: null };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { text: null, error };
  }
}
