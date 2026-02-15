
'use client';
import Link from 'next/link';
import { PlusCircle, Loader2, Users, Edit, Trash2, MessageSquare, Search } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { HostelCard } from '@/components/hostels/HostelCard';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Hostel, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteHostelDialog } from '@/components/hostels/DeleteHostelDialog';
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import { HostelVisibilityToggle } from '@/components/hostels/HostelVisibilityToggle';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function MyHostelsPage() {
  const { user, profile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const { data: allHostels, loading: hostelsLoading } = useCollection<Hostel>('hostels');
  const { data: allUsers, loading: usersLoading } = useCollection<UserProfile>('users');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');


  const displayedHostels = useMemo(() => {
    if (!user || !allHostels || !profile) return [];
    
    // 1. Filter by role (owner or admin)
    let roleFilteredHostels = [];
    if (profile.role === 'admin') {
      roleFilteredHostels = allHostels;
    } else {
      roleFilteredHostels = allHostels.filter(hostel => hostel.ownerId === user.uid);
    }
    
    // 2. Apply search and status filters
    return roleFilteredHostels.filter(hostel => {
      // Search filter
      const matchesSearch = hostel.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      switch (statusFilter) {
        case 'visible':
          matchesStatus = !hostel.isHidden;
          break;
        case 'hidden':
          matchesStatus = !!hostel.isHidden;
          break;
        case 'accepting':
          matchesStatus = hostel.isAcceptingStudents !== false;
          break;
        case 'full':
          matchesStatus = hostel.isAcceptingStudents === false;
          break;
        default: // 'all'
          matchesStatus = true;
      }
      
      return matchesSearch && matchesStatus;
    });

  }, [user, allHostels, profile, searchTerm, statusFilter]);

  const loading = userLoading || hostelsLoading || usersLoading;
  
  const pageTitle = profile?.role === 'admin' ? 'All Hostels (Admin)' : 'My Hostels';
  const pageDescription = profile?.role === 'admin' ? 'Manage all hostel listings on the platform.' : 'Manage your hostel listings and view inquiries.';

  const handleStartChat = async (currentUser: UserProfile, otherUser: UserProfile) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Chat service is unavailable.' });
      return;
    }
  
    const chatId = [currentUser.id, otherUser.id].sort().join('_');
    const chatDocRef = doc(firestore, 'chats', chatId);
  
    try {
      const chatDoc = await getDoc(chatDocRef);
  
      if (!chatDoc.exists()) {
        const newChatData = {
          id: chatId,
          participantIds: [currentUser.id, otherUser.id],
          participants: {
            [currentUser.id]: {
              name: currentUser.name || 'User',
              avatarUrl: currentUser.avatarUrl || null,
            },
            [otherUser.id]: {
              name: otherUser.name || 'User',
              avatarUrl: otherUser.avatarUrl || null,
            },
          },
          lastMessage: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
  
        setDoc(chatDocRef, newChatData)
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
  };

  const getOwnerFromHostel = (hostel: Hostel) => {
    if (!allUsers) return null;
    return allUsers.find(u => u.id === hostel.ownerId);
  }

  const getAdminUser = () => {
    if(!allUsers) return null;
    return allUsers.find(u => u.role === 'admin');
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full">
            <h2 className="text-2xl font-bold tracking-tight font-headline">{pageTitle}</h2>
            <p className="text-muted-foreground">
                {pageDescription}
            </p>
        </div>
        {profile?.role === 'owner' && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/hostels/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Hostel
            </Link>
          </Button>
        )}
      </div>

       <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by hostel name..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="visible">Visible</TabsTrigger>
            <TabsTrigger value="hidden">Hidden</TabsTrigger>
            <TabsTrigger value="accepting">Accepting</TabsTrigger>
            <TabsTrigger value="full">Full</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[550px] w-full" />)}
        </div>
      ) : displayedHostels && displayedHostels.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedHostels.map((hostel) => {
             const owner = getOwnerFromHostel(hostel);
             const admin = getAdminUser();

            return (
              <Card key={hostel.id} className="flex flex-col overflow-hidden rounded-xl">
                <HostelCard hostel={hostel} />
                <CardFooter className="flex-col items-stretch gap-2 pt-4 bg-background/50">
                    {profile?.role === 'admin' && (
                      <>
                        <div className="flex justify-between items-center p-2 bg-secondary rounded-md">
                           <p className="text-sm font-medium">Admin Visibility</p>
                          <HostelVisibilityToggle hostel={hostel} />
                        </div>
                        <Separator className="my-2" />
                      </>
                    )}
                     <div className="grid grid-cols-2 gap-2">
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/dashboard/hostels/${hostel.id}/inquiries`}>
                                <Users className="mr-2 h-4 w-4" /> Inquiries
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/dashboard/hostels/${hostel.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                        </Button>
                    </div>

                    {profile?.role === 'admin' && owner && profile.id !== owner.id && (
                        <Button variant="outline" onClick={() => handleStartChat(profile, owner)}>
                            <MessageSquare className="mr-2 h-4 w-4" /> Chat with Owner
                        </Button>
                    )}
                    {profile?.role === 'owner' && admin && (
                        <Button variant="outline" onClick={() => handleStartChat(profile, admin)}>
                            <MessageSquare className="mr-2 h-4 w-4" /> Chat with Admin
                        </Button>
                    )}

                    <DeleteHostelDialog hostelId={hostel.id}>
                        <Button variant="destructive" className="w-full">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Hostel
                        </Button>
                    </DeleteHostelDialog>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center col-span-full py-12 text-muted-foreground border rounded-xl bg-background">
          <h3 className="text-xl font-semibold">No Hostels Found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}
