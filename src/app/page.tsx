import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Mic, Video } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto flex h-full flex-col items-center justify-center p-4 text-center">
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-6xl">
          AceTheInterview
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Your personal AI co-pilot to help you land your dream job. Practice
          with tailored questions or get real-time assistance during live
          interviews.
        </p>
      </header>

      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <Link href="/practice" className="group">
          <Card className="h-full transform-gpu transition-all duration-300 ease-in-out group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-primary/20">
            <CardHeader>
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <Mic className="h-10 w-10" />
                </div>
              </div>
              <CardTitle className="font-headline text-2xl">
                Practice Interview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Upload your resume and job description to generate tailored
                questions. Then, start a mock interview to get AI-powered
                feedback on your answers.
              </p>
              <div className="flex items-center justify-center font-semibold text-primary">
                Start Practicing
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/live" className="group">
          <Card className="h-full transform-gpu transition-all duration-300 ease-in-out group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-accent/20">
            <CardHeader>
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-accent/10 p-4 text-accent">
                  <Video className="h-10 w-10" />
                </div>
              </div>
              <CardTitle className="font-headline text-2xl">
                Live Interview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Get discreet, real-time assistance during your online
                interviews. Includes a powerful code analyzer for technical
                rounds on platforms like Zoom or Teams.
              </p>
              <div className="flex items-center justify-center font-semibold text-accent">
                Go Live
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <footer className="mt-16 text-sm text-muted-foreground">
        <p>Built for speed and discretion. Your secret weapon in interviews.</p>
      </footer>
    </div>
  );
}
