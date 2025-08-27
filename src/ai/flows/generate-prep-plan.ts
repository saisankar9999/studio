'use server';

/**
 * @fileOverview Generates a personalized interview prep plan based on a resume and job description.
 *
 * - generatePrepPlan - A function that generates the prep plan.
 * - GeneratePrepPlanInput - The input type for the generatePrepPlan function.
 * - GeneratePrepPlanOutput - The return type for the generatePrepPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePrepPlanInputSchema = z.object({
  resume: z.string().describe("The candidate's resume."),
  jobDescription: z.string().describe('The job description for the position.'),
});
export type GeneratePrepPlanInput = z.infer<typeof GeneratePrepPlanInputSchema>;

const GeneratePrepPlanOutputSchema = z.object({
  plan: z.string().describe('A detailed, well-structured interview prep plan in Markdown format.'),
});
export type GeneratePrepPlanOutput = z.infer<typeof GeneratePrepPlanOutputSchema>;

export async function generatePrepPlan(
  input: GeneratePrepPlanInput
): Promise<GeneratePrepPlanOutput> {
  return generatePrepPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePrepPlanPrompt',
  input: { schema: GeneratePrepPlanInputSchema },
  output: { schema: GeneratePrepPlanOutputSchema },
  prompt: `You are an expert career coach creating a "fast track" interview prep plan. Analyze the resume and job description to create a personalized study guide.

Resume:
{{{resume}}}

Job Description:
{{{jobDescription}}}

Create a detailed prep plan in Markdown format that includes:
1.  **Key Skill Alignment**: A section analyzing how the candidate's experience aligns with the job's key requirements.
2.  **Technical Deep Dive**: A list of the most critical technologies, algorithms, and concepts the candidate MUST review. For each, explain why it's important for this role.
3.  **Behavioral Question Prep**: A section on potential behavioral questions based on the company values (if discernible) and the role's responsibilities. Provide example situations from the resume that could be used for answers.
4.  **Actionable Study Roadmap**: A suggested week-long study plan to cover the identified topics.

The output should be a single Markdown string for the 'plan' field.`,
});

const generatePrepPlanFlow = ai.defineFlow(
  {
    name: 'generatePrepPlanFlow',
    inputSchema: GeneratePrepPlanInputSchema,
    outputSchema: GeneratePrepPlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
