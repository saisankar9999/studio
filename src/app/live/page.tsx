
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateLiveResponse } from '@/ai/flows/generate-live-response';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Bot, User, Loader2, Video, Power, PowerOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { marked } from 'marked';


interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  start: () => void;
  stop: () => void;
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognition;
    webkitSpeechRecognition: SpeechRecognition;
  }
}

const resumePlaceholder = `John Doe
Software Engineer
newyork@example.com | (123) 456-7890 | linkedin.com/in/johndoe

Summary
Highly skilled Software Engineer with 5+ years of experience in developing, testing, and maintaining web applications. Proficient in JavaScript, React, Node.js, and cloud technologies.

Experience
Senior Software Engineer, TechCorp Inc. - New York, NY (2020-Present)
- Led the development of a new customer-facing dashboard using React and TypeScript, improving user engagement by 25%.
- Architected and implemented a microservices-based backend with Node.js and Express.

Education
Bachelor of Science in Computer Science
State University, 2015`;

const jobDescriptionPlaceholder = `Senior Frontend Engineer
At Innovate LLC, we are looking for a passionate Senior Frontend Engineer to join our team.

Responsibilities
- Develop and maintain user-facing features using React.js.
- Build reusable components and front-end libraries for future use.
- Optimize applications for maximum speed and scalability.

Qualifications
- 5+ years of professional experience in frontend development.
- Strong proficiency in JavaScript, including DOM manipulation and the JavaScript object model.
- Thorough understanding of React.js and its core principles.`;

