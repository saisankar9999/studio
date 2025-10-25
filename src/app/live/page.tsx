
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, User, Loader2, Power, PowerOff, AudioLines, Monitor, MonitorOff, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateLiveResponse } from '@/ai/flows/generate-live-response';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StealthModeOverlay } from '@/components/common/StealthModeOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { marked } from 'marked';
import { getUserProfiles } from '@/lib/firebase/firestore';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';


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

function LivePageContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [profileName, setProfileName] = useState('');
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  const recognitionRef = useRef<any>(null);
  
  const { toast } = useToast();
  
  const isLoading = isGenerating;

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [conversationHistory, isLoading, liveTranscript]);

  const handleGenerateResponse = useCallback(async (question: string) => {
    if (!question) return;

    setIsGenerating(true);
    const currentHistory: ChatMessage[] = [...conversationHistory, { role: 'user', content: question }];
    setConversationHistory(currentHistory);

    try {
      const { answer } = await generateLiveResponse({
        question,
        resume,
        jobDescription,
        conversationHistory: currentHistory,
      });

      const finalHtmlAnswer = await marked(answer);
      setConversationHistory(prev => [...prev, { role: 'model', content: finalHtmlAnswer }]);

    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate a response." });
      setConversationHistory(prev => prev.slice(0, -1)); // Remove the user's question if AI fails
    } finally {
      setIsGenerating(false);
    }
  }, [resume, jobDescription, toast, conversationHistory]);
  
  const startRecording = useCallback(() => {
    if (!recognitionRef.current || isRecording) {
      return;
    }

    const recognition = recognitionRef.current;
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setLiveTranscript(interimTranscript);

      if (finalTranscript.trim()) {
        handleGenerateResponse(finalTranscript.trim());
        setLiveTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }
      console.error('Speech recognition error:', event.error);
      toast({
        variant: "destructive",
        title: "Speech Recognition Error",
        description: `Error: ${event.error}. The service may have stopped.`,
      });
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      // If the session is still supposed to be active, restart recognition
      if (isSessionActive) {
        try {
            recognition.start();
        } catch(e) {
            // Might fail if already started
        }
      } else {
        setIsRecording(false);
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
    } catch(e) {
      console.error("Could not start recognition:", e);
    }
  }, [handleGenerateResponse, toast, isRecording, isSessionActive]);


  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
        setLiveTranscript('');
    }
  }, [isRecording]);

  useEffect(() => {
    setIsClient(true);
    
    const profileId = searchParams.get('profile');

    async function loadProfile() {
      if (!profileId) {
        toast({
          title: 'No Profile Selected',
          description: 'Please go to the dashboard and select a profile to use the Live Co-pilot.',
          variant: 'destructive',
        });
        return;
      }
      if (session?.user?.id) {
        try {
          const profiles = await getUserProfiles(session.user.id);
          const profile = profiles.find(p => p.id === profileId);
          if (profile) {
            setResume(profile.resume);
            setJobDescription(profile.jobDescription);
            setProfileName(profile.name);
            toast({
              title: `Profile "${profile.name}" Loaded`,
              description: "You're all set for the live interview!",
            });
          } else {
             toast({
              title: 'Profile not found',
              description: 'Could not find the selected profile in your account.',
              variant: 'destructive',
            });
          }
        } catch (error) {
           toast({
            title: 'Error loading profile',
            description: 'Could not fetch profiles from the database.',
            variant: 'destructive',
          });
        }
      }
    }

    loadProfile();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        setStealthMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;
    } else {
      toast({ title: 'Speech Recognition Not Supported', description: 'Please use a different browser like Chrome.', variant: 'destructive' });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent restart on component unmount
        recognitionRef.current.stop();
      }
    };
  }, [searchParams, toast, session]);
  
  
  useEffect(() => {
    if (isSessionActive) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isSessionActive, startRecording, stopRecording]);

  const handleToggleSession = () => {
    if (!profileName) {
         toast({ title: 'No Profile Loaded', description: 'Cannot start session without a job profile.', variant: 'destructive' });
         return;
    }
    if (isSessionActive) {
      setIsSessionActive(false);
    } else {
      setConversationHistory([]);
      setIsSessionActive(true);
    }
  };

  const handleToggleScreenShare = async () => {
    if (isSharingScreen) {
      screenShareStreamRef.current?.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsSharingScreen(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false, 
        });
        screenShareStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false);
          if (videoRef.current) videoRef.current.srcObject = null;
        };
        setIsSharingScreen(true);
      } catch (error) {
        console.error("Error starting screen share:", error);
        toast({
          title: "Screen Share Failed",
          description: "Could not start screen sharing. Please check browser permissions.",
          variant: "destructive",
        });
      }
    }
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
        transcription={liveTranscript}
      />
      
      <div className="min-h-screen w-full bg-background text-foreground" style={{ display: stealthMode ? 'none' : 'block' }}>
         <div className="container mx-auto max-w-7xl p-4 py-12 md:p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Live Co-pilot</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                    Get discreet, real-time assistance during your interview calls. Share your screen, start the session, and let the AI help you shine.
                </p>
                <div className="mt-4 flex justify-center items-center gap-4">
                    {profileName ? 
                        <Badge variant="secondary">Profile: {profileName}</Badge> : 
                        <Badge variant="destructive">No Profile Loaded</Badge>
                    }
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setStealthMode(true)}>
                            Stealth Mode
                            <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5">Ctrl+S</span>
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Open a draggable, minimal overlay for transcription.</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Screen Share</CardTitle>
                  <CardDescription>Display your interview window (e.g., Zoom, Teams) here to keep everything in one place.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                    <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${!isSharingScreen ? 'hidden' : ''}`} />
                    {!isSharingScreen && <Monitor className="h-16 w-16 text-muted-foreground" />}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleToggleScreenShare} className="w-full" variant={isSharingScreen ? "secondary" : "default"}>
                    {isSharingScreen ? <MonitorOff /> : <Monitor />}
                    {isSharingScreen ? 'Stop Sharing Screen' : 'Start Screen Share'}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Controls</CardTitle>
                  <CardDescription>Start the session to begin live transcription and answer generation.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert variant={isSessionActive ? 'default' : 'destructive'}>
                     <AlertCircle className="h-4 w-4"/>
                     <AlertTitle>
                      {isSessionActive ? 'Session Active' : 'Session Inactive'}
                    </AlertTitle>
                    <AlertDescription>
                       {isSessionActive ? 'Live transcription is running. The AI will respond after it detects a pause in speech.' : 'Click "Start Session" to begin.'}
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

            <div className="space-y-8 sticky top-24">
              <Card className="h-[70vh] flex flex-col shadow-lg bg-card/80 backdrop-blur-sm border-2 border-primary/20">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="h-5 w-5 text-accent" />
                    Conversation & Suggestions
                  </CardTitle>
                </CardHeader>
                 <CardContent className="pt-4 flex-1 overflow-y-auto space-y-4">
                    {conversationHistory.length === 0 && !isRecording && !isLoading && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Bot className="h-10 w-10 mb-4" />
                        <p className="italic text-sm">
                           {isSessionActive ? "Listening for the first question..." : "Start a session to begin."}
                        </p>
                      </div>
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
                     {isRecording && liveTranscript && (
                       <div className="flex items-center justify-end space-x-2 text-primary">
                          <p className="italic bg-primary/10 p-2 rounded-lg">{liveTranscript}</p>
                           <User className="h-6 w-6 flex-shrink-0 text-primary" />
                       </div>
                    )}
                    {isGenerating && (
                      <div className="flex items-start gap-3">
                        <Bot className="h-6 w-6 flex-shrink-0 text-accent" />
                        <div className="p-3 bg-muted rounded-lg">
                           <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      </div>
                    )}
                    { isRecording && !liveTranscript &&
                      <div className="flex items-center gap-2 text-primary animate-pulse">
                        <AudioLines className="h-4 w-4" />
                        <p className="text-sm italic">Listening...</p>
                      </div>
                    }
                    <div ref={chatEndRef} />
                 </CardContent>
              </Card>
            </div>
          </div>
        </div>
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
