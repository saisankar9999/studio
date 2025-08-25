
import { NextRequest, NextResponse } from 'next/server';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jdText } = await request.json();

    if (!resumeText || !jdText) {
      return NextResponse.json({ error: 'Resume and job description text are required' }, { status: 400 });
    }

    // Call the correct Genkit flow
    const questions = await generateInterviewQuestions({
        resume: resumeText,
        jobDescription: jdText,
    });

    // Format the structured questions into a markdown analysis string that the UI expects
    const analysis = `
### Key Discussion Topics & Potential Questions

Here are some tailored questions based on your resume and the job description, along with suggested talking points.

---
${questions.map((q, i) => `
**${i + 1}. ${q.question}**
*Suggested Answer:*
${q.suggestedAnswer}
---
`).join('\n')}
    `;

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to analyze documents: ${errorMessage}` }, { status: 500 });
  }
}
