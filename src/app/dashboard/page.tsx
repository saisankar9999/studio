
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mic, Video, Trash2, PlusCircle, CheckCircle, Upload } from 'lucide-react';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromFileAction } from './actions';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const [newProfileName, setNewProfileName] = useState('');
  const [newResume, setNewResume] = useState('');
  const [newResumeFileName, setNewResumeFileName] = useState('');
  const [newJd, setNewJd] = useState('');
  
  const [isPending, startTransition] = useTransition();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  
  // Load profiles from local storage on mount
  useEffect(() => {
    try {
      const savedProfiles = localStorage.getItem('interviewProfiles');
      const savedSelectedId = localStorage.getItem('selectedProfileId');
      if (savedProfiles) {
        setProfiles(JSON.parse(savedProfiles));
      }
      if (savedSelectedId) {
        setSelectedProfileId(JSON.parse(savedSelectedId));
      }
    } catch (error) {
      console.error("Failed to load profiles from local storage", error);
      toast({
        title: "Error",
        description: "Could not load your saved profiles.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Save profiles to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('interviewProfiles', JSON.stringify(profiles));
      if (selectedProfileId) {
        localStorage.setItem('selectedProfileId', JSON.stringify(selectedProfileId));
      } else {
        localStorage.removeItem('selectedProfileId');
      }
    } catch (error) {
      console.error("Failed to save profiles to local storage", error);
    }
  }, [profiles, selectedProfileId]);
  
  const handleResumeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewResumeFileName(file.name);
      startTransition(async () => {
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
              const dataUri = e.target?.result as string;
              const result = await extractTextFromFileAction({ fileDataUri: dataUri, mimeType: file.type });
              if (result.error) {
                  toast({
                    title: "Error Parsing File",
                    description: result.error,
                    variant: "destructive",
                  });
                  setNewResumeFileName('');
              } else {
                  setNewResume(result.text ?? '');
                  toast({
                      title: "Resume Uploaded",
                      description: `${file.name} was successfully parsed.`
                  })
              }
            };
        } catch (error) {
             toast({
                title: "Error Reading File",
                description: "There was a problem reading the selected file.",
                variant: "destructive",
              });
             setNewResumeFileName('');
        }
      });
    }
  };
  
  const handleAddProfile = () => {
    if (!newProfileName || !newResume || !newJd) {
      toast({
        title: "Missing Information",
        description: "Please fill out all fields to create a profile.",
        variant: "destructive"
      });
      return;
    }
    if (profiles.length >= 10) {
       toast({
        title: "Profile Limit Reached",
        description: "You can only store up to 10 profiles.",
        variant: "destructive"
      });
      return;
    }

    const newProfile: Profile = {
      id: Date.now().toString(),
      name: newProfileName,
      resume: newResume,
      jobDescription: newJd
    };

    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    setSelectedProfileId(newProfile.id);

    // Clear form
    setNewProfileName('');
    setNewResume('');
    setNewResumeFileName('');
    setNewJd('');
    if(resumeInputRef.current) {
        resumeInputRef.current.value = '';
    }
    
    toast({
      title: "Profile Created!",
      description: `"${newProfile.name}" has been saved and selected.`,
    })
  };

  const handleDeleteProfile = (id: string) => {
    const updatedProfiles = profiles.filter(p => p.id !== id);
    setProfiles(updatedProfiles);
    if (selectedProfileId === id) {
      setSelectedProfileId(null);
    }
     toast({
      title: "Profile Deleted",
    })
  };
  
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  
  const practiceLink = selectedProfile 
    ? `/practice?profile=${selectedProfileId}` 
    : '/practice';
    
  const liveLink = selectedProfile 
    ? `/live?profile=${selectedProfileId}`
    : '/live';


  return (
    <div className="container mx-auto max-w-5xl p-4 py-8">
      <div className="text-center">
        <h1 className="mb-2 font-headline text-4xl font-bold">
          Welcome to AceTheInterview
        </h1>
        <p className="mb-12 text-lg text-muted-foreground">
          Your AI-powered toolkit for interview success. Save a profile below or choose a mode to get started.
        </p>
      </div>
      
      {/* Profile Management Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Job Profiles</CardTitle>
          <CardDescription>Save and manage your resumes and job descriptions. Select one to use it in practice or live modes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold">Create New Profile</h3>
             <div className="space-y-2">
                <Label htmlFor="profileName">Profile Name (e.g., Google SWE)</Label>
                <Input id="profileName" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="Google SWE Interview" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="resume">Resume</Label>
                 <input
                    type="file"
                    ref={resumeInputRef}
                    onChange={handleResumeFileChange}
                    className="hidden"
                    accept=".txt,.pdf,.docx"
                  />
                <Textarea id="resume" value={newResume} onChange={(e) => setNewResume(e.target.value)} placeholder="Paste your resume text here, or upload a file..." className="min-h-[100px]" />
                <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={isPending}
                  >
                    {isPending ? <LoadingSpinner className="mr-2" /> : <Upload />}
                    {newResumeFileName || 'Upload .txt, .pdf, or .docx'}
                 </Button>
             </div>
             <div className="space-y-2">
                <Label htmlFor="jd">Job Description</Label>
                <Textarea id="jd" value={newJd} onChange={(e) => setNewJd(e.target.value)} placeholder="Paste the job description here..." className="min-h-[100px]" />
             </div>
             <Button onClick={handleAddProfile} className="w-full" disabled={isPending}>
                <PlusCircle /> Save Profile
             </Button>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Saved Profiles ({profiles.length}/10)</h3>
            <div className="space-y-2 rounded-lg border p-2 min-h-[200px]">
              {profiles.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground p-4">No profiles saved yet.</p>
              ) : (
                profiles.map(profile => (
                  <div key={profile.id} className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/50">
                    <span className="font-medium truncate">{profile.name}</span>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant={selectedProfileId === profile.id ? "secondary" : "outline"}
                        onClick={() => setSelectedProfileId(profile.id)}
                      >
                       {selectedProfileId === profile.id && <CheckCircle className="text-green-500" />}
                       {selectedProfileId === profile.id ? 'Selected' : 'Select'}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteProfile(profile.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
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
              <Link href={practiceLink}>
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
              <Link href={liveLink}>
                Launch Live Co-pilot <ArrowRight />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

    