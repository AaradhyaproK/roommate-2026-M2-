
'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser, useCollection } from '@/firebase';
import type { Inquiry, Quotation, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc, where, orderBy } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { IndianRupee, Loader2, FileText, CheckCircle2, CreditCard, ExternalLink, MessageSquare, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';

function PayQuotationDialog({ inquiry, onOpenChange, open }: { inquiry: Inquiry; open: boolean; onOpenChange: (open: boolean) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handlePayment = async () => {
    if (!firestore || !inquiry.quotation) return;
    setIsSubmitting(true);

    const inquiryDocRef = doc(firestore, 'inquiries', inquiry.id);
    
    const rentItem = inquiry.quotation.items.find(item => item.id === 'rent');
    const rentAmount = rentItem ? rentItem.amount : 0;
    const platformFee = rentAmount * 0.05;

    const updatedQuotation: Quotation = { 
        ...inquiry.quotation, 
        status: 'paid' as const,
        platformFee: platformFee,
    };

    try {
      await updateDoc(inquiryDocRef, {
        quotation: updatedQuotation,
      });

      toast({
        title: 'Payment Successful!',
        description: `Your booking for ${inquiry.hostelName} is confirmed.`,
        className: 'bg-green-100 dark:bg-green-800 border-green-400',
      });
      onOpenChange(false);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: inquiryDocRef.path,
          operation: 'update',
          requestResourceData: { quotation: updatedQuotation },
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Your Payment</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to pay a total of ₹{inquiry.quotation?.total.toLocaleString('en-IN')} for your booking at {inquiry.hostelName}. This is a simulated payment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePayment} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const [isPayDialogOpen, setPayDialogOpen] = React.useState(false);
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const quotation = inquiry.quotation;

  const handleStartChat = async () => {
    if (!user || !profile || !firestore || !inquiry.ownerId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot start chat. Missing required information.' });
        return;
    }

    const chatId = [user.uid, inquiry.ownerId].sort().join('_');
    const chatDocRef = doc(firestore, 'chats', chatId);

    try {
        const chatDoc = await getDoc(chatDocRef);

        if (!chatDoc.exists()) {
            // To create the chat, we need the owner's profile info.
            // We don't have it here directly. A robust way is to fetch it.
            const ownerProfileDoc = await getDoc(doc(firestore, 'users', inquiry.ownerId));
            if (!ownerProfileDoc.exists()) {
                toast({ variant: 'destructive', title: 'Error', description: 'Hostel owner profile not found.' });
                return;
            }
            const ownerProfile = ownerProfileDoc.data() as UserProfile;

            const newChatData = {
                id: chatId,
                participantIds: [user.uid, inquiry.ownerId],
                participants: {
                    [user.uid]: {
                        name: profile.name,
                        avatarUrl: profile.avatarUrl || null,
                    },
                    [inquiry.ownerId]: {
                        name: ownerProfile.name,
                        avatarUrl: ownerProfile.avatarUrl || null,
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
           toast({ variant: 'destructive', title: 'Error', description: 'Could not start chat session.' });
       }
    }
  };


  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'declined':
         return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">No Quotation</Badge>;
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle className="font-headline text-xl">{inquiry.hostelName}</CardTitle>
                 <CardDescription>Inquiry sent on {new Date(inquiry.createdAt).toLocaleDateString()}</CardDescription>
            </div>
             <Link href={`/hostels/${inquiry.hostelId}`} passHref>
                <Button variant="outline" size="sm">
                    View Hostel <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
            </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {quotation ? (
          <div className="border rounded-lg p-4 space-y-3 bg-background">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Quotation Received</h4>
                {getStatusBadge(quotation.status)}
            </div>
            <Separator/>
            <div className="space-y-2 text-sm">
              {quotation.items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span>₹{item.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{quotation.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>You haven't received a quotation for this inquiry yet.</p>
             <p className="text-sm">The hostel owner has been notified.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 pt-4">
        {quotation && quotation.status === 'pending' && (
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setPayDialogOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Now
            </Button>
        )}
        <Button variant="outline" className="w-full" onClick={handleStartChat}>
            <MessageSquare className="mr-2 h-4 w-4" /> Discuss with Owner
        </Button>
      </CardFooter>

      {quotation && (
        <PayQuotationDialog inquiry={inquiry} open={isPayDialogOpen} onOpenChange={setPayDialogOpen} />
      )}
      
       {quotation && quotation.status === 'paid' && (
         <CardFooter>
            <Button disabled className="w-full">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Booking Confirmed
            </Button>
        </CardFooter>
       )}
    </Card>
  );
}


export default function MyInquiriesPage() {
  const { user, loading: userLoading } = useUser();
  
  const { data: inquiries, loading: inquiriesLoading } = useCollection<Inquiry>(
    'inquiries',
    user ? [where('userId', '==', user.uid), orderBy('createdAt', 'desc')] : []
  );

  const loading = userLoading || inquiriesLoading;

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline">My Inquiries</h2>
        <p className="text-muted-foreground">
          Track the status of your hostel inquiries and received quotations here.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
            {Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : inquiries && inquiries.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      ) : (
        <Card className="col-span-full">
          <CardHeader className="items-center text-center">
            <CardTitle>No Inquiries Sent Yet</CardTitle>
            <CardDescription>You haven't sent any inquiries. Start by finding a hostel you like!</CardDescription>
          </CardHeader>
           <CardContent className="flex justify-center">
                <Button asChild>
                <Link href="/dashboard/find-hostel">
                    <ExternalLink className="mr-2 h-4 w-4" /> Find a Hostel
                </Link>
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
