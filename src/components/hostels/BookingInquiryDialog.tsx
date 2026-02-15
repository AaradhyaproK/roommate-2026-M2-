
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import type { Hostel } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addDoc, collection } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { IndianRupee, Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface BookingInquiryDialogProps {
  hostel: Hostel;
}

export function BookingInquiryDialog({ hostel }: BookingInquiryDialogProps) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [demandedAmount, setDemandedAmount] = React.useState<number | ''>('');


  const handleInquiry = async () => {
    if (!user || !profile) {
      toast({
        variant: 'destructive',
        title: 'Please Login',
        description: 'You need to be logged in to send an inquiry.',
      });
      router.push('/login');
      return;
    }

    if (!profile.contactNumber) {
      toast({
        variant: 'destructive',
        title: 'Profile Incomplete',
        description: 'Please add your contact number to your profile before sending an inquiry.',
      });
      router.push('/dashboard/profile');
      setDialogOpen(false);
      return;
    }
    
    setIsSubmitting(true);

    const inquiryData = {
      hostelId: hostel.id,
      hostelName: hostel.name,
      ownerId: hostel.ownerId,
      userId: user.uid,
      userName: profile.name || user.displayName || 'Anonymous',
      userEmail: user.email || '',
      userContact: profile.contactNumber,
      createdAt: new Date().toISOString(),
      message: message,
      demandedAmount: demandedAmount ? Number(demandedAmount) : null,
    };
    
    const inquiriesCollectionRef = collection(firestore, 'inquiries');
    
    addDoc(inquiriesCollectionRef, inquiryData)
      .then(() => {
        toast({
          title: 'Inquiry Sent!',
          description: `Your interest in ${hostel.name} has been sent to the owner.`,
        });
        setDialogOpen(false);
        setMessage(''); // Clear message on success
        setDemandedAmount('');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: inquiriesCollectionRef.path,
          operation: 'create',
          requestResourceData: inquiryData,
        });
        errorEmitter.emit('permission-error', permissionError);
        // We don't show a toast here because the listener will
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button size="lg" className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
          Send Inquiry
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send an Inquiry for {hostel.name}</AlertDialogTitle>
          <AlertDialogDescription>
            This will send your profile information to the owner. You can also include a message and your budget.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4">
           <div className="grid gap-2">
            <Label htmlFor="demandedAmount">Your Budget (Optional)</Label>
             <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    id="demandedAmount"
                    type="number"
                    placeholder="e.g. 8000"
                    value={demandedAmount}
                    onChange={(e) => setDemandedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="pl-8"
                />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Your Message (Optional)</Label>
            <Textarea 
              id="message" 
              placeholder="Hi, I'm interested in your hostel! I'd like to know more about..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleInquiry} disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Send Inquiry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
