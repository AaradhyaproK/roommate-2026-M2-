'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MAHARASHTRA_CITIES } from '@/lib/cities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Separator } from '../ui/separator';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name is too short.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  age: z.coerce.number().int().min(18, 'You must be at least 18.').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional().or(z.literal('')),
  contactNumber: z
    .string()
    .regex(/^\d{10}$/, "Contact number must be exactly 10 digits.")
    .optional()
    .or(z.literal('')),
  occupation: z.string().min(2, 'Occupation is too short.').optional().or(z.literal('')),
  city: z.string({ required_error: 'Please select your current city.' }).min(1, 'Please select your current city.').optional().or(z.literal('')),
  preferredCity: z.string({ required_error: 'Please select your preferred city.' }).min(1, 'Please select your preferred city.').optional().or(z.literal('')),
  skills: z.string().optional(),
  interests: z.string().optional(),
  preferences: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const { toast } = useToast();
  const { user, profile, loading } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const isSimpleProfile = profile?.role === 'admin' || profile?.role === 'owner';

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      age: undefined,
      gender: '',
      contactNumber: '',
      occupation: '',
      city: '',
      preferredCity: '',
      skills: '',
      interests: '',
      preferences: '',
      avatarUrl: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        email: profile.email || user?.email || '',
        age: profile.age || undefined,
        gender: profile.gender || '',
        contactNumber: profile.contactNumber || '',
        occupation: profile.occupation || '',
        city: profile.city || '',
        preferredCity: profile.preferredCity || '',
        skills: profile.skills || '',
        interests: profile.interests || '',
        preferences: profile.preferences || '',
        avatarUrl: profile.avatarUrl || '',
      });
    }
  }, [profile, form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to update your profile.' });
      return;
    }
    
    setIsSubmitting(true);
    const profileDocRef = doc(firestore, `users/${user.uid}`);
    
    const dataToSave = {
        ...data,
        email: data.email || null,
        age: data.age ? Number(data.age) : null,
        gender: data.gender || null,
        contactNumber: data.contactNumber || null,
        occupation: data.occupation || null,
        city: data.city || null,
        preferredCity: data.preferredCity || null,
        skills: data.skills || null,
        interests: data.interests || null,
        preferences: data.preferences || null,
        avatarUrl: data.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${data.name}`,
    };

    try {
      await setDoc(profileDocRef, dataToSave, { merge: true })
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: profileDocRef.path,
                operation: 'update',
                requestResourceData: dataToSave,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });

      toast({
        title: 'Profile Updated!',
        description: 'Your information has been saved successfully.',
      });
    } catch (error) {
       if (!(error instanceof FirestorePermissionError)) {
          toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: 'Could not save your profile. Please try again.',
          });
       }
    } finally {
        setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
        </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isSimpleProfile ? (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Your email" {...field} value={field.value ?? ''} disabled />
                  </FormControl>
                  <FormDescription>Your account email address.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
            control={form.control}
            name="contactNumber"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                        <Input placeholder="Your phone number" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Used for connecting with matches and owners.</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        {!isSimpleProfile && (
          <>
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
                <div className="flex flex-col items-center">
                    <Separator className="mb-4" />
                    <Button variant="ghost" className="w-full text-primary">
                        <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${isAdvancedOpen && 'rotate-180'}`} />
                        {isAdvancedOpen ? 'Hide Advanced Options' : 'Show Advanced Options'}
                    </Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-8 animate-in fade-in-0 slide-in-from-top-4">
               <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                  <FormControl>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Select your gender" />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      <SelectItem value="male">Male</SelectItem>
                                      <SelectItem value="female">Female</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Your City</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select your current city" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {MAHARASHTRA_CITIES.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>The city you currently live in.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="preferredCity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Preferred Roommate City</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select your preferred city" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {MAHARASHTRA_CITIES.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>The city you want to find a roommate in.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            </CollapsibleContent>
        </Collapsible>


        <FormField
          control={form.control}
          name="occupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Occupation</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Student, Software Developer" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cooking, Programming, Music" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormDescription>Enter a comma-separated list of your skills.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="interests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interests</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Hiking, Movies, Reading" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>Enter a comma-separated list of your interests.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Roommate Preferences</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your ideal roommate and living situation..."
                  className="resize-y"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Be descriptive! This helps us find the best match for you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
          </>
        )}
        <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </form>
    </Form>
  );
}
