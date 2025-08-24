'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  answerQuestionAction,
  analyzeScreenAction,
} from './actions';
import { AlertCircle, Terminal, Video } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StealthModeOverlayV2 } from '@/components/common/StealthModeOverlayV2';
import type { AnswerQuestionOutput } from '@/ai/flows/answer-question';
import type { AnalyzeScreenOutput } from '@/ai/flows/analyze-screen';

export default function LivePage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Stealth Mode State
  const [stealthMode, setStealthMode] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [stealthContent, setStealthContent] = useState<
    AnswerQuestionOutput | AnalyzeScreenOutput | null
  >(null);
  const [stealthTitle, setStealthTitle] = useState<string>('Co-pilot');
  const [overlayVisible, setOverlayVisible] = useState(false);

  const handleLaunchStealthMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = stream;
      setStealthMode(true);
      setOverlayVisible(false); // Overlay is hidden by default
      toast({
        title: 'Stealth Mode Activated',
        description: 'Press "R" to record question, "S" to stop. "Esc" to toggle overlay.',
      });

      stream.getVideoTracks()[0].onended = () => {
        setStealthMode(false);
        screenStreamRef.current = null;
        toast({
          title: 'Stealth Mode Deactivated',
          description: 'Screen sharing has ended.',
        });
      };
    } catch (err) {
      console.error('Error starting screen share:', err);
      toast({
        title: 'Screen Share Canceled or Failed',
        description: 'Could not start screen sharing to launch Stealth Mode.',
        variant: 'destructive',
      });
    }
  };

  const handleStopStealthMode = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setStealthMode(false);
    setOverlayVisible(false);
  };

  const onAnswerQuestion = (audioBlob: Blob) => {
    startTransition(async () => {
      setStealthContent(null);
      setStealthTitle('Answering Question...');
      setOverlayVisible(true); // Show overlay when processing

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const interviewData = JSON.parse(
          localStorage.getItem('interviewData') || '{}'
        );

        const result = await answerQuestionAction({
          audioDataUri: base64Audio,
          resume: interviewData.resume || 'No resume provided.',
          jobDescription:
            interviewData.jobDescription || 'No job description provided.',
        });

        if (result.error) {
          toast({
            title: 'Error answering question',
            description: result.error,
            variant: 'destructive',
          });
          setStealthTitle('Error');
        } else {
          setStealthContent(result.answer);
          setStealthTitle('Generated Answer');
        }
      };
    });
  };

  const onAnalyzeScreen = async () => {
    if (!screenStreamRef.current) {
      toast({
        title: 'Screen Share Not Active',
        description: 'Please start screen sharing to analyze.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const videoTrack = screenStreamRef.current.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      const bitmap = await imageCapture.grabFrame();

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      context?.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
      const screenshotDataUri = canvas.toDataURL('image/png');

      toast({ title: 'Screen captured! Analyzing...' });

      startTransition(async () => {
        setStealthContent(null);
        setStealthTitle('Analyzing Screen...');
        setOverlayVisible(true);
        const result = await analyzeScreenAction({ screenshotDataUri });
        if (result.error) {
          toast({
            title: 'Error analyzing screen',
            description: result.error,
            variant: 'destructive',
          });
          setStealthTitle('Error');
        } else {
          setStealthContent(result.analysis);
          setStealthTitle('Screen Analysis');
        }
      });
    } catch (error) {
      console.error('Error capturing screen:', error);
      toast({
        title: 'Screen Capture Failed',
        description: 'Could not capture the screen.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    return () => {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOverlayVisible(v => !v);
      }
  }, []);

  useEffect(() => {
      if (stealthMode) {
          window.addEventListener('keydown', handleKeyDown);
      } else {
          window.removeEventListener('keydown', handleKeyDown);
      }
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      }
  }, [stealthMode, handleKeyDown]);

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      {stealthMode && (
        <StealthModeOverlayV2
          isOpen={overlayVisible}
          onClose={handleStopStealthMode}
          title={stealthTitle}
          isLoading={isPending}
          onAnswerQuestion={onAnswerQuestion}
          onAnalyzeScreen={onAnalyzeScreen}
        >
          {stealthContent && 'transcribedQuestion' in stealthContent && (
            <div className="space-y-4">
              <h4 className="font-semibold">Transcribed Question:</h4>
              <p className="text-muted-foreground">
                {stealthContent.transcribedQuestion}
              </p>
              <h4 className="font-semibold">Suggested Answer:</h4>
              <div
                className="prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: stealthContent.answer.replace(/\n/g, '<br />'),
                }}
              />
            </div>
          )}
          {stealthContent && 'analysis' in stealthContent && (
            <div className="space-y-4">
              <h4 className="font-semibold">Analysis:</h4>
              <p className="text-muted-foreground">{stealthContent.analysis}</p>
              <h4 className="font-semibold">Suggestion:</h4>
              <div
                className="prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: stealthContent.suggestion.replace(/\n/g, '<br />'),
                }}
              />
            </div>
          )}
        </StealthModeOverlayV2>
      )}

      <h1 className="mb-2 font-headline text-4xl font-bold">
        Live Interview Co-pilot
      </h1>
      <p className="mb-8 text-muted-foreground">
        Discreet tools to help you shine during your live interview.
      </p>
          <Card>
            <CardHeader>
              <CardTitle>Stealth Mode</CardTitle>
              <CardDescription>
                Launch a discreet overlay for real-time interview assistance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>How to Use Stealth Mode</AlertTitle>
                <AlertDescription>
                  Click "Launch Stealth Mode" and share your **Entire Screen**.
                  The overlay will be invisible to others. Use keyboard shortcuts
                  for control: `R` to start recording, `S` to stop, and `Esc` to
                  toggle the overlay's visibility.
                </AlertDescription>
              </Alert>

              {!stealthMode ? (
                <Button
                  onClick={handleLaunchStealthMode}
                  disabled={isPending}
                  className="w-full"
                >
                  <Video className="mr-2 h-4 w-4" /> Launch Stealth Mode
                </Button>
              ) : (
                 <Button
                  onClick={handleStopStealthMode}
                  disabled={isPending}
                  className="w-full"
                  variant="destructive"
                >
                  Stop Stealth Mode
                </Button>
              )}
            </CardContent>
          </Card>
    </div>
  );
}
