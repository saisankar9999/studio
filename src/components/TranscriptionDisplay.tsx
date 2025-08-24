'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Mic, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TranscriptionDisplayProps {
    onAudioSubmit: (audioBlob: Blob) => void;
    transcript: string;
    isPending: boolean;
}

export default function TranscriptionDisplay({ onAudioSubmit, transcript, isPending }: TranscriptionDisplayProps) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

  const getMicPermission = useCallback(async () => {
     try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
     } catch (err) {
        setHasPermission(false);
        toast({
            title: "Microphone Access Denied",
            description: "Please enable microphone permissions in your browser settings.",
            variant: "destructive"
        })
     }
  }, [toast]);

  useEffect(() => {
      getMicPermission();
  }, [getMicPermission]);

  const startListening = async () => {
    if (!hasPermission) {
        await getMicPermission();
        return;
    }

    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        onAudioSubmit(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsListening(true);
      toast({ title: "Recording started..."})
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast({ title: "Could not start recording.", description: "Please ensure microphone is connected and permissions are allowed.", variant: "destructive"})
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      toast({ title: "Recording stopped, processing..."})
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if(event.key.toLowerCase() === 'r') {
          startListening();
      }
      if(event.key.toLowerCase() === 's') {
          stopListening();
      }
  }, []);

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      }
  }, [handleKeyDown]);

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Interviewer Question</CardTitle>
          <div className="flex gap-2">
            <Button
                onClick={startListening}
                disabled={isListening || isPending || !hasPermission}
                size="sm"
                variant="outline"
            >
                <Mic className="mr-2 h-4 w-4" />
                Start
            </Button>
            <Button
                onClick={stopListening}
                disabled={!isListening || isPending}
                size="sm"
                variant="destructive"
            >
                <StopCircle className="mr-2 h-4 w-4" />
                Stop
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-[20rem]">
        {isListening && <div className="text-primary animate-pulse">Listening...</div>}
        <p className="prose prose-sm dark:prose-invert max-w-none">{transcript || 'Transcript will appear here...'}</p>
      </CardContent>
    </Card>
  );
}
