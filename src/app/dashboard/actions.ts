
'use server';

interface ActionResult {
  text: string | null;
  error: string | null;
}

export async function extractTextFromFileAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extract-text`, {
        method: 'POST',
        body: formData,
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

    