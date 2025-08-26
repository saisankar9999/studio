"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PipMode from './PipMode';
import TranscriptionDisplay from './TranscriptionDisplay';
import AnswerDisplay from './AnswerDisplay';
import { getUserPrepData, buildPromptWithPrepData } from '@/lib/interviewService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function InterviewCopilot() {
  const { data: session } = useSession();
  const [transcript, setTranscript] = useState('');
  const [prepData, setPrepData] = useState<any>(null);
  const [isLoadingPrepData, setIsLoadingPrepData] = useState(true);

  useEffect(() => {
    const fetchPrepData = async () => {
      // For now, we are not using next-auth, so we'll mock a user ID.
      // In a real app, you would get this from the session.
      const userId = session?.user?.id || 'mock-user-id';
      
      setIsLoadingPrepData(true);
      try {
        const data = await getUserPrepData(userId);
        setPrepData(data);
      } catch (error) {
        console.error('Error fetching prep data:', error);
      } finally {
        setIsLoadingPrepData(false);
      }
    };

    fetchPrepData();
  }, [session]);

  const generateAnswer = async (question: string) => {
    if (!question) return 'Please provide a question.';
    
    try {
      const prompt = buildPromptWithPrepData(question, prepData);
      
      const response = await fetch('/api/generate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          userId: session?.user?.id || 'mock-user-id',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      return data.answer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error generating answer:', error);
      return `Sorry, I encountered an error generating an answer: ${errorMessage}`;
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-headline">Interview Copilot</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your AI-powered assistant for acing interviews.
        </p>
        {isLoadingPrepData ? (
             <Badge variant="secondary">Loading prep data...</Badge>
        ) : prepData ? (
            <Badge variant="default" className="mt-2 bg-green-600">✓ Prep data loaded</Badge>
        ) : (
            <Badge variant="destructive" className="mt-2">No prep data found</Badge>
        )}
      </header>
      
      <main>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <TranscriptionDisplay onTranscript={setTranscript} />
            
            <Card>
              <CardHeader><CardTitle>Keyboard Shortcuts</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>Press <kbd className="font-mono p-1 bg-muted rounded-sm">R</kbd> to start recording.</li>
                  <li>Press <kbd className="font-mono p-1 bg-muted rounded-sm">S</kbd> to stop recording & process.</li>
                  <li>Press <kbd className="font-mono p-1 bg-muted rounded-sm">P</kbd> to toggle Picture-in-Picture mode.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <AnswerDisplay transcript={transcript} generateAnswer={generateAnswer} />
        </div>
      </main>
      
      <PipMode>
        <div className="p-2 bg-background rounded-lg border">
          <TranscriptionDisplay onTranscript={setTranscript} />
          <AnswerDisplay transcript={transcript} generateAnswer={generateAnswer} />
        </div>
      </PipMode>
    </div>
  );
}
