'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { AnalyzeCodeQualityOutput } from '@/ai/flows/analyze-code-quality';
import {
  analyzeCodeAction,
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
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeCodeQualityOutput | null>(null);

  // Stealth Mode State
  const [stealthMode, setStealthMode] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [stealthContent, setStealthContent] = useState<
    AnswerQuestionOutput | AnalyzeScreenOutput | null
  >(null);
  const [stealthTitle, setStealthTitle] = useState<string>('Co-pilot');

  const handleAnalyzeCode = () => {
    if (!code.trim()) {
      toast({
        title: 'No Code Provided',
        description: 'Please paste your code into the editor to analyze it.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const result = await analyzeCodeAction({ code, language });
      if (result.error) {
        toast({
          title: 'Analysis Failed',
          description: result.error,
          variant: 'destructive',
        });
        setAnalysisResult(null);
      } else {
        setAnalysisResult(result.analysis);
        toast({
          title: 'Analysis Complete',
          description: 'Your code quality report is ready.',
        });
      }
    });
  };

  const handleLaunchStealthMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false, // Audio capture via getDisplayMedia is less reliable for this use case
      });
      screenStreamRef.current = stream;
      setStealthMode(true);
      toast({
        title: 'Stealth Mode Activated',
        description: 'The overlay is now active. Share your screen in the interview.',
      });

      // Listen for when the user stops sharing
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
  }

  const onAnswerQuestion = (audioBlob: Blob) => {
    startTransition(async () => {
      setStealthContent(null);
      setStealthTitle('Answering Question...');

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
          screenStreamRef.current?.getTracks().forEach(track => track.stop());
      }
  }, [])

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      {stealthMode && (
        <StealthModeOverlayV2
          isOpen={stealthMode}
          onClose={handleStopStealthMode}
          title={stealthTitle}
          isLoading={isPending}
          onAnswerQuestion={onAnswerQuestion}
          onAnalyzeScreen={onAnalyzeScreen}
        >
          {stealthContent && 'summarizedQuestion' in stealthContent && (
            <div className="space-y-4">
              <h4 className="font-semibold">Summarized Question:</h4>
              <p className="text-muted-foreground">
                {stealthContent.summarizedQuestion}
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
              <p className="text-muted-foreground">
                {stealthContent.analysis}
              </p>
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

      <Tabs defaultValue="stealth-mode" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="stealth-mode">
            <Video className="mr-2 h-4 w-4" /> Stealth Mode
          </TabsTrigger>
          <TabsTrigger value="code-analyzer">
            <Terminal className="mr-2 h-4 w-4" /> Code Analyzer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stealth-mode">
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
                  Click "Launch Stealth Mode" below. When prompted by your
                  browser, choose to share your **Entire Screen**. This is
                  crucial. The overlay will appear on your screen but will be
                  **invisible** to others in your video call.
                </AlertDescription>
              </Alert>

              {!stealthMode ? (
                <Button
                  onClick={handleLaunchStealthMode}
                  disabled={isPending}
                  className="w-full"
                >
                  Launch Stealth Mode
                </Button>
              ) : (
                <Alert variant="default">
                  <AlertTitle>Stealth Mode is Active</AlertTitle>
                  <AlertDescription>
                    The overlay is now active. Use the controls within it. You can
                    close this message.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code-analyzer">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Code Analysis</CardTitle>
              <CardDescription>
                Paste your code from a technical challenge to get instant
                feedback on quality, efficiency, and best practices.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="csharp">C#</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                      <SelectItem value="rust">Rust</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code-editor">Your Code</Label>
                  <Textarea
                    id="code-editor"
                    placeholder="Paste your code here..."
                    className="min-h-[300px] resize-y font-mono text-sm"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAnalyzeCode}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending && <LoadingSpinner className="mr-2" />}
                  Analyze Code
                </Button>
              </div>
              <div className="flex flex-col">
                {isPending && !stealthMode && (
                  <div className="flex flex-1 flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed bg-muted/50">
                    <LoadingSpinner className="h-8 w-8 text-primary" />
                    <p className="text-muted-foreground">Analyzing...</p>
                  </div>
                )}
                {!isPending && !analysisResult && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
                    <p className="text-muted-foreground">
                      Your code analysis will appear here.
                    </p>
                  </div>
                )}
                {analysisResult && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span>Quality Score</span>
                          <Badge
                            variant={
                              analysisResult.qualityScore > 80
                                ? 'default'
                                : analysisResult.qualityScore > 60
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {analysisResult.qualityScore} / 100
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Correctness Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {analysisResult.correctnessAnalysis}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Efficiency Suggestions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {analysisResult.efficiencySuggestions}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Best Practices
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {analysisResult.bestPractices}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
