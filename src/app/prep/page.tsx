'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { FileText, Sparkles, Bot, User, Send } from 'lucide-react';
import { generatePrepPlan } from '@/ai/flows/generate-prep-plan';
import { generateInterviewResponse } from '@/ai/flows/generate-interview-response';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { marked } from 'marked';

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export default function PrepRoomPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isGeneratingPlan, startPlanTransition] = useTransition();
  const [isAnswering, startAnswerTransition] = useTransition();

  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [prepPlan, setPrepPlan] = useState('');
  
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('profile');
    if (id) {
      setProfileId(id);
      try {
        const savedProfiles = localStorage.getItem('interviewProfiles');
        if (savedProfiles) {
          const profiles: Profile[] = JSON.parse(savedProfiles);
          const profile = profiles.find(p => p.id === id);
          if (profile) {
            setResume(profile.resume);
            setJobDescription(profile.jobDescription);
            toast({
              title: `Profile "${profile.name}" Loaded`,
              description: "You can now generate a prep plan.",
            });
          }
        }
      } catch (error) {
        toast({ title: 'Error loading profile', variant: 'destructive' });
      }
    }
  }, [searchParams, toast]);

  useEffect(() => {
    // Scroll to bottom of chat
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);
  
  const handleGeneratePlan = () => {
    if (!resume || !jobDescription) {
      toast({ title: 'Missing Details', description: 'Please provide both a resume and job description.', variant: 'destructive' });
      return;
    }
    startPlanTransition(async () => {
      try {
        const result = await generatePrepPlan({ resume, jobDescription });
        const htmlPlan = await marked(result.plan);
        setPrepPlan(htmlPlan);
        toast({ title: 'Success!', description: 'Your personalized prep plan is ready.' });
      } catch (error) {
         toast({ title: 'Error', description: 'Failed to generate a prep plan.', variant: 'destructive' });
      }
    });
  };

  const handleAskQuestion = () => {
    if (!userQuestion.trim()) return;

    const newConversation: ChatMessage[] = [...conversation, { role: 'user', content: userQuestion }];
    setConversation(newConversation);
    const question = userQuestion;
    setUserQuestion('');

    startAnswerTransition(async () => {
      try {
        const result = await generateInterviewResponse({
          question,
          resume,
          jobDescription,
          conversationHistory: newConversation.slice(-4) // Send last 4 messages for context
        });
        
        const htmlAnswer = await marked(result.answer);
        setConversation(prev => [...prev, { role: 'model', content: htmlAnswer }]);

      } catch (error) {
        toast({ title: 'Error', description: 'The AI mentor could not respond. Please try again.', variant: 'destructive' });
        // Restore conversation on error by removing the user's last message
        setConversation(prev => prev.slice(0, -1));
      }
    });
  };

  return (
    <div className="container mx-auto max-w-7xl p-4 py-8">
      <h1 className="mb-2 font-headline text-4xl font-bold">Prep Room</h1>
      <p className="mb-8 text-muted-foreground">Your personal AI-powered interview mentor.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Inputs and Prep Plan */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <span>Your Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="resume">Your Resume</Label>
                <Textarea id="resume" placeholder="Paste your resume here..." className="min-h-[150px]" value={resume} onChange={(e) => setResume(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-description">Job Description</Label>
                <Textarea id="job-description" placeholder="Paste the job description here..." className="min-h-[150px]" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
              </div>
              <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan} className="w-full">
                {isGeneratingPlan ? <LoadingSpinner /> : <Sparkles />}
                Generate Prep Plan
              </Button>
            </CardContent>
          </Card>

          {isGeneratingPlan && (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center min-h-[200px]">
              <LoadingSpinner className="h-8 w-8 text-primary" />
              <p className="text-muted-foreground">Our AI is crafting your personalized plan...</p>
            </div>
          )}

          {prepPlan && (
             <Card>
              <CardHeader>
                <CardTitle>Your Fast-Track Prep Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: prepPlan }}
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Chat Mentor */}
        <Card className="sticky top-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-accent" />
              <span>AI Mentor</span>
            </CardTitle>
            <CardDescription>Ask questions, clarify doubts, and practice concepts.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col h-[600px]">
            <ScrollArea className="flex-1 pr-4" ref={chatContainerRef}>
              <div className="space-y-4">
                {conversation.length === 0 && (
                  <div className="text-center text-muted-foreground p-8">
                    Start by asking a question below.
                  </div>
                )}
                {conversation.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && <Bot className="h-6 w-6 flex-shrink-0 text-accent" />}
                    <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                      <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: msg.content }}></div>
                    </div>
                     {msg.role === 'user' && <User className="h-6 w-6 flex-shrink-0 text-primary" />}
                  </div>
                ))}
                {isAnswering && (
                   <div className="flex items-start gap-3">
                      <Bot className="h-6 w-6 flex-shrink-0 text-accent" />
                      <div className="rounded-lg p-3 bg-muted"><LoadingSpinner/></div>
                   </div>
                )}
              </div>
            </ScrollArea>
            <Separator className="my-4" />
            <div className="flex items-center gap-2">
              <Input
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
                placeholder="Ask your mentor anything..."
                disabled={isAnswering}
              />
              <Button onClick={handleAskQuestion} disabled={isAnswering}>
                <Send />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
