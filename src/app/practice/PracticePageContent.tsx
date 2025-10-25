'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Briefcase,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { GenerateInterviewQuestionsOutput } from '@/ai/flows/generate-interview-questions';
import { generateQuestionsAction } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from 'next-auth/react';
import { getUserProfiles } from '@/lib/firebase/firestore';

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

export default function PracticePageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [generatedQuestions, setGeneratedQuestions] =
    useState<GenerateInterviewQuestionsOutput | null>(null);

  useEffect(() => {
    const profileId = searchParams.get('profile');
    async function loadProfile() {
      if (profileId && session?.user?.id) {
        try {
          const profiles = await getUserProfiles(session.user.id);
          const profile = profiles.find(p => p.id === profileId);
          if (profile) {
            setResumeContent(profile.resume);
            setJobDescription(profile.jobDescription);
            toast({
              title: `Profile "${profile.name}" Loaded`,
              description: "You can now generate questions.",
            });
          }
        } catch (error) {
          toast({
            title: 'Error loading profile',
            description: "Could not fetch profiles from the database.",
            variant: 'destructive',
          });
        }
      }
    }
    loadProfile();
  }, [searchParams, toast, session]);


  const handleGenerateClick = () => {
    if (!resumeContent) {
      toast({
        title: 'Missing Resume',
        description: 'Please upload or select a profile with a resume.',
        variant: 'destructive',
      });
      return;
    }
    if (!jobDescription) {
      toast({
        title: 'Missing Job Description',
        description:
          'Please paste or select a profile with a job description.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const result = await generateQuestionsAction({
        resume: resumeContent,
        jobDescription: jobDescription,
      });

      if (result.error) {
        toast({
          title: 'Error Generating Questions',
          description: result.error,
          variant: 'destructive',
        });
        setGeneratedQuestions(null);
      } else {
        setGeneratedQuestions(result.questions ?? null);
        toast({
          title: 'Success!',
          description: 'Your tailored interview questions are ready.',
        });
      }
    });
  };

  const startMockInterview = () => {
    if (!generatedQuestions || !resumeContent || !jobDescription) {
      toast({
        title: 'Cannot Start Interview',
        description: 'Please generate questions first.',
        variant: 'destructive',
      });
      return;
    }
    try {
      // We still use local storage here to pass large data between pages
      // to avoid complex URL state.
      localStorage.setItem(
        'interviewData',
        JSON.stringify({
          questions: generatedQuestions,
          resume: resumeContent,
          jobDescription: jobDescription,
        })
      );
      router.push('/practice/mock');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not save interview data to start the mock session.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 py-12 md:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
          Practice Interview
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Generate questions tailored to your profile, then start a mock interview to practice your answers and get AI feedback.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileText className="h-6 w-6 text-primary" />
              <span>Your Details</span>
            </CardTitle>
             <CardDescription>
                Your selected profile is loaded below. You can make temporary adjustments before generating questions.
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="resume">Your Resume</Label>
               <Textarea
                id="resume-content"
                placeholder="Paste your resume here..."
                className="min-h-[200px] resize-y"
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the job description here..."
                className="min-h-[200px] resize-y"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </CardContent>
           <CardFooter>
            <Button
              onClick={handleGenerateClick}
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              {isPending ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Tailored Questions
            </Button>
           </CardFooter>
        </Card>

        <Card className="flex flex-col lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Briefcase className="h-6 w-6 text-accent" />
              <span>Generated Questions</span>
            </CardTitle>
             <CardDescription>
                Review the generated questions. When you're ready, start the mock interview.
             </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-[400px]">
            {isPending && (
              <div className="flex flex-1 flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed">
                <LoadingSpinner className="h-8 w-8 text-primary" />
                <p className="text-muted-foreground">
                  Our AI is crafting your questions...
                </p>
              </div>
            )}
            {!isPending && !generatedQuestions && (
              <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
                <p className="text-muted-foreground">
                  Your generated questions will appear here.
                </p>
              </div>
            )}
            {generatedQuestions && (
              <div className="flex flex-1 flex-col">
                <ScrollArea className="flex-1 pr-4 -mr-4">
                  <Accordion type="single" collapsible className="w-full">
                    {generatedQuestions.map((q, index) => (
                      <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger>
                          {`Q${index + 1}: ${q.question}`}
                        </AccordionTrigger>
                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                          <strong>Suggested Answer:</strong> {q.suggestedAnswer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
                <Button
                  onClick={startMockInterview}
                  className="mt-4 w-full"
                  size="lg"
                  variant="default"
                >
                  Start Mock Interview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
