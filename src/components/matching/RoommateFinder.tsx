'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, MessageSquare, GraduationCap } from 'lucide-react';
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

interface CompatibilityDetails {
    score: number;
    commonInterests: string[];
    commonSkills: string[];
}

interface MatchResult extends UserProfile {
    compatibility: CompatibilityDetails;
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

  const calculateCompatibility = (currentUserProfile: UserProfile, otherUserProfile: UserProfile): CompatibilityDetails => {
    // Interests
    const currentUserInterests = new Set((currentUserProfile.interests || '').toLowerCase().split(',').map(i => i.trim()).filter(Boolean));
    const otherUserInterests = new Set((otherUserProfile.interests || '').toLowerCase().split(',').map(i => i.trim()).filter(Boolean));
    const commonInterests = [...currentUserInterests].filter(interest => otherUserInterests.has(interest));

    // Skills
    const currentUserSkills = new Set((currentUserProfile.skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));
    const otherUserSkills = new Set((otherUserProfile.skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));
    const commonSkills = [...currentUserSkills].filter(skill => otherUserSkills.has(skill));

    let totalPossibleMatches = currentUserInterests.size + currentUserSkills.size;
    let totalCommonItems = commonInterests.length + commonSkills.length;
    
    // Education - weighted by treating them as individual important items
    const currentUserCollege = (currentUserProfile.collegeName || '').trim().toLowerCase();
    if (currentUserCollege) {
        totalPossibleMatches += 1;
        const otherUserCollege = (otherUserProfile.collegeName || '').trim().toLowerCase();
        if (currentUserCollege === otherUserCollege) {
            totalCommonItems += 1;
        }
    }

    const currentUserFieldOfStudy = (currentUserProfile.fieldOfStudy || '').trim().toLowerCase();
    if (currentUserFieldOfStudy) {
        totalPossibleMatches += 1;
        const otherUserFieldOfStudy = (otherUserProfile.fieldOfStudy || '').trim().toLowerCase();
        if (currentUserFieldOfStudy === otherUserFieldOfStudy) {
            totalCommonItems += 1;
        }
    }
    
    if (totalPossibleMatches === 0) return { score: 0, commonInterests: [], commonSkills: [] };
    
    const score = Math.round((totalCommonItems / totalPossibleMatches) * 100);

    return {
        score: Math.min(score, 100), // Cap at 100
        commonInterests,
        commonSkills
    };
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
            compatibility: calculateCompatibility(profile, p)
        }));

        scoredResults.sort((a, b) => b.compatibility.score - a.compatibility.score);

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


  const isProfileIncomplete = !profile?.city || !profile?.gender || !profile.interests || !profile.skills || !profile.preferredCity || !profile.collegeName;

  return (
    <div className="space-y-6">

      {isProfileIncomplete && (
         <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Your Profile is Incomplete!</AlertTitle>
          <AlertDescription>
            Our matching algorithm works best with your location, preferred city, gender, education, interests, and skills. Please <Link href="/dashboard/profile" className="font-bold underline text-primary">update your profile</Link> to find the best matches.
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
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {results.map((student) => (
                    <Card key={student.id} className="relative flex flex-col overflow-hidden rounded-2xl border-border/50 shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1 animate-in fade-in-50">
                        {/* Header background */}
                        <div className="h-24 bg-gradient-to-br from-primary/20 to-accent/20" />

                        {/* Content */}
                        <div className="flex flex-1 flex-col items-center p-6 pt-0">
                            {/* Avatar */}
                            <Avatar className="relative -mt-12 h-24 w-24 border-4 border-background shadow-md">
                                <AvatarImage src={student.avatarUrl} alt={student.name} />
                                <AvatarFallback className="text-3xl">{student.name?.[0].toUpperCase()}</AvatarFallback>
                            </Avatar>

                            {/* Name and Basic Info */}
                            <div className="mt-4 text-center">
                                <h3 className="text-2xl font-bold text-foreground font-headline">{student.name}</h3>
                                <p className="text-sm text-muted-foreground capitalize">{student.occupation} &bull; {student.age} years &bull; {student.gender}</p>
                            </div>

                            {/* Education */}
                            {(student.collegeName || student.fieldOfStudy) && (
                                <div className="mt-2 flex items-center text-sm text-muted-foreground">
                                    <GraduationCap className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate text-center">
                                        {student.collegeName}{student.collegeName && student.fieldOfStudy && ', '}{student.fieldOfStudy}
                                    </span>
                                </div>
                            )}

                            {/* Match Score */}
                            <div className="w-full space-y-1 mt-6">
                                <div className='flex justify-between items-center text-sm'>
                                    <h4 className="font-semibold text-foreground">Match Score</h4>
                                    <span className='font-bold text-primary'>{student.compatibility.score}%</span>
                                </div>
                                <Progress value={student.compatibility.score} className="h-2" />
                            </div>

                            <Separator className="my-6" />

                            {/* Interests & Skills */}
                            <div className="w-full flex-1 space-y-4 text-left">
                                {student.compatibility.commonInterests.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2 text-sm">Common Interests</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {student.compatibility.commonInterests.map(interest => (
                                                <Badge key={interest} variant="secondary" className="capitalize bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{interest.trim()}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {student.compatibility.commonSkills.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2 text-sm">Common Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {student.compatibility.commonSkills.map(skill => (
                                                <Badge key={skill} variant="outline" className="capitalize border-blue-300 text-blue-800 dark:border-blue-700 dark:text-blue-300">{skill.trim()}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {student.compatibility.commonInterests.length === 0 && student.compatibility.commonSkills.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-2">No common interests or skills found. Add more to your profile!</p>
                                )}
                            </div>

                            {/* Action Button */}
                            <Button variant="default" size="lg" onClick={() => handleStartChat(student)} className="mt-8 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                                <MessageSquare className="mr-2 h-4 w-4"/>
                                Message {student.name.split(' ')[0]}
                            </Button>
                        </div>
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
