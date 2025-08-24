import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mic, Video } from 'lucide-react';
import Image from 'next/image';

export default function DashboardPage() {
  return (
    <div className="container mx-auto max-w-5xl p-4 py-8">
      <div className="text-center">
        <h1 className="mb-2 font-headline text-4xl font-bold">
          Welcome to AceTheInterview
        </h1>
        <p className="mb-12 text-lg text-muted-foreground">
          Your AI-powered toolkit for interview success. Choose a mode below to get started.
        </p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Mic className="h-6 w-6 text-primary" />
               </div>
               <div>
                <CardTitle>Practice Interview</CardTitle>
                <CardDescription>Generate tailored questions and run a mock interview.</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
              <Image 
                src="https://placehold.co/600x400.png" 
                alt="Practice interview illustration" 
                width={600} 
                height={400} 
                className="rounded-lg object-cover"
                data-ai-hint="interview preparation"
              />
              <p className="text-sm text-muted-foreground">
                Upload your resume and the job description to get a list of 20 personalized interview questions. Then, enter a mock interview session where you can practice your answers and get instant AI feedback on your performance.
              </p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button asChild className="w-full">
              <Link href="/practice">
                Start Practice <ArrowRight />
              </Link>
            </Button>
          </div>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Video className="h-6 w-6 text-accent" />
               </div>
               <div>
                <CardTitle>Live Interview Co-pilot</CardTitle>
                <CardDescription>Get discreet, real-time assistance during your calls.</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
               <Image 
                src="https://placehold.co/600x400.png" 
                alt="Live interview copilot illustration" 
                width={600} 
                height={400} 
                className="rounded-lg object-cover"
                data-ai-hint="video conference call"
               />
              <p className="text-sm text-muted-foreground">
                Launch a discreet, undetectable overlay during your live interviews on Zoom or Teams. Use keyboard shortcuts to transcribe the interviewer's question and get a perfectly formulated answer in real-time.
              </p>
          </CardContent>
           <div className="p-6 pt-0">
            <Button asChild className="w-full" variant="secondary">
              <Link href="/live">
                Launch Live Co-pilot <ArrowRight />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
