
"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Paperclip, FileText, User, Bot, UploadCloud, BrainCircuit, MessageSquare, Send } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

function PrepRoomContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [preparationStatus, setPreparationStatus] = useState('Select a profile from the dashboard to begin.');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const profileId = searchParams.get('profile');
    if (!profileId) {
      toast({
        title: "No Profile Selected",
        description: "Please go back to the dashboard and select a profile.",
        variant: "destructive"
      });
      router.push('/dashboard');
      return;
    }

    try {
      const savedProfiles = localStorage.getItem('interviewProfiles');
      if (savedProfiles) {
        const profiles: Profile[] = JSON.parse(savedProfiles);
        const selectedProfile = profiles.find(p => p.id === profileId);
        if (selectedProfile) {
          setProfile(selectedProfile);
          setPreparationStatus(`Profile "${selectedProfile.name}" loaded. Click "Analyze" to start.`);
          setPreparationProgress(5);
        } else {
          throw new Error("Profile not found.");
        }
      } else {
        throw new Error("No profiles saved.");
      }
    } catch (error) {
      toast({
        title: 'Error loading profile',
        description: 'Could not find the selected profile. Please try again.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleAnalyze = async () => {
    if (!profile) {
      toast({
        title: 'No Profile Loaded',
        description: 'Please select a profile from the dashboard first.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setAnalysis('');
    setChatMessages([]);
    setPreparationStatus('Analyzing documents...');
    setPreparationProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setPreparationProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/analyze-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: profile.resume,
          jdText: profile.jobDescription,
        }),
      });

      clearInterval(progressInterval);
      setPreparationProgress(95);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze documents');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setPreparationProgress(100);
      setPreparationStatus('Analysis complete! Ready for preparation.');
      
      setChatMessages([
        { role: 'assistant', content: 'Welcome to your personalized interview preparation room! I\'ve analyzed your resume and the job description. Let\'s get you 100% ready for this interview. What would you like to focus on first?' },
      ]);

      toast({
        title: 'Analysis Complete!',
        description: 'You can now start your interactive prep session.'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error analyzing documents:', error);
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      setPreparationStatus(`Error: ${errorMessage}`);
      setPreparationProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const newMessage = { role: 'user', content: inputMessage };
    setChatMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/prep-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, newMessage],
          resumeAnalysis: analysis,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from the assistant.');
      }

      const data = await response.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error sending message:', error);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-headline">Interview Prep Room</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your AI-powered space to get ready for the big day.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{profile ? `Preparing with: ${profile.name}` : "Preparation Progress"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={preparationProgress} className="mb-2" />
          <p className="text-sm text-muted-foreground">{preparationStatus}</p>
        </CardContent>
        {profile && !analysis && (
          <CardFooter>
            <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
                {isLoading ? <LoadingSpinner className="mr-2" /> : <BrainCircuit />}
                {isLoading ? 'Analyzing...' : 'Analyze Profile'}
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 rounded-md border p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{analysis}</div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
        </div>
        
        <div className="lg:col-span-3">
          <Card className="flex flex-col h-full min-h-[70vh]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare /> Interactive Prep Assistant</CardTitle>
            </CardHeader>
            <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-muted/50 rounded-t-lg">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <BrainCircuit className="h-12 w-12 mb-4" />
                      <p>{profile ? "Click 'Analyze Profile' to begin." : "Loading profile..."}</p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                        <div className={`rounded-lg p-3 max-w-[85%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          <div className="prose prose-sm dark:prose-invert max-w-none">{message.content}</div>
                        </div>
                         {message.role === 'user' && <User className="h-6 w-6 flex-shrink-0" />}
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex items-start gap-3">
                      <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                      <div className="rounded-lg p-3 bg-secondary">
                        <LoadingSpinner />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 border-t">
              <div className="relative w-full">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={analysis ? "Ask for clarification or a mock question..." : "Analyze your profile to enable chat"}
                  className="pr-20 min-h-[50px] resize-none"
                  rows={2}
                  disabled={isChatLoading || !analysis}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isChatLoading || !analysis}
                  className="absolute right-2 bottom-2"
                  size="icon"
                >
                  <Send />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Use these prompts to guide your preparation.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" onClick={() => setInputMessage("Explain the key technologies mentioned in the job description")} disabled={!analysis}>Key Technologies</Button>
          <Button variant="outline" onClick={() => setInputMessage("What are the most important skills from my resume I should highlight?")} disabled={!analysis}>Highlight My Skills</Button>
          <Button variant="outline" onClick={() => setInputMessage("Give me a mock behavioral question related to this role.")} disabled={!analysis}>Behavioral Questions</Button>
          <Button variant="outline" onClick={() => setInputMessage("Help me formulate a question to ask the interviewer.")} disabled={!analysis}>Questions for Them</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PrepRoomPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PrepRoomContent />
    </Suspense>
  )
}
