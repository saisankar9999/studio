"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LoadingSpinner } from './common/LoadingSpinner';

interface AnswerDisplayProps {
  transcript: string;
  onNewAnswer: (answer: string) => void;
  triggerGeneration: number;
}

export default function AnswerDisplay({ transcript, onNewAnswer, triggerGeneration }: AnswerDisplayProps) {
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateAnswer = async () => {
    if (!transcript) return;
    
    setIsLoading(true);
    setAnswer('');
    try {
      // This implementation will use a server action instead of a route handler
      // For now, we simulate the fetch call
      // const response = await fetch('/api/generate-answer', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ question: transcript }),
      // });
      
      // const data = await response.json();
      // setAnswer(data.answer);
      // onNewAnswer(data.answer);

    } catch (error) {
      console.error('Error generating answer:', error);
      setAnswer('Sorry, an error occurred while generating the answer.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if(triggerGeneration > 0) {
        // The actual generation is handled in the parent component via server action
        // This component just displays the result
    }
  }, [triggerGeneration]);


  // This component will now receive the answer as a prop
  // The logic to generate will be moved to the parent `InterviewCopilot` component
  return (
    <Card className="bg-card/50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Suggested Answer</CardTitle>
          {/* The button to trigger is now in the parent */}
        </div>
      </CardHeader>
      <CardContent className="min-h-[20rem]">
        {answer || 'Answer will appear here...'}
      </CardContent>
    </Card>
  );
}
