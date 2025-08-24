
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateInterviewResponse } from '@/ai/flows/generate-interview-response';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Bot, User, Loader2, Video, ScreenShare, MonitorStop } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
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
  isRecording,
  isLoading,
  transcription,
  aiResponse,
  onClose,
}: {
  isRecording: boolean;
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
    // Only allow dragging from the header
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
          <h3 className="font-semibold">Stealth Mode</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <Square className="h-4 w-4" />
          <span className="sr-only">Close Overlay</span>
        </Button>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2 text-sm">
          <User className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="flex-1">
            {transcription || (
              <span className="text-muted-foreground italic">
                {isRecording ? "Listening..." : "Start recording to see transcription."}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <Bot className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {aiResponse && !isLoading && <p>{aiResponse}</p>}
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSource, setRecordingSource] = useState<'mic' | 'screen' | null>(null);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      stopRecording();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchParams, toast]);

  const processAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    setAiResponse('');
    setTranscription('');

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const audioDataUri = reader.result as string;
      try {
        const { text: transcribedQuestion } = await transcribeAudio({ audioDataUri });
        if (!transcribedQuestion) throw new Error("Transcription failed.");
        
        setTranscription(transcribedQuestion);

        const response = await generateInterviewResponse({
          transcription: transcribedQuestion,
          resume: resume || resumePlaceholder,
          jobDescription: jobDescription || jobDescriptionPlaceholder,
        });
        setAiResponse(response.answer);
      } catch (error) {
        console.error("Error processing audio:", error);
        toast({ variant: "destructive", title: "AI Error", description: "Failed to process audio." });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startRecording = useCallback(async (source: 'mic' | 'screen') => {
    if (isRecording) {
      toast({ title: "Already recording", description: "Please stop the current recording first."});
      return;
    }

    try {
      let stream: MediaStream | null = null;
      if (source === 'mic') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }

      if (stream) {
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if(audioBlob.size > 0) {
            processAudio(audioBlob);
          }
          // Clean up stream
          mediaStreamRef.current?.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingSource(source);
        setAiResponse('');
        setTranscription('');
      }

    } catch (err) {
      console.error(`Error starting ${source} recording:`, err);
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: `Could not start ${source} recording. Please grant the necessary permissions.`,
      });
    }
  }, [isRecording, toast]);


  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingSource(null);
    }
  }, [isRecording]);
  
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
        isRecording={isRecording}
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
            <h1 className="text-2xl font-bold">WhisperAssist</h1>
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
                  <CardDescription>Start recording from your mic or screen when ready.</CardDescription>
                </CardHeader>
                <CardContent>
                   <p className="text-sm text-muted-foreground mb-4">
                    The resume and job description from your selected profile are loaded.
                  </p>
                  {isRecording && (
                    <Alert variant={recordingSource === 'mic' ? 'default' : 'destructive'}>
                      <AlertTitle>
                        {recordingSource === 'mic' ? 'Recording from Microphone' : 'Recording from Screen'}
                      </AlertTitle>
                      <AlertDescription>
                        Click "Stop Recording" to process the audio.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-2">
                   {!isRecording ? (
                     <>
                      <Button onClick={() => startRecording('mic')} size="lg" className="w-full sm:w-auto">
                        <Mic className="mr-2 h-5 w-5" />
                        Record Mic
                      </Button>
                       <Button onClick={() => startRecording('screen')} size="lg" variant="outline" className="w-full sm:w-auto">
                        <ScreenShare className="mr-2 h-5 w-5" />
                        Share Screen
                      </Button>
                     </>
                   ) : (
                     <Button onClick={stopRecording} size="lg" variant="destructive" className="w-full">
                        <Square className="mr-2 h-5 w-5" />
                        Stop Recording
                      </Button>
                   )}
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-8 sticky top-8">
              <Card className="min-h-[200px]">
                <CardHeader>
                  <CardTitle>Live Transcription</CardTitle>
                  <CardDescription>Your interviewer's questions will appear here.</CardDescription>
                </CardHeader>
                <CardContent className="text-lg font-medium flex items-center gap-4">
                  <User className="h-6 w-6 text-primary flex-shrink-0" />
                  <p>
                    {transcription || (
                      <span className="text-muted-foreground italic">
                        {isRecording ? "Listening..." : "Start a recording to begin."}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <div className="relative">
                <Card className="min-h-[300px] shadow-2xl bg-card/80 backdrop-blur-sm border-2 border-accent transition-all duration-300 animate-in fade-in-0 zoom-in-95">
                  <CardHeader>
                    <CardTitle>AI Co-pilot Response</CardTitle>
                    <CardDescription>The AI's suggested response will appear here.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-lg flex items-start gap-4">
                    <Bot className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                    <div className="w-full">
                      {isLoading && (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <p className="text-muted-foreground italic">Generating response...</p>
                        </div>
                      )}
                      {aiResponse && !isLoading && (
                        <div key={aiResponse} className="prose prose-p:text-foreground dark:prose-invert animate-in fade-in-50 duration-500">
                           <p>{aiResponse}</p>
                        </div>
                      )}
                      {!aiResponse && !isLoading && (
                        <p className="text-muted-foreground italic">
                           Responses will be shown here.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

// Next.js requires a default export for pages.
// We wrap the main content in a Suspense boundary to handle the useSearchParams hook.
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
