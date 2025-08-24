'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle,
  BrainCircuit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { GenerateInterviewQuestionsOutput } from '@/ai/flows/generate-interview-questions';
import type { AnalyzeInterviewPerformanceOutput } from '@/ai/flows/analyze-interview-performance';
import { analyzeAnswerAction } from './actions';
import Link from 'next/link';

interface InterviewData {
  questions: GenerateInterviewQuestionsOutput;
  resume: string;
  jobDescription: string;
}

type PerformanceResult = AnalyzeInterviewPerformanceOutput & { question: string };

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
  }, [router, toast]);

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      toast({
        title: 'Empty Answer',
        description: 'Please provide an answer before submitting.',
        variant: 'destructive',
      });
      return;
    }
    if (!interviewData) return;

    startTransition(async () => {
      setCurrentFeedback(null);
      const result = await analyzeAnswerAction({
        question: interviewData.questions[currentQuestionIndex].question,
        answer: userAnswer,
        resume: interviewData.resume,
        jobDescription: interviewData.jobDescription,
      });

      if (result.error) {
        toast({
          title: 'Analysis Error',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.feedback) {
        setCurrentFeedback(result.feedback);
        setPerformance([
          ...performance,
          {
            ...result.feedback,
            question: interviewData.questions[currentQuestionIndex].question,
          },
        ]);
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
              <CardContent>
                <p className="text-sm text-muted-foreground">{p.feedback}</p>
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
        <div>
          <Label htmlFor="user-answer" className="text-lg">
            Your Answer
          </Label>
          <Textarea
            id="user-answer"
            placeholder="Type your answer here... In a real interview, you'd be speaking, but for this practice, let's write it down."
            className="mt-2 min-h-[150px]"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={!!currentFeedback}
          />
        </div>

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
          {!currentFeedback && (
            <Button onClick={handleSubmitAnswer} disabled={isPending}>
              {isPending && <LoadingSpinner className="mr-2" />}
              Submit Answer
            </Button>
          )}
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
              Analyzing your performance...
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
