
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    let text = '';

    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      text = data.text;
    } else if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      text = value;
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 });
    }

    if (!text) {
        return NextResponse.json({ error: 'Could not extract text from the document. The file might be empty, corrupted, or password-protected.' }, { status: 400 });
    }

    return NextResponse.json({ text });

  } catch (error) {
    console.error('Error parsing file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file parsing.';
    return NextResponse.json({ error: `Failed to parse file: ${errorMessage}` }, { status: 500 });
  }
}

    