
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Bot, User, Loader2, Video, Power, PowerOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateLiveResponse } from '@/ai/flows/generate-live-response';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StealthModeOverlay } from '@/components/common/StealthModeOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { marked } from 'marked';


interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
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

function LivePageContent() {
  const searchParams = useSearchParams();
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);

  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

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
    const currentHistory: ChatMessage[] = [...conversationHistory, { role: 'user', content: question }];
    setConversationHistory(currentHistory);

    try {
      const { answer } = await generateLiveResponse({
        question,
        resume: resume || resumePlaceholder,
        jobDescription: jobDescription || jobDescriptionPlaceholder,
        conversationHistory: currentHistory,
      });

      const finalHtmlAnswer = await marked(answer);
      setConversationHistory(prev => [...prev, { role: 'model', content: finalHtmlAnswer }]);

    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate a response." });
      // Remove the user question from history if the call fails
      setConversationHistory(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [resume, jobDescription, toast, conversationHistory]);

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
      setTranscription('');
      finalTranscriptRef.current = '';
      setConversationHistory([]); // Reset history for new session
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
       if (event.error === 'aborted') {
        console.log('Speech recognition aborted by user.');
        return;
      }
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
          setTranscription(''); // Clear the live transcription view
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

  return (
    <TooltipProvider>
      <StealthModeOverlay
        isOpen={stealthMode}
        onClose={() => setStealthMode(false)}
        isSessionActive={isSessionActive}
        isLoading={isLoading}
        conversationHistory={conversationHistory}
        transcription={transcription}
      />
      
      <div className="min-h-screen w-full bg-background text-foreground" style={{ display: stealthMode ? 'none' : 'block' }}>
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
                    <Bot className="h-5 w-5 text-accent" />
                    Interview Conversation
                  </CardTitle>
                </CardHeader>
                 <CardContent className="pt-4 h-[400px] overflow-y-auto space-y-4">
                    {conversationHistory.length === 0 && !transcription && (
                      <p className="text-muted-foreground italic text-sm text-center pt-8">
                           {isSessionActive ? "Listening..." : "Start a session to begin."}
                      </p>
                    )}
                    {conversationHistory.map((msg, index) => (
                      <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <Bot className="h-6 w-6 flex-shrink-0 text-accent" />}
                        <div className={`rounded-lg p-3 max-w-[85%] prose prose-sm dark:prose-invert ${msg.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}
                             dangerouslySetInnerHTML={{ __html: msg.content }}
                        />
                        {msg.role === 'user' && <User className="h-6 w-6 flex-shrink-0 text-primary" />}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <p className="text-muted-foreground italic">Generating response...</p>
                      </div>
                    )}
                     {transcription && (
                       <div className="flex items-start gap-3 justify-end">
                          <div className="rounded-lg p-3 max-w-[85%] bg-primary/80 text-primary-foreground italic">
                            {transcription}
                          </div>
                          <User className="h-6 w-6 flex-shrink-0 text-primary" />
                       </div>
                    )}
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
