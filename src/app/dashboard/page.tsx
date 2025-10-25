'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mic, Video, Trash2, PlusCircle, CheckCircle, BrainCircuit, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { addProfile, deleteProfile, getUserProfiles } from '@/lib/firebase/firestore';


interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newProfileName, setNewProfileName] = useState('');
  const [newResume, setNewResume] = useState('');
  const [newJd, setNewJd] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch profiles from Firestore on mount
  useEffect(() => {
    async function fetchProfiles() {
      if (session?.user?.id) {
        setIsLoading(true);
        try {
          const userProfiles = await getUserProfiles(session.user.id);
          setProfiles(userProfiles);
          
          const savedSelectedId = localStorage.getItem('selectedProfileId');
          if (savedSelectedId && userProfiles.some(p => p.id === savedSelectedId)) {
             setSelectedProfileId(savedSelectedId);
          } else if (userProfiles.length > 0) {
             setSelectedProfileId(userProfiles[0].id);
          }

        } catch (error) {
          console.error("Failed to load profiles from Firestore", error);
          toast({
            title: "Error",
            description: "Could not load your saved profiles from the database.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
    }
    if (status === 'authenticated') {
      fetchProfiles();
    }
  }, [session, status, toast]);

  // Save selected profile ID to local storage
   useEffect(() => {
    if (selectedProfileId) {
      localStorage.setItem('selectedProfileId', selectedProfileId);
    } else {
      localStorage.removeItem('selectedProfileId');
    }
  }, [selectedProfileId]);
  
  const handleAddProfile = async () => {
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
    if (!session?.user?.id) {
       toast({
        title: "Authentication Error",
        description: "You must be logged in to create a profile.",
        variant: "destructive"
      });
      return;
    }

    try {
        const newProfileData = {
            name: newProfileName,
            resume: newResume,
            jobDescription: newJd
        };
        const newProfile = await addProfile(session.user.id, newProfileData);

        const updatedProfiles = [...profiles, newProfile];
        setProfiles(updatedProfiles);
        setSelectedProfileId(newProfile.id);

        // Clear form
        setNewProfileName('');
        setNewResume('');
        setNewJd('');
        
        toast({
        title: "Profile Created!",
        description: `"${newProfile.name}" has been saved and selected.`,
        });
    } catch (error) {
        console.error("Error adding profile:", error);
        toast({
            title: "Error",
            description: "Could not save your profile to the database.",
            variant: "destructive"
        });
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!session?.user?.id) return;
    try {
        await deleteProfile(session.user.id, id);
        const updatedProfiles = profiles.filter(p => p.id !== id);
        setProfiles(updatedProfiles);
        if (selectedProfileId === id) {
             setSelectedProfileId(updatedProfiles.length > 0 ? updatedProfiles[0].id : null);
        }
        toast({
            title: "Profile Deleted",
        });
    } catch (error) {
         console.error("Error deleting profile:", error);
        toast({
            title: "Error",
            description: "Could not delete the profile.",
            variant: "destructive"
        });
    }
  };
  
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    
  const practiceLink = selectedProfile 
    ? `/practice?profile=${selectedProfileId}` 
    : '/practice';

  const prepLink = selectedProfile
    ? `/prep?profile=${selectedProfileId}`
    : '/prep';
    
  const liveLink = selectedProfile 
    ? `/live?profile=${selectedProfileId}`
    : '/live';

  return (
    <div className="container mx-auto max-w-6xl p-4 py-12 md:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
          Welcome to AceTheInterview
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Your AI-powered toolkit for interview success. Create or select a job profile, then choose a mode to begin your preparation.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left column for actions */}
        <div className="lg:col-span-3 space-y-8">
            <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader>
                <CardTitle className="text-2xl">Start Here</CardTitle>
                <CardDescription>First, create a profile with your resume and a job description. Then, select it from the list.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="profileName">Profile Name (e.g., Google SWE)</Label>
                        <Input id="profileName" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="Google Senior SWE Interview" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="resume">Your Resume</Label>
                            <Textarea id="resume" value={newResume} onChange={(e) => setNewResume(e.target.value)} placeholder="Paste your resume here..." className="min-h-[150px]" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jd">Job Description</Label>
                            <Textarea id="jd" value={newJd} onChange={(e) => setNewJd(e.target.value)} placeholder="Paste the job description here..." className="min-h-[150px]" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAddProfile} size="lg" className="w-full">
                        <PlusCircle /> Save Profile
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Saved Profiles ({profiles.length}/10)</CardTitle>
                    <CardDescription>Select a profile to use in the Prep, Practice, or Live modes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                    {profiles.length === 0 ? (
                        <div className="flex items-center justify-center text-sm text-muted-foreground rounded-lg border-2 border-dashed h-24">
                            <p>No profiles saved yet.</p>
                        </div>
                    ) : (
                        profiles.map(profile => (
                        <div key={profile.id} className={`flex items-center justify-between gap-2 rounded-lg p-3 border transition-colors ${selectedProfileId === profile.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}>
                            <span className="font-medium truncate">{profile.name}</span>
                            <div className="flex items-center gap-2">
                            <Button 
                                size="sm" 
                                variant={selectedProfileId === profile.id ? "default" : "secondary"}
                                onClick={() => setSelectedProfileId(profile.id)}
                            >
                            {selectedProfileId === profile.id && <CheckCircle />}
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
                </CardContent>
            </Card>
        </div>

        {/* Right column for modes */}
        <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-24">
            <Card className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <BrainCircuit className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Prep Room</CardTitle>
                            <CardDescription>Personalized plan & AI mentor</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">
                        Generate a "fast track" study plan and chat with an AI assistant to deepen your understanding.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" disabled={!selectedProfile}>
                    <Link href={prepLink}>
                        Enter Prep Room <ArrowRight />
                    </Link>
                    </Button>
                </CardFooter>
            </Card>

            <Card className="flex flex-col hover:border-secondary/80 transition-colors">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/20">
                            <Mic className="h-6 w-6 text-secondary-foreground" />
                        </div>
                        <div>
                            <CardTitle>Practice Interview</CardTitle>
                            <CardDescription>Mock interview & instant feedback</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">
                        Run a mock interview with tailored questions. Record your answers and get AI-powered feedback.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" variant="secondary" disabled={!selectedProfile}>
                    <Link href={practiceLink}>
                        Start Practice <ArrowRight />
                    </Link>
                    </Button>
                </CardFooter>
            </Card>
            
            <Card className="flex flex-col hover:border-accent/50 transition-colors">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                            <Video className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                            <CardTitle>Live Interview Co-pilot</CardTitle>
                            <CardDescription>Real-time, discreet assistance</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">
                       Get real-time, grounded answer suggestions during your live video interviews.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" variant="outline" disabled={!selectedProfile}>
                    <Link href={liveLink}>
                        Launch Live Co-pilot <ArrowRight />
                    </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