const DraggableStealthOverlay = ({
  isSessionActive,
  isLoading,
  transcription,
  aiResponse,
  onClose,
}: {
  isSessionActive: boolean;
  isLoading: boolean;
  transcription: string;
  aiResponse: string;
  onClose: () => void;
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && overlayRef.current) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={overlayRef}
      className="fixed z-50 w-full max-w-md bg-background/80 backdrop-blur-lg rounded-lg shadow-2xl border border-border"
      style={{ top: position.y, left: position.x }}
      onMouseDown={handleMouseDown}
    >
      <div data-drag-handle className="flex items-center justify-between p-2 border-b cursor-move">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-sm">
            {isSessionActive ? "Listening..." : "Stealth Mode"}
          </h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <Square className="h-4 w-4" />
          <span className="sr-only">Close Overlay</span>
        </Button>
      </div>
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        <div className="flex items-start gap-2 text-sm">
          <User className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="flex-1">
            {transcription || (
              <span className="text-muted-foreground italic">
                {isSessionActive ? "Listening for question..." : "Session is not active."}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <Bot className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {aiResponse && !isLoading && <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: aiResponse }} />}
            {!aiResponse && !isLoading && <p className="text-muted-foreground italic">AI response will appear here.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

function LivePageContent() {
  const searchParams = useSearchParams();
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    
    const profileId = searchParams.get('profile');
    if (profileId) {
      try {
        const savedProfiles = localStorage.getItem('interviewProfiles');
        if (savedProfiles) {
          const profiles: Profile[] = JSON.parse(savedProfiles);
          const profile = profiles.find(p => p.id === profileId);
          if (profile) {
            setResume(profile.resume);
            setJobDescription(profile.jobDescription);
            toast({
              title: `Profile "${profile.name}" Loaded`,
              description: "You're all set for the live interview!",
            });
          }
        }
      } catch (error) {
         toast({
          title: 'Error loading profile',
          description: 'Using placeholder data.',
          variant: 'destructive',
        });
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toUpperCase() === 'S') {
        event.preventDefault();
        setStealthMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [searchParams, toast]);

  const handleGenerateResponse = useCallback(async (question: string) => {
    if (!question) return;
    setIsLoading(true);
    setAiResponse('');

    try {
      const response = await generateLiveResponse({
        question,
        resume: resume || resumePlaceholder,
        jobDescription: jobDescription || jobDescriptionPlaceholder,
      });
      const htmlAnswer = await marked(response.answer);
      setAiResponse(htmlAnswer);
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate a response." });
    } finally {
      setIsLoading(false);
    }
  }, [resume, jobDescription, toast]);

  const handleToggleSession = () => {
    if (isSessionActive) {
      recognitionRef.current?.stop();
      setIsSessionActive(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: "Unsupported Browser",
        description: "Speech recognition is not supported in your browser.",
      });
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsSessionActive(true);
      setAiResponse('');
      setTranscription('');
      finalTranscriptRef.current = '';
    };

    recognition.onend = () => {
      setIsSessionActive(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      // Process any remaining transcript
      if (finalTranscriptRef.current.trim() && !isLoading) {
        handleGenerateResponse(finalTranscriptRef.current.trim());
        finalTranscriptRef.current = '';
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast({
        variant: "destructive",
        title: "Speech Recognition Error",
        description: event.error === 'not-allowed' ? 'Microphone access was denied.' : 'An error occurred.',
      });
      setIsSessionActive(false);
    };

    recognition.onresult = (event: any) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
      }
      
      setTranscription(finalTranscriptRef.current + interimTranscript);

      silenceTimerRef.current = setTimeout(() => {
        if (finalTranscriptRef.current.trim() && !isLoading) {
          const questionToProcess = finalTranscriptRef.current.trim();
          finalTranscriptRef.current = '';
          handleGenerateResponse(questionToProcess);
        }
      }, 1500); // 1.5 seconds of silence triggers generation
    };

    recognition.start();
  };
  
  if (!isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  if (stealthMode) {
    return (
      <DraggableStealthOverlay
        isSessionActive={isSessionActive}
        isLoading={isLoading}
        transcription={transcription}
        aiResponse={aiResponse}
        onClose={() => setStealthMode(false)}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-background text-foreground">
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
            <h1 className="text-2xl font-bold">Live Co-pilot</h1>
             <div className="flex items-center gap-2">
               <p className="text-sm text-muted-foreground hidden md:block">Your AI Interview Co-pilot</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setStealthMode(true)}>
                    Stealth Mode
                    <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5">Shift+S</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open a draggable, minimal overlay for transcription.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Controls</CardTitle>
                  <CardDescription>Start the session to begin real-time transcription and assistance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert variant={isSessionActive ? 'default' : 'destructive'}>
                    <AlertTitle>
                      {isSessionActive ? 'Session Active: Listening' : 'Session Inactive'}
                    </AlertTitle>
                    <AlertDescription>
                       {isSessionActive ? 'The co-pilot is actively listening for questions.' : 'Click "Start Session" to begin.'}
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleToggleSession} size="lg" className="w-full" variant={isSessionActive ? "destructive" : "default"}>
                    {isSessionActive ? <PowerOff className="mr-2 h-5 w-5" /> : <Power className="mr-2 h-5 w-5" />}
                    {isSessionActive ? 'End Session' : 'Start Session'}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-8 sticky top-8">
              <Card className="min-h-[400px] shadow-2xl bg-card/80 backdrop-blur-sm border-2 border-primary/20">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Interviewer's Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 min-h-[100px]">
                  <p className="text-base font-medium">
                    {transcription || (
                      <span className="text-muted-foreground italic">
                        {isSessionActive ? "Listening..." : "Start a session to begin."}
                      </span>
                    )}
                  </p>
                </CardContent>
                <CardHeader className="border-t">
                   <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="h-5 w-5 text-accent" />
                    AI Co-pilot Response
                  </CardTitle>
                </CardHeader>
                 <CardContent className="pt-4">
                    <div className="w-full">
                      {isLoading && (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <p className="text-muted-foreground italic">Generating response...</p>
                        </div>
                      )}
                      {aiResponse && !isLoading && (
                        <div key={aiResponse} className="prose prose-sm prose-p:text-foreground dark:prose-invert animate-in fade-in-50 duration-500">
                           <div dangerouslySetInnerHTML={{ __html: aiResponse }}></div>
                        </div>
                      )}
                      {!aiResponse && !isLoading && (
                        <p className="text-muted-foreground italic text-sm">
                           Responses will be shown here.
                        </p>
                      )}
                    </div>
                 </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    }>
      <LivePageContent />
    </Suspense>
  );
}
