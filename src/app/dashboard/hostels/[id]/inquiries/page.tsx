
'use client';

import { useCollection, useDoc, useUser } from '@/firebase';
import type { Hostel, InquiryWithUser, UserProfile } from '@/lib/types';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IndianRupee, Mail, MessageSquare, Phone } from 'lucide-react';
import { collection, doc, getDoc, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import React from 'react';
import { SendQuotationDialog } from '@/components/hostels/SendQuotationDialog';
import { Badge } from '@/components/ui/badge';

function InquiryCard({ inquiry, hostel }: { inquiry: InquiryWithUser; hostel: Hostel }) {
  const user = inquiry.user;
  const { user: owner, profile: ownerProfile } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const handleStartChat = async (otherUser: UserProfile) => {
    if (!owner || !ownerProfile || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to start a chat.' });
        return;
    }

    if (!otherUser || !otherUser.id) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot start a chat with an invalid user.' });
        return;
    }

    const chatId = [owner.uid, otherUser.id].sort().join('_');
    const chatDocRef = doc(firestore, 'chats', chatId);

    try {
        const chatDoc = await getDoc(chatDocRef);

        if (!chatDoc.exists()) {
            const newChatData = {
                id: chatId,
                participantIds: [owner.uid, otherUser.id],
                participants: {
                    [owner.uid]: {
                        name: ownerProfile.name || 'Owner',
                        avatarUrl: ownerProfile.avatarUrl || null,
                    },
                    [otherUser.id]: {
                        name: otherUser.name || 'Student',
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


  if (!user) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Inquiry from an unknown user</CardTitle>
                 <CardDescription>Sent on {new Date(inquiry.createdAt).toLocaleDateString()}</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  const quotationStatus = inquiry.quotation?.status;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12 border">
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          <AvatarFallback>{user.name?.[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg font-headline">{user.name}</CardTitle>
          <CardDescription>Sent on {new Date(inquiry.createdAt).toLocaleDateString()}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {inquiry.message && (
             <div className="border rounded-lg p-3 space-y-2 bg-secondary/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Message
                </div>
                <p className="text-sm text-foreground/80">{inquiry.message}</p>
            </div>
        )}
        {inquiry.demandedAmount && (
             <div className="border rounded-lg p-3 space-y-2 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
                    <IndianRupee className="h-4 w-4" />
                    Student's Budget
                </div>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">₹{inquiry.demandedAmount.toLocaleString('en-IN')} / month</p>
            </div>
        )}
        {(!inquiry.message && !inquiry.demandedAmount) && (
             <p className="text-sm text-muted-foreground text-center py-4">No message or budget was sent with this inquiry.</p>
        )}
      </CardContent>
       <CardFooter className="flex-col items-start gap-2 border-t pt-4">
           {quotationStatus ? (
               <Button variant="outline" disabled className="w-full mb-2">
                Quotation {quotationStatus === 'paid' ? 'Paid' : 'Sent'}
                {quotationStatus === 'paid' && <Badge className="ml-2 bg-green-500">Paid</Badge>}
               </Button>
           ) : (
             <SendQuotationDialog inquiry={inquiry} hostel={hostel} />
           )}
          <Button variant="outline" size="sm" onClick={() => handleStartChat(user)} className="w-full mb-2">
            <MessageSquare className="mr-2 h-4 w-4"/>
            Start Chat
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${inquiry.userEmail}`} className="hover:underline text-primary">
              {inquiry.userEmail}
            </a>
          </div>
          {inquiry.userContact && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a href={`tel:${inquiry.userContact}`} className="hover:underline text-primary">
                {inquiry.userContact}
              </a>
            </div>
          )}
       </CardFooter>
    </Card>
  );
}


export default function HostelInquiriesPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const { data: hostel, loading: hostelLoading } = useDoc<Hostel>(`hostels/${hostelId}`);
  
  const { data: inquiries, loading: inquiriesLoading } = useCollection<InquiryWithUser>(
    'inquiries',
    hostelId ? [where('hostelId', '==', hostelId)] : []
  );

  const loading = hostelLoading || inquiriesLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!hostel) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline">Inquiries for {hostel.name}</h2>
        <p className="text-muted-foreground">
          Here are the students who are interested in your hostel.
        </p>
      </div>

      {inquiries && inquiries.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} hostel={hostel}/>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Inquiries Yet</CardTitle>
            <CardDescription>You haven't received any inquiries for this hostel yet.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
