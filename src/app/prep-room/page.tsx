
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Paperclip, FileText, User, Bot, UploadCloud, BrainCircuit, MessageSquare, Send } from 'lucide-react';

export default function PrepRoom() {
  const { toast } = useToast();
  const [resume, setResume] = useState<File | null>(null);
  const [jd, setJd] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [preparationStatus, setPreparationStatus] = useState('Upload documents to begin');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!resume || !jd) {
      toast({
        title: 'Missing Documents',
        description: 'Please upload both your resume and the job description.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setAnalysis('');
    setChatMessages([]);
    setPreparationStatus('Analyzing documents...');
    setPreparationProgress(10);

    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('jd', jd);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setPreparationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);

      const response = await fetch('/api/analyze-documents', {
        method: 'POST',
        body: formData,
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
          <CardTitle>Preparation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={preparationProgress} className="mb-2" />
          <p className="text-sm text-muted-foreground">{preparationStatus}</p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel: Upload and Analysis */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UploadCloud /> Upload Documents</CardTitle>
                    <CardDescription>Provide your resume and the job description.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="resume-upload" className="flex items-center gap-2"><FileText /> Resume (PDF, DOCX)</Label>
                        <Input id="resume-upload" type="file" accept=".pdf,.docx" onChange={(e) => handleFileChange(e, setResume)} />
                        {resume && <p className="text-xs text-muted-foreground truncate"><Paperclip className="inline mr-1 h-3 w-3"/>{resume.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="jd-upload" className="flex items-center gap-2"><FileText /> Job Description (PDF, DOCX, TXT)</Label>
                        <Input id="jd-upload" type="file" accept=".pdf,.docx,.txt" onChange={(e) => handleFileChange(e, setJd)} />
                        {jd && <p className="text-xs text-muted-foreground truncate"><Paperclip className="inline mr-1 h-3 w-3"/>{jd.name}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAnalyze} disabled={!resume || !jd || isLoading} className="w-full">
                        {isLoading ? <LoadingSpinner className="mr-2" /> : <BrainCircuit />}
                        {isLoading ? 'Analyzing...' : 'Analyze Documents'}
                    </Button>
                </CardFooter>
            </Card>

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
        
        {/* Right Panel: Chat Interface */}
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
                      <p>Upload and analyze your documents to start the conversation.</p>
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
                  placeholder={analysis ? "Ask for clarification or a mock question..." : "Analyze documents to enable chat"}
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
      
      {/* Quick Action Buttons */}
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
