'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle,
  BrainCircuit,
  Mic,
  StopCircle,
  AudioLines,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { GenerateInterviewQuestionsOutput } from '@/ai/flows/generate-interview-questions';
import type { AnalyzeInterviewPerformanceOutput } from '@/ai/flows/analyze-interview-performance';
import { transcribeAndAnalyzeAnswerAction } from './actions';
import Link from 'next/link';

interface InterviewData {
  questions: GenerateInterviewQuestionsOutput;
  resume: string;
  jobDescription: string;
}

type PerformanceResult = AnalyzeInterviewPerformanceOutput & {
  question: string;
  answer: string;
};

export default function MockInterviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [interviewData, setInterviewData] = useState<InterviewData | null>(
    null
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showSuggestedAnswer, setShowSuggestedAnswer] = useState(false);
  const [performance, setPerformance] = useState<PerformanceResult[]>([]);
  const [currentFeedback, setCurrentFeedback] =
    useState<AnalyzeInterviewPerformanceOutput | null>(null);
  const [finished, setFinished] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    try {
      const data = localStorage.getItem('interviewData');
      if (data) {
        setInterviewData(JSON.parse(data));
      } else {
        router.replace('/practice');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load interview session.',
        variant: 'destructive',
      });
      router.replace('/practice');
    }

    // Request microphone permissions on load
    async function getPermissions() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(stream);
      } catch (error) {
        toast({
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions to record your answers.',
          variant: 'destructive',
        });
      }
    }
    getPermissions();

    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [router, toast]);

  const startRecording = () => {
    if (mediaStream) {
      setIsRecording(true);
      setCurrentFeedback(null);
      setUserAnswer('');
      setShowSuggestedAnswer(false);

      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
      toast({ title: 'Recording started...' });
    } else {
      toast({
        title: 'Microphone Not Ready',
        description: 'Please grant microphone access to record.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        handleSubmitAnswer(audioBlob);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Recording stopped. Analyzing...' });
    }
  };

  const handleSubmitAnswer = (audioBlob: Blob) => {
    if (!interviewData) return;

    startTransition(async () => {
      setCurrentFeedback(null);
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        const result = await transcribeAndAnalyzeAnswerAction({
          question: interviewData.questions[currentQuestionIndex].question,
          audioDataUri: base64Audio,
          resume: interviewData.resume,
          jobDescription: interviewData.jobDescription,
        });

        if (result.error) {
          toast({
            title: 'Analysis Error',
            description: result.error,
            variant: 'destructive',
          });
        } else if (result.feedback && result.transcribedText) {
          setCurrentFeedback(result.feedback);
          setUserAnswer(result.transcribedText);
          setPerformance([
            ...performance,
            {
              ...result.feedback,
              question: interviewData.questions[currentQuestionIndex].question,
              answer: result.transcribedText,
            },
          ]);
        }
      }
    });
  };

  const handleNextQuestion = () => {
    if (!interviewData) return;
    if (currentQuestionIndex < interviewData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      setCurrentFeedback(null);
      setShowSuggestedAnswer(false);
    } else {
      setFinished(true);
    }
  };

  if (!interviewData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    );
  }

  const currentQuestion = interviewData.questions[currentQuestionIndex];
  const progressValue =
    ((currentQuestionIndex + 1) / interviewData.questions.length) * 100;

  if (finished) {
    const averageScore =
      performance.reduce((acc, p) => acc + p.score, 0) / performance.length;
    return (
      <div className="container mx-auto max-w-3xl p-4 py-8">
        <h1 className="mb-2 font-headline text-4xl font-bold">
          Interview Complete!
        </h1>
        <p className="mb-8 text-muted-foreground">
          Here's your performance summary.
        </p>
        <Card className="mb-8 text-center">
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-7xl font-bold ${
                averageScore >= 75
                  ? 'text-green-500'
                  : averageScore >= 50
                  ? 'text-yellow-500'
                  : 'text-red-500'
              }`}
            >
              {Math.round(averageScore)}
              <span className="text-3xl text-muted-foreground">/100</span>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {performance.map((p, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Q: {p.question}
                  <Badge
                    variant={
                      p.score > 75
                        ? 'default'
                        : p.score > 50
                        ? 'secondary'
                        : 'destructive'
                    }
                    className="ml-4"
                  >
                    Score: {p.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                 <p className="text-sm italic text-muted-foreground">
                  Your answer: "{p.answer}"
                </p>
                <Separator />
                <p className="text-sm">{p.feedback}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/practice">
              <ArrowLeft className="mr-2 h-4 w-4" /> Practice Again
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 py-8">
      <Progress value={progressValue} className="mb-4" />
      <h1 className="mb-2 font-headline text-3xl font-bold">
        Question {currentQuestionIndex + 1} / {interviewData.questions.length}
      </h1>
      <p className="mb-6 text-xl text-muted-foreground">
        {currentQuestion.question}
      </p>

      <div className="space-y-6">
        <Card className="flex flex-col items-center justify-center p-6 text-center min-h-[200px]">
          {isRecording ? (
            <div className="flex flex-col items-center gap-4">
              <AudioLines className="h-16 w-16 text-primary animate-pulse" />
              <p className="text-muted-foreground">Recording your answer...</p>
              <Button onClick={stopRecording} variant="destructive">
                <StopCircle className="mr-2" /> Stop Recording
              </Button>
            </div>
          ) : userAnswer ? (
             <div className="text-left w-full space-y-4">
               <h3 className="font-semibold">Your transcribed answer:</h3>
               <p className="italic text-muted-foreground">"{userAnswer}"</p>
               <p className="text-sm">Now, submit for feedback or re-record.</p>
                <Button onClick={startRecording} variant="outline" disabled={isPending || !!currentFeedback}>
                  <Mic className="mr-2" /> Record Again
                </Button>
             </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Mic className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">Click below to start recording your answer.</p>
              <Button onClick={startRecording} disabled={isPending || !!currentFeedback}>
                <Mic className="mr-2" /> Start Recording
              </Button>
            </div>
          )}
        </Card>
        
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setShowSuggestedAnswer(!showSuggestedAnswer)}
          >
            {showSuggestedAnswer ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {showSuggestedAnswer ? 'Hide' : 'Show'} Suggested Answer
          </Button>
        </div>
        
        {showSuggestedAnswer && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Suggested Answer: </strong>
                {currentQuestion.suggestedAnswer}
              </p>
            </CardContent>
          </Card>
        )}

        {isPending && !currentFeedback && (
          <div className="flex flex-col items-center justify-center space-y-2 py-8">
            <BrainCircuit className="h-10 w-10 animate-pulse text-primary" />
            <p className="text-muted-foreground">
              Transcribing and analyzing your performance...
            </p>
          </div>
        )}

        {currentFeedback && (
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline">
                <p className="text-4xl font-bold">{currentFeedback.score}</p>
                <p className="text-lg text-muted-foreground">/100</p>
              </div>
              <Separator />
              <p className="text-sm">{currentFeedback.feedback}</p>
              <Button onClick={handleNextQuestion} className="w-full">
                {currentQuestionIndex === interviewData.questions.length - 1 ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finish & See Results
                  </>
                ) : (
                  <>
                    Next Question <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
