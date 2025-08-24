'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Briefcase,
  Sparkles,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

export default function PracticePage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [resumeContent, setResumeContent] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [generatedQuestions, setGeneratedQuestions] =
    useState<GenerateInterviewQuestionsOutput | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const profileId = searchParams.get('profile');
    if (profileId) {
      try {
        const savedProfiles = localStorage.getItem('interviewProfiles');
        if (savedProfiles) {
          const profiles: Profile[] = JSON.parse(savedProfiles);
          const profile = profiles.find(p => p.id === profileId);
          if (profile) {
            setResumeContent(profile.resume);
            setJobDescription(profile.jobDescription);
            toast({
              title: `Profile "${profile.name}" Loaded`,
              description: "You can now generate questions.",
            });
          }
        }
      } catch (error) {
        toast({
          title: 'Error loading profile',
          variant: 'destructive',
        });
      }
    }
  }, [searchParams, toast]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('application/pdf') || file.type.startsWith('text/plain')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setResumeContent(text);
          setResumeFileName(file.name);
        };
        reader.readAsText(file);
      } else {
        toast({
            title: 'Unsupported File Type',
            description: 'Please upload a .txt or .pdf file.',
            variant: 'destructive'
        })
      }
    }
  };

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
    <div className="container mx-auto max-w-5xl p-4 py-8">
      <h1 className="mb-2 font-headline text-4xl font-bold">
        Practice Interview
      </h1>
      <p className="mb-8 text-muted-foreground">
        Prepare for your interview by generating questions tailored to your
        profile.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span>Your Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="resume">Upload Resume</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.pdf"
              />
               <Textarea
                id="resume-content"
                placeholder="Paste your resume here, or upload a file..."
                className="min-h-[150px] resize-y"
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
              />
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {resumeFileName || 'Or upload a .txt or .pdf file'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the job description here..."
                className="min-h-[150px] resize-y"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGenerateClick}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Questions
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-accent" />
              <span>Generated Questions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {isPending && (
              <div className="flex flex-1 flex-col items-center justify-center space-y-4">
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
                <ScrollArea className="flex-1">
                  <Accordion type="single" collapsible className="w-full">
                    {generatedQuestions.map((q, index) => (
                      <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger>
                          {`Q${index + 1}: ${q.question}`}
                        </AccordionTrigger>
                        <AccordionContent className="prose prose-sm max-w-none text-muted-foreground">
                          <strong>Suggested Answer:</strong> {q.suggestedAnswer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
                <Button
                  onClick={startMockInterview}
                  className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
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
