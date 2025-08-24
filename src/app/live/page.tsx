
'use client';

import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AnswerDisplay from '@/components/AnswerDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Terminal, Mic, StopCircle, AudioLines, BrainCircuit } from 'lucide-react';
import { answerQuestionAction } from './actions';

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

// Simple VAD (Voice Activity Detection) logic
const VAD_SILENCE_DURATION_MS = 1500; // 1.5 seconds of silence
const VAD_THRESHOLD = -50; // dB threshold for silence

export default function InterviewCopilot() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // Real-time session state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const mediaRecorderRef =  useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
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
              description: "The co-pilot will use this context for answers.",
            });
          } else {
             toast({ title: "Profile not found.", variant: 'destructive'});
          }
        }
      } catch (error) {
        toast({
          title: 'Error loading profile',
          description: 'Could not load profile from local storage.',
          variant: 'destructive',
        });
      }
    }
    
    // Cleanup on component unmount
    return () => {
        stopSession();
    };
  }, [searchParams, toast]);

  const handleAudioProcessing = useCallback((audioBlob: Blob) => {
    if (!resume || !jobDescription) {
        toast({
            title: 'Context Missing',
            description: 'Please select a profile from the dashboard first.',
            variant: 'destructive',
        });
        return;
    }

    startTransition(async () => {
      setTranscript('Processing...');
      setAnswer('');

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const result = await answerQuestionAction({
          audioDataUri: base64Audio,
          jobDescription: jobDescription,
          resume: resume,
        });
        
        if (!result) {
            toast({ title: 'Error', description: 'Received an empty response from the server.', variant: 'destructive' });
            setTranscript('An unknown error occurred.');
            return;
        }

        if (result.error) {
          toast({ title: "Error", description: result.error, variant: 'destructive' });
          setTranscript(`Error: ${result.error}`);
        } else if (result.answer) {
          setTranscript(result.answer.transcribedQuestion);
          setAnswer(result.answer.answer);
          toast({ title: 'Answer Ready', description: 'A suggested answer has been generated.' });
        } else {
          setTranscript('Sorry, could not process the audio.');
        }
      };
      reader.onerror = () => {
         setTranscript('Error reading audio file.');
         toast({ title: 'Error', description: 'Could not read the recorded audio.', variant: 'destructive' });
      }
    });
  }, [resume, jobDescription, toast]);

  const startSession = useCallback(async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setIsSessionActive(true);
        setIsListening(true);
        setTranscript('Session started. Listening for question...');

        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        source.connect(analyserRef.current);

        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 0) {
            handleAudioProcessing(audioBlob);
          }
          audioChunksRef.current = [];
          // Automatically restart recording if session is still active
          if (streamRef.current) {
            mediaRecorderRef.current?.start();
          }
        };
        
        mediaRecorderRef.current.start();
        
        const monitor = () => {
            if (!analyserRef.current || !mediaRecorderRef.current || !isSessionActive) return;
            
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for(let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const dB = 20 * Math.log10(average / 255);
            
            if (dB < VAD_THRESHOLD) {
                if (!silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        if (mediaRecorderRef.current?.state === 'recording') {
                            mediaRecorderRef.current.stop();
                        }
                    }, VAD_SILENCE_DURATION_MS);
                }
            } else {
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            }
            requestAnimationFrame(monitor);
        };
        requestAnimationFrame(monitor);

    } catch (err) {
        toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }, [handleAudioProcessing, isSessionActive, toast]);

  const stopSession = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current?.stop();
    }
    audioContextRef.current?.close();

    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    silenceTimerRef.current = null;

    setIsSessionActive(false);
    setIsListening(false);
    setTranscript('');
    setAnswer('');
    toast({ title: "Session Ended" });
  }, [toast]);

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <h1 className="mb-2 font-headline text-4xl font-bold">Live Interview Co-pilot</h1>
      <p className="mb-4 text-muted-foreground">
        Start a session to enable real-time transcription and answer generation. The agent will listen for a question and automatically provide an answer after a moment of silence.
      </p>

      <main>
        <Alert className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>How it works</AlertTitle>
          <AlertDescription>
            Click "Start Session". The agent will listen for speech. When it detects a pause, it will automatically process the audio to generate a transcript and a suggested answer.
          </AlertDescription>
        </Alert>
        
         <div className="mb-6 text-center">
            {!isSessionActive ? (
                 <Button onClick={startSession} disabled={isPending}>
                    <Mic className="mr-2" /> Start Session
                 </Button>
            ) : (
                <Button onClick={stopSession} variant="destructive" disabled={isPending}>
                    <StopCircle className="mr-2" /> Stop Session
                 </Button>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interviewer's Question</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[20rem] prose prose-sm dark:prose-invert max-w-none">
              {isSessionActive && (
                <div className="flex items-center gap-2 text-primary mb-4">
                  {isListening && !isPending && <AudioLines className="animate-pulse" />}
                  {isPending && <BrainCircuit className="animate-spin" />}
                  <span>{isPending ? 'Processing...' : 'Listening...'}</span>
                </div>
              )}
              <p>{transcript || 'Transcript will appear here...'}</p>
            </CardContent>
          </Card>
          <AnswerDisplay answer={answer} isLoading={isPending} />
        </div>
      </main>
    </div>
  );
}
