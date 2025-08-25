
import { NextRequest, NextResponse } from 'next/server';
import { generate } from 'genkit/ai';
import { geminiPro } from 'genkitx/googleai';

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jdText } = await request.json();

    if (!resumeText || !jdText) {
      return NextResponse.json({ error: 'Resume and job description text are required' }, { status: 400 });
    }

    const analysisResponse = await generate({
      model: geminiPro,
      prompt: `You are an expert career coach and technical interviewer. Analyze the following resume and job description to provide a comprehensive interview preparation guide.

Resume:
---
${resumeText}
---

Job Description:
---
${jdText}
---

Provide a detailed analysis that includes:
1.  **Key Skills & Technologies:** List the crucial skills and technologies from the job description.
2.  **Experience Alignment:** Briefly explain how the candidate's experience aligns with these requirements.
3.  **Key Discussion Topics:** Highlight important topics the candidate must be prepared to discuss in detail.
4.  **Potential Questions:** List 3-4 likely technical or behavioral questions.
5.  **Gaps to Address:** Note any potential gaps or areas the candidate should proactively address.

Format the response in clear, well-organized sections with markdown headings and bullet points.`,
      config: {
        temperature: 0.2,
      },
    });

    return NextResponse.json({ analysis: analysisResponse.text() });
  } catch (error) {
    console.error('Error analyzing documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to analyze documents: ${errorMessage}` }, { status: 500 });
  }
}
