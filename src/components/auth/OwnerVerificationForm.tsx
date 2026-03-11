'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const verificationSchema = z.object({
  aadharProof: z.any().refine(val => val instanceof FileList && val.length > 0, 'Aadhar proof is required.'),
  residentProof: z.any().refine(val => val instanceof FileList && val.length > 0, 'Resident proof is required.'),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

export function OwnerVerificationForm() {
  const { user, profile, loading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (profile?.verificationStatus === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Pending</CardTitle>
          <CardDescription>
            Your request to become a verified hostel owner is under review. You will be notified once it is approved.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const onSubmit = async (data: VerificationFormValues) => {
    if (!user || !firestore || !profile) return;
    setIsSubmitting(true);

    try {
      const aadharFile = data.aadharProof[0];
      const residentFile = data.residentProof[0];

      const uploadToImgBB = async (file: File): Promise<string> => {
        const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || 'e72d08546cf21bd22b8dfca276ba6c9e';
        if (!apiKey) {
          throw new Error('ImgBB API key is not configured.');
        }
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!result.success) {
          console.error('ImgBB API error:', result.error?.message || result);
          throw new Error(result.error?.message || 'Failed to upload document.');
        }
        return result.data.url;
      };

      const aadharProofUrl = await uploadToImgBB(aadharFile);
      const residentProofUrl = await uploadToImgBB(residentFile);

      const newRequestRef = doc(collection(firestore, 'owner-requests'));
      const requestData = {
        id: newRequestRef.id,
        ownerUid: user.uid,
        name: profile.name,
        email: profile.email,
        status: 'pending',
        aadharProofUrl,
        residentProofUrl,
        requestedAt: new Date().toISOString(),
      };
      await setDoc(newRequestRef, requestData);

      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, { verificationStatus: 'pending' });

      toast({ title: 'Request Submitted', description: 'Your verification request has been submitted.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hostel Owner Verification</CardTitle>
        <CardDescription>To use owner features, please upload the required documents for verification.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="aadharProof"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Aadhar Proof (JPG or PNG)</FormLabel>
                  <FormControl>
                    <Input {...fieldProps} type="file" accept="image/png, image/jpeg" onChange={event => onChange(event.target.files)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="residentProof"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Resident Proof (JPG or PNG)</FormLabel>
                  <FormControl>
                    <Input {...fieldProps} type="file" accept="image/png, image/jpeg" onChange={event => onChange(event.target.files)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Verification
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}