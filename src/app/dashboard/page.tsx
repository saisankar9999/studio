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
    <div className="container mx-auto max-w-7xl p-4 py-8">
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
                <Textarea id="resume" value={newResume} onChange={(e) => setNewResume(e.target.value)} placeholder="Paste your resume here..." className="min-h-[100px]" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="jd">Job Description</Label>
                <Textarea id="jd" value={newJd} onChange={(e) => setNewJd(e.target.value)} placeholder="Paste the job description here..." className="min-h-[100px]" />
             </div>
             <Button onClick={handleAddProfile} className="w-full">
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
      
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Prep Room</CardTitle>
            <CardDescription>Get a personalized plan and chat with an AI mentor.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                Generate a "fast track" interview prep plan based on your profile. Chat with an AI assistant to clarify doubts and deepen your understanding, just like talking to a real mentor.
              </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={prepLink}>
                Enter Prep Room <ArrowRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/20">
                <Mic className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardTitle>Practice Interview</CardTitle>
            <CardDescription>Run a mock interview and get instant feedback.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                Use your profile to generate tailored questions. Practice your answers by recording them and receive AI-powered feedback on your performance and delivery.
              </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="secondary">
              <Link href={practiceLink}>
                Start Practice <ArrowRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Video className="h-6 w-6 text-accent" />
            </div>
            <CardTitle>Live Interview Co-pilot</CardTitle>
            <CardDescription>Get discreet, real-time assistance during calls.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                Launch a discreet assistant during live interviews. The co-pilot listens and provides grounded, real-time answer suggestions based on your profile and prep sessions.
              </p>
          </CardContent>
           <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href={liveLink}>
                Launch Live Co-pilot <ArrowRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
