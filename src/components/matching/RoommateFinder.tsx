'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, MessageSquare } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal } from 'lucide-react';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { Badge } from '../ui/badge';
import { collection, doc, getDoc, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface MatchResult extends UserProfile {
    compatibilityScore: number;
}

export function RoommateFinder() {
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<MatchResult[] | null>(null);
  const { toast } = useToast();
  const { user, profile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const { data: potentialRoommates, loading: roommatesLoading } = useCollection<UserProfile>(
    'users',
    [where('role', '==', 'student')]
  );

  const calculateCompatibility = (currentUserProfile: UserProfile, otherUserProfile: UserProfile): number => {
    if (!currentUserProfile.interests && !currentUserProfile.skills) return 0;

    const currentUserInterests = new Set((currentUserProfile.interests || '').toLowerCase().split(',').map(i => i.trim()).filter(Boolean));
    const otherUserInterests = new Set((otherUserProfile.interests || '').toLowerCase().split(',').map(i => i.trim()).filter(Boolean));

    const currentUserSkills = new Set((currentUserProfile.skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));
    const otherUserSkills = new Set((otherUserProfile.skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));

    if (currentUserInterests.size === 0 && currentUserSkills.size === 0) return 0;

    const commonInterests = [...currentUserInterests].filter(interest => otherUserInterests.has(interest));
    const commonSkills = [...currentUserSkills].filter(skill => otherUserSkills.has(skill));

    const totalPossibleMatches = currentUserInterests.size + currentUserSkills.size;
    const totalCommonItems = commonInterests.length + commonSkills.length;
    
    if (totalPossibleMatches === 0) return 0;
    
    const score = Math.round((totalCommonItems / totalPossibleMatches) * 100);

    return Math.min(score, 100); // Cap at 100
  };

  const handleMatch = async () => {
    if (!potentialRoommates || !profile || !profile.preferredCity) {
       toast({
        title: 'Still loading data or profile incomplete',
        description: "Please wait a moment for user data to load and ensure you've selected a preferred city in your profile.",
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
        const cityToMatch = profile.preferredCity.trim().toLowerCase();
        
        let cityRoommates = potentialRoommates.filter(
            (p) => p.city?.trim().toLowerCase() === cityToMatch && p.id !== user?.uid
        );

        const currentUserGender = profile.gender;
        if (currentUserGender === 'male' || currentUserGender === 'female') {
            cityRoommates = cityRoommates.filter(p => p.gender === currentUserGender);
        }

        if (cityRoommates.length === 0) {
            toast({
                title: `No Matches Found in ${profile.preferredCity}`,
                description: `We couldn't find any students in ${profile.preferredCity} that match your criteria at the moment.`,
            });
            setResults([]);
            setLoading(false);
            return;
        }
        
        const scoredResults: MatchResult[] = cityRoommates.map(p => ({
            ...p,
            compatibilityScore: calculateCompatibility(profile, p)
        }));

        scoredResults.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

        setResults(scoredResults);
        toast({
          title: `Found ${scoredResults.length} potential roommate(s) in ${profile.preferredCity}!`,
          description: "Top matches are shown first."
        });

    } catch (error) {
      console.error('Error finding roommate match:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find a roommate match at this time. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (otherUser: UserProfile) => {
    if (!user || !profile || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to start a chat.' });
        return;
    }

    const chatId = [user.uid, otherUser.id].sort().join('_');
    const chatDocRef = doc(firestore, 'chats', chatId);

    try {
        const chatDoc = await getDoc(chatDocRef);

        if (!chatDoc.exists()) {
            const newChatData = {
                id: chatId,
                participantIds: [user.uid, otherUser.id],
                participants: {
                    [user.uid]: {
                        name: profile.name,
                        avatarUrl: profile.avatarUrl || null,
                    },
                    [otherUser.id]: {
                        name: otherUser.name,
                        avatarUrl: otherUser.avatarUrl || null,
                    },
                },
                lastMessage: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(chatDocRef, newChatData)
                .catch((serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: chatDocRef.path,
                        operation: 'create',
                        requestResourceData: newChatData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw permissionError;
                });
        }
        
        router.push(`/dashboard/chat/${chatId}`);

    } catch (error) {
       if (!(error instanceof FirestorePermissionError)) {
          console.error("Error creating or navigating to chat:", error);
       }
    }
  }


  const isProfileIncomplete = !profile?.city || !profile?.gender || !profile.interests || !profile.skills || !profile.preferredCity;

  return (
    <div className="space-y-6">

      {isProfileIncomplete && (
         <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Your Profile is Incomplete!</AlertTitle>
          <AlertDescription>
            Our matching algorithm needs to know your location, preferred city, gender, interests and skills. Please <Link href="/dashboard/profile" className="font-bold underline text-primary">update your profile</Link> to find the best matches.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button onClick={handleMatch} disabled={loading || userLoading || roommatesLoading || isProfileIncomplete} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          {loading || roommatesLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loading ? 'Searching...' : 'Loading Users...'}
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Find Roommates in {profile?.preferredCity || '...'}
            </>
          )}
        </Button>
      </div>

      {results && results.length > 0 && (
        <div className='space-y-6'>
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    {results.length} Student(s) in {profile?.preferredCity}
                    </span>
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                {results.map((student) => (
                    <Card key={student.id} className="animate-in fade-in-50 flex flex-col">
                    <CardHeader className="flex flex-row items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary">
                            <AvatarImage src={student.avatarUrl} alt={student.name}/>
                            <AvatarFallback>{student.name?.[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className='w-full'>
                            <h3 className="font-bold text-xl text-foreground font-headline">{student.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{student.occupation} | {student.age} years | {student.gender}</p>
                           
                            <Button variant="outline" size="sm" onClick={() => handleStartChat(student)} className="mt-2">
                                <MessageSquare className="mr-2 h-4 w-4"/>
                                Message
                            </Button>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 flex-grow">
                         <div>
                            <div className='flex justify-between items-center mb-1'>
                                <h4 className="font-semibold text-foreground text-sm">Match Score</h4>
                                <span className='font-bold text-primary text-sm'>{student.compatibilityScore}%</span>
                            </div>
                            <Progress value={student.compatibilityScore} className="h-2" />
                        </div>
                        <Separator />
                        {(student.interests || student.skills) ? (
                            <div className='space-y-4'>
                            {student.interests && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2 text-sm">Interests</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {student.interests.split(',').map(interest => (
                                            <Badge key={interest} variant="secondary" className="capitalize">{interest.trim()}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {student.skills && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2 text-sm">Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {student.skills.split(',').map(skill => (
                                            <Badge key={skill} variant="outline" className="capitalize">{skill.trim()}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">This user has not filled out their interests or skills yet.</p>
                        )}
                    </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      )}
       {results && results.length === 0 && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Roommates Found</AlertTitle>
          <AlertDescription>
            We couldn't find any students looking for roommates in {profile?.preferredCity} right now that match your criteria. Check back later!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
