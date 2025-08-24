
'use server';
/**
 * @fileOverview A flow for extracting text from various file types (PDF, DOCX, TXT).
 *
 * - extractTextFromFile - A function that takes a file's data URI and MIME type, and returns the extracted text.
 * - ExtractTextFromFileInput - The input type for the extractTextFromFile function.
 * - ExtractTextFromFileOutput - The return type for the extractTextFromFile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import mammoth from 'mammoth';
// Note: pdf-parse is imported dynamically below to avoid server startup issues.

const ExtractTextFromFileInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "The file content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  mimeType: z.string().describe('The MIME type of the file (e.g., "application/pdf", "text/plain").'),
});
export type ExtractTextFromFileInput = z.infer<typeof ExtractTextFromFileInputSchema>;

export type ExtractTextFromFileOutput = string;

export async function extractTextFromFile(input: ExtractTextFromFileInput): Promise<ExtractTextFromFileOutput> {
  return extractTextFromFileFlow(input);
}

const extractTextFromFileFlow = ai.defineFlow(
  {
    name: 'extractTextFromFileFlow',
    inputSchema: ExtractTextFromFileInputSchema,
    outputSchema: z.string(),
  },
  async ({ fileDataUri, mimeType }) => {
    try {
      const base64Data = fileDataUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URI format.');
      }
      const buffer = Buffer.from(base64Data, 'base64');

      if (mimeType === 'application/pdf') {
        // Dynamically import pdf-parse to fix Next.js server error
        const pdf = (await import('pdf-parse')).default;
        const data = await pdf(buffer);
        return data.text;
      } else if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
      } else if (mimeType.startsWith('text/')) {
        return buffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error parsing file with MIME type ${mimeType}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file parsing.';
      // Re-throw the specific error to be displayed on the client.
      throw new Error(errorMessage);
    }
  }
);
