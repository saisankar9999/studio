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
import { analyzeCodeAction, answerQuestionAction, analyzeScreenAction } from './actions';
import { AlertCircle, Terminal, Mic, Video, StopCircle, ScanScreen } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StealthModeOverlay } from '@/components/common/StealthModeOverlay';
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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [stealthContent, setStealthContent] = useState<AnswerQuestionOutput | AnalyzeScreenOutput | null>(null);
  const [stealthTitle, setStealthTitle] = useState<string>('');
  
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
  
  const getPermissions = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(audioStream);
      toast({ title: 'Microphone access granted.' });
      return audioStream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please enable microphone permissions in your browser.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const startRecording = async () => {
    let stream = mediaStream;
    if (!stream) {
      stream = await getPermissions();
    }
    
    if (stream) {
      setIsRecording(true);
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
      toast({ title: 'Recording started...' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        handleAnswerQuestion(audioBlob);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Recording stopped. Analyzing...' });
    }
  };

  const handleAnswerQuestion = (audioBlob: Blob) => {
    startTransition(async () => {
      setStealthContent(null);
      setStealthTitle('Answering Question...');
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        // You'll need resume and job description. For now, let's pull from local storage if available.
        const interviewData = JSON.parse(localStorage.getItem('interviewData') || '{}');
        
        const result = await answerQuestionAction({
          audioDataUri: base64Audio,
          resume: interviewData.resume || 'No resume provided.',
          jobDescription: interviewData.jobDescription || 'No job description provided.',
        });
        
        if(result.error) {
          toast({ title: 'Error answering question', description: result.error, variant: 'destructive' });
          setStealthTitle('Error');
        } else {
          setStealthContent(result.answer);
          setStealthTitle('Generated Answer');
        }
      };
    });
  };

  const handleAnalyzeScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);

      // Give user a moment to switch to the right window
      setTimeout(async () => {
        const videoTrack = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(videoTrack);
        const bitmap = await imageCapture.grabFrame();
        
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        context?.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
        
        const screenshotDataUri = canvas.toDataURL('image/png');

        // Stop sharing screen immediately
        stream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        
        toast({ title: "Screen captured! Analyzing..." });
        
        startTransition(async () => {
          setStealthContent(null);
          setStealthTitle('Analyzing Screen...');
          const result = await analyzeScreenAction({ screenshotDataUri });
          if(result.error) {
            toast({ title: 'Error analyzing screen', description: result.error, variant: 'destructive' });
            setStealthTitle('Error');
          } else {
            setStealthContent(result.analysis);
            setStealthTitle('Screen Analysis');
          }
        });

      }, 500);

    } catch (error) {
      console.error("Error capturing screen:", error);
      toast({ title: 'Screen Capture Failed', description: 'Could not capture the screen.', variant: 'destructive' });
    }
  };
  
  useEffect(() => {
    return () => {
      mediaStream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
    }
  }, [mediaStream, screenStream]);

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      {stealthMode && (
         <StealthModeOverlay 
           isOpen={stealthMode} 
           onClose={() => setStealthMode(false)}
           title={stealthTitle}
           isLoading={isPending}
         >
           {stealthContent && 'summarizedQuestion' in stealthContent && (
             <div className="space-y-4">
               <h4 className="font-semibold">Summarized Question:</h4>
               <p className="text-muted-foreground">{stealthContent.summarizedQuestion}</p>
               <h4 className="font-semibold">Suggested Answer:</h4>
               <p className="text-muted-foreground">{stealthContent.answer}</p>
             </div>
           )}
           {stealthContent && 'analysis' in stealthContent && (
             <div className="space-y-4">
               <h4 className="font-semibold">Analysis:</h4>
               <p className="text-muted-foreground">{stealthContent.analysis}</p>
                <h4 className="font-semibold">Suggestion:</h4>
               <p className="text-muted-foreground">{stealthContent.suggestion}</p>
             </div>
           )}
         </StealthModeOverlay>
      )}

      <h1 className="mb-2 font-headline text-4xl font-bold">
        Live Interview Co-pilot
      </h1>
      <p className="mb-8 text-muted-foreground">
        Discreet tools to help you shine during your live interview.
      </p>

      <Tabs defaultValue="code-analyzer" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:w-[400px]">
          <TabsTrigger value="code-analyzer">
            <Terminal className="mr-2 h-4 w-4" /> Code Analyzer
          </TabsTrigger>
          <TabsTrigger value="stealth-mode">
            <Video className="mr-2 h-4 w-4" /> Stealth Mode
          </TabsTrigger>
        </TabsList>
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
                    <p className="text-muted-foreground">
                      Analyzing...
                    </p>
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
                          <Badge variant="secondary">
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
                    When your interview starts, share your **entire screen**, not just the browser window. Then, activate Stealth Mode. You can drag the overlay to position it conveniently over your meeting window. The overlay will not be visible to others.
                  </AlertDescription>
                </Alert>

                {!stealthMode ? (
                  <Button onClick={() => setStealthMode(true)} className="w-full">Launch Stealth Mode</Button>
                ): (
                   <Alert variant="default">
                      <AlertTitle>Stealth Mode is Active</AlertTitle>
                      <AlertDescription>
                        The overlay is now active. Use the controls within the overlay. You can close this message.
                      </AlertDescription>
                   </Alert>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Question Answering</Label>
                    <p className="text-sm text-muted-foreground">Record the interviewer's question to get a generated answer.</p>
                     {!isRecording ? (
                      <Button onClick={startRecording} disabled={!stealthMode || isPending} className="w-full">
                        <Mic className="mr-2" /> Start Recording
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} disabled={!stealthMode || isPending} className="w-full" variant="destructive">
                        <StopCircle className="mr-2" /> Stop Recording
                      </Button>
                    )}
                  </div>
                   <div className="space-y-2">
                    <Label>Screen Analysis</Label>
                    <p className="text-sm text-muted-foreground">Capture your screen to analyze code or text from the interview.</p>
                    <Button onClick={handleAnalyzeScreen} disabled={!stealthMode || isPending} className="w-full">
                      <ScanScreen className="mr-2" /> Analyze Screen
                    </Button>
                  </div>
                </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Alert className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important Note for Live Interviews</AlertTitle>
        <AlertDescription>
          When screen sharing, always choose to share your **entire screen** or desktop. Do NOT share just the browser window, as this will prevent the stealth overlay from working correctly. Arrange your windows side-by-side for discreet access.
        </AlertDescription>
      </Alert>
    </div>
  );
}

    