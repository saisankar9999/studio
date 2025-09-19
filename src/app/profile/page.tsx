
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getUserProfiles, deleteProfile } from '@/lib/firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Profile {
  id: string;
  name: string;
  resume: string;
  jobDescription: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchProfiles() {
      if (session?.user?.id) {
        setIsLoading(true);
        try {
          const userProfiles = await getUserProfiles(session.user.id);
          setProfiles(userProfiles);
        } catch (error) {
          console.error("Failed to load profiles from Firestore", error);
          toast({
            title: "Error",
            description: "Could not load your saved profiles.",
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

  const handleDeleteProfile = async (id: string) => {
    if (!session?.user?.id) return;
    try {
        await deleteProfile(session.user.id, id);
        const updatedProfiles = profiles.filter(p => p.id !== id);
        setProfiles(updatedProfiles);
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
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 py-8">
      <h1 className="mb-8 font-headline text-4xl font-bold">Your Profile</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
           <Avatar className="h-16 w-16">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback>{session?.user?.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{session?.user?.name || 'User'}</p>
            <p className="text-muted-foreground">{session?.user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Job Profiles</CardTitle>
          <CardDescription>
            You have {profiles.length} saved profile(s). You can manage them here or on the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground p-4">No profiles saved yet. Go to the dashboard to create one.</p>
            ) : (
                profiles.map(profile => (
                  <div key={profile.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <h3 className="font-semibold">{profile.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{profile.jobDescription}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button size="icon" variant="destructive">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{profile.name}" profile. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteProfile(profile.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
