'use client';

import { useState, useTransition } from 'react';
import TranscriptionDisplay from './TranscriptionDisplay';
import { answerQuestion } from '@/ai/flows/answer-question';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from './common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import AnswerDisplay from './AnswerDisplay';

export default function InterviewCopilot() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');

  const handleAudioTranscription = (audioBlob: Blob) => {
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label htmlFor="resume" className="block text-sm font-medium mb-1">Your Resume</label>
                        <Textarea id="resume" placeholder="Paste your resume here for tailored answers..." value={resume} onChange={e => setResume(e.target.value)} className="min-h-[100px]"/>
                    </div>
                    <div>
                        <label htmlFor="jd" className="block text-sm font-medium mb-1">Job Description</label>
                        <Textarea id="jd" placeholder="Paste the job description here..." value={jobDescription} onChange={e => setJobDescription(e.target.value)} className="min-h-[100px]"/>
                    </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
                </CardHeader>
                 <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>
                        Press <kbd className="font-mono p-1 bg-muted rounded-sm">R</kbd> to start recording the interviewer's question.
                    </li>
                    <li>
                        Press <kbd className="font-mono p-1 bg-muted rounded-sm">S</kbd> to stop recording and generate an answer.
                    </li>
                    </ul>
                </CardContent>
             </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TranscriptionDisplay onAudioSubmit={handleAudioTranscription} transcript={transcript} isPending={isPending} />
            <AnswerDisplay answer={answer} isLoading={isPending} />
          </div>
        </main>
    </div>
  );
}
