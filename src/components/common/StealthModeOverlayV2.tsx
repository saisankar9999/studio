'use client';

import React, {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  useCallback,
} from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Scan, BrainCircuit, Mic, StopCircle, Keyboard } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface StealthModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isLoading: boolean;
  children: ReactNode;
  onAnswerQuestion: (audioBlob: Blob) => void;
  onAnalyzeScreen: () => void;
}

export function StealthModeOverlayV2({
  isOpen,
  onClose,
  title,
  isLoading,
  children,
  onAnswerQuestion,
  onAnalyzeScreen,
}: StealthModeOverlayProps) {
  const { toast } = useToast();
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      return stream;
    } catch (err) {
      toast({
        title: 'Microphone Access Denied',
        description:
          'Please enable microphone permissions in your browser settings.',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    let stream = micStream;
    if (!stream) {
      stream = await getMicPermission();
    }
    if (stream) {
      setIsRecording(true);
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
      toast({ title: 'Recording question...', description: 'Press "S" to stop.' });
    }
  }, [isRecording, micStream, getMicPermission, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        audioChunksRef.current = [];
        onAnswerQuestion(audioBlob);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Recording stopped. Processing...' });
    }
  }, [isRecording, onAnswerQuestion, toast]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
          startRecording();
      }
      if (event.key.toLowerCase() === 's') {
          stopRecording();
      }
  }, [startRecording, stopRecording]);

  useEffect(() => {
    getMicPermission();
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      micStream?.getTracks().forEach((track) => track.stop());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [getMicPermission, handleKeyDown, micStream]);


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
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <Card className="w-[450px] max-w-lg shadow-2xl bg-background/80 backdrop-blur-sm border-primary/20">
        <CardHeader
          className="flex flex-row items-center justify-between p-2 pl-4"
          onMouseDown={handleMouseDown}
        >
          <div
            className="flex items-center gap-2 cursor-grab"
            data-drag-handle
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
               <BrainCircuit className="h-5 w-5 text-primary" />
               {isRecording && <div className="flex items-center gap-1.5 text-red-500"><StopCircle className="animate-pulse h-4 w-4" /> <span>Recording...</span></div>}
               {!isRecording && title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : children ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
              <Alert>
                <Keyboard className="h-4 w-4" />
                <AlertTitle>Keyboard Controls</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    <li><kbd className="font-mono p-1 bg-muted rounded-sm">R</kbd> - Start Recording Question</li>
                    <li><kbd className="font-mono p-1 bg-muted rounded-sm">S</kbd> - Stop and Process</li>
                    <li><kbd className="font-mono p-1 bg-muted rounded-sm">Esc</kbd> - Show/Hide This Window</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="p-2">
          <Button onClick={onAnalyzeScreen} disabled={isLoading} size="sm" className="w-full">
            <Scan className="mr-2" /> Analyze Screen
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
