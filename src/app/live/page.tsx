'use client';

import { useState, useTransition } from 'react';
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
import { analyzeCodeAction } from './actions';
import { AlertCircle, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LivePage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeCodeQualityOutput | null>(null);

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

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
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
                {isPending && (
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
          <Alert className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How to Use in an Interview</AlertTitle>
            <AlertDescription>
              Arrange your windows side-by-side. Keep this browser window next to your Zoom, Teams, or coding environment. This allows for quick, discreet access to the co-pilot tools without screen sharing conflicts.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
