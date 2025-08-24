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
import { GripVertical, X, Mic, StopCircle, Scan, BrainCircuit } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';

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

  const getMicPermission = async () => {
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
  };

  const startRecording = async () => {
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
      toast({ title: 'Recording question...' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
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
  };

  useEffect(() => {
    getMicPermission(); // Request permission on component mount

    return () => {
      // Clean up mic stream when component unmounts
      micStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);


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
               {title}
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
            <div className="flex items-center justify-center h-24 text-center text-muted-foreground">
              <p>Ready for your command.</p>
            </div>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="p-2 grid grid-cols-2 gap-2">
           {!isRecording ? (
            <Button onClick={startRecording} disabled={isLoading} size="sm">
              <Mic className="mr-2" /> Record Question
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              disabled={isLoading}
              variant="destructive"
              size="sm"
            >
              <StopCircle className="mr-2" /> Stop Recording
            </Button>
          )}
          <Button onClick={onAnalyzeScreen} disabled={isLoading} size="sm">
            <Scan className="mr-2" /> Analyze Screen
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
