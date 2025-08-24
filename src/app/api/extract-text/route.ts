import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    const { fileDataUri, mimeType } = await req.json();

    if (!fileDataUri || !mimeType) {
      return NextResponse.json({ error: 'Missing file data or mime type.' }, { status: 400 });
    }

    const base64Data = fileDataUri.split(',')[1];
    if (!base64Data) {
      return NextResponse.json({ error: 'Invalid data URI format.' }, { status: 400 });
    }
    const buffer = Buffer.from(base64Data, 'base64');

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
    } else if (mimeType.startsWith('text/')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 });
    }

    return NextResponse.json({ text });

  } catch (error) {
    console.error(`Error parsing file with MIME type:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file parsing.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
