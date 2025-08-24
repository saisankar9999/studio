'use client';

import { useState, useTransition } from 'react';
import TranscriptionDisplay from './TranscriptionDisplay';
import { answerQuestion } from '@/ai/flows/answer-question';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from './common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';

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
    <div className="min-h-screen bg-background text-foreground p-4 font-body">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center font-headline">
            Interview Copilot
          </h1>
          <p className="text-center text-muted-foreground mt-2">
            Your AI-powered assistant for acing interviews
          </p>
        </header>

        <main>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
             <Card className="bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label htmlFor="resume" className="block text-sm font-medium mb-1">Resume</label>
                        <Textarea id="resume" placeholder="Paste your resume here..." value={resume} onChange={e => setResume(e.target.value)} className="min-h-[100px]"/>
                    </div>
                    <div>
                        <label htmlFor="jd" className="block text-sm font-medium mb-1">Job Description</label>
                        <Textarea id="jd" placeholder="Paste the job description here..." value={jobDescription} onChange={e => setJobDescription(e.target.value)} className="min-h-[100px]"/>
                    </div>
                </CardContent>
             </Card>
             <Card className="bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
                </CardHeader>
                 <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>
                        <kbd className="font-mono p-1 bg-muted rounded-sm">R</kbd> - Start Recording
                    </li>
                    <li>
                        <kbd className="font-mono p-1 bg-muted rounded-sm">S</kbd> - Stop and Process
                    </li>
                    </ul>
                </CardContent>
             </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TranscriptionDisplay onAudioSubmit={handleAudioTranscription} transcript={transcript} isPending={isPending} />
            
            <Card className="bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">Suggested Answer</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[20rem] prose prose-sm dark:prose-invert max-w-none">
                    {isPending && !answer ? <div className="flex items-center justify-center h-full"><LoadingSpinner/></div> : <p>{answer || "Answer will appear here..."}</p>}
                </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
