
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TranscriptionDisplay from '@/components/TranscriptionDisplay';
import { answerQuestion } from '@/ai/flows/answer-question';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnswerDisplay from '@/components/AnswerDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

export default function InterviewCopilot() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  
  // State for resume and JD is now managed here
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // Load profile from localStorage based on URL param
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
  }, [searchParams, toast]);

  const handleAudioTranscription = (audioBlob: Blob) => {
    if (!resume || !jobDescription) {
        toast({
            title: 'Context Missing',
            description: 'Please select a profile from the dashboard first.',
            variant: 'destructive',
        });
        return;
    }

    startTransition(async () => {
      setTranscript('Transcribing and generating answer...');
      setAnswer('');

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        try {
          const result = await answerQuestion({
            audioDataUri: base64Audio,
            jobDescription: jobDescription,
            resume: resume,
          });

          if (result && result.transcribedQuestion) {
            setTranscript(result.transcribedQuestion);
            setAnswer(result.answer);
            toast({
              title: 'Answer Generated',
              description: 'The suggested answer is ready.',
            });
          } else {
            setTranscript('Sorry, could not transcribe the audio.');
             toast({
              title: 'Error',
              description: 'Failed to process audio.',
              variant: 'destructive',
            });
          }
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occured."
            setTranscript(`Error: ${errorMessage}`);
            toast({
                title: "Error",
                description: errorMessage,
                variant: 'destructive'
            })
        }
      };
      reader.onerror = () => {
         setTranscript('Error reading audio file.');
         toast({
            title: 'Error',
            description: 'Could not read the recorded audio.',
            variant: 'destructive',
          });
      }
    });
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
       <h1 className="mb-2 font-headline text-4xl font-bold">
        Live Interview Co-pilot
      </h1>
      <p className="mb-8 text-muted-foreground">
        Use your microphone to capture the interviewer's question and get a real-time suggested answer.
      </p>

        <main>
          <Alert className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Keyboard Shortcuts</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                <li>Press <kbd className="font-mono p-1 bg-muted rounded-sm">R</kbd> to start recording the interviewer's question.</li>
                <li>Press <kbd className="font-mono p-1 bg-muted rounded-sm">S</kbd> to stop recording and generate an answer.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TranscriptionDisplay onAudioSubmit={handleAudioTranscription} transcript={transcript} isPending={isPending} />
            <AnswerDisplay answer={answer} isLoading={isPending} />
          </div>
        </main>
    </div>
  );
}

    