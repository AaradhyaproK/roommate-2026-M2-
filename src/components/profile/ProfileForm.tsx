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
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MAHARASHTRA_CITIES } from '@/lib/cities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Separator } from '../ui/separator';
import { OwnerVerificationForm } from '../auth/OwnerVerificationForm';

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
  aadharUrl: z.string().url().optional().or(z.literal('')),
  aadharFile: z.any().optional(),
  // New fields for students/candidates
  collegeName: z.string().min(2, 'College name is too short.').optional().or(z.literal('')),
  degree: z.string().min(2, 'Degree is too short.').optional().or(z.literal('')),
  fieldOfStudy: z.string().min(2, 'Field of study is too short.').optional().or(z.literal('')),
  graduationYear: z.coerce.number().int().min(1950, 'Invalid year.').max(new Date().getFullYear() + 10, 'Invalid year.').optional().or(z.literal('')),

  // New fields for hostel owners
  ownerBio: z.string().max(500, 'Bio must be 500 characters or less.').optional().or(z.literal('')),
  yearsInManagement: z.coerce.number().int().min(0, 'Experience cannot be negative.').optional().or(z.literal('')),
  managementName: z.string().min(2, 'Name is too short.').optional().or(z.literal('')),
  websiteUrl: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  numberOfProperties: z.coerce.number().int().min(0, 'Cannot be negative.').optional().or(z.literal('')),

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
      aadharUrl: '',
      collegeName: '',
      degree: '',
      fieldOfStudy: '',
      graduationYear: undefined,
      ownerBio: '',
      yearsInManagement: undefined,
      managementName: '',
      websiteUrl: '',
      numberOfProperties: undefined,
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
        aadharUrl: profile.aadharUrl || '',
        collegeName: profile.collegeName || '',
        degree: profile.degree || '',
        fieldOfStudy: profile.fieldOfStudy || '',
        graduationYear: profile.graduationYear || undefined,
        ownerBio: profile.ownerBio || '',
        yearsInManagement: profile.yearsInManagement || undefined,
        managementName: profile.managementName || '',
        websiteUrl: profile.websiteUrl || '',
        numberOfProperties: profile.numberOfProperties || undefined,
      });
    }
  }, [profile, form, user?.email]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to update your profile.' });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const profileDocRef = doc(firestore, `users/${user.uid}`);
      
      const dataToSave: Partial<ProfileFormValues> & { aadharUrl?: string | null; avatarUrl: string } = {
        ...data, // spread existing form data
      };

      if (data.aadharFile && (data.aadharFile as FileList).length > 0) {
        const aadharFile = (data.aadharFile as FileList)[0];

        const uploadToImgBB = async (file: File): Promise<string> => {
          const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || 'e72d08546cf21bd22b8dfca276ba6c9e';
          if (!apiKey) {
            throw new Error('ImgBB API key is not configured. Please add NEXT_PUBLIC_IMGBB_API_KEY to your .env.local file.');
          }
          const formData = new FormData();
          formData.append('image', file);
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
          });
          const result = await response.json().catch(async () => {
            const errorText = await response.text().catch(() => 'Could not read response text.');
            console.error('ImgBB returned a non-JSON response:', { status: response.status, body: errorText });
            throw new Error('Image upload service returned an invalid response.');
          });
          if (!result.success) {
            console.error('ImgBB API error:', result.error?.message || result);
            throw new Error(result.error?.message || 'Failed to upload document.');
          }
          return result.data.url;
        };

        dataToSave.aadharUrl = await uploadToImgBB(aadharFile);
      } else {
        dataToSave.aadharUrl = profile?.aadharUrl || null;
      }

      // Overwrite with sanitized values
      Object.assign(dataToSave, {
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
        collegeName: data.collegeName || null,
        degree: data.degree || null,
        fieldOfStudy: data.fieldOfStudy || null,
        graduationYear: data.graduationYear ? Number(data.graduationYear) : null,
        ownerBio: data.ownerBio || null,
        yearsInManagement: data.yearsInManagement ? Number(data.yearsInManagement) : null,
        managementName: data.managementName || null,
        websiteUrl: data.websiteUrl || null,
        numberOfProperties: data.numberOfProperties ? Number(data.numberOfProperties) : null,
      });

      delete (dataToSave as any).aadharFile;

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
            description: (error as Error).message || 'Could not save your profile. Please try again.',
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

  if (profile?.role === 'owner' && profile.verificationStatus !== 'approved') {
    return <OwnerVerificationForm />;
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

        {isSimpleProfile && (
          <>
            <Separator />
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Hostel Owner Information</h3>
                <p className="text-sm text-muted-foreground">
                    Provide more details about yourself as a hostel owner. This helps build trust with students.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="managementName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business/Management Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., SK Hostels" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription>Your registered business or management name, if any.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Website (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription>A link to your personal or business website.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="yearsInManagement"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Years in Property Management</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="numberOfProperties"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Properties</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 3" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={form.control}
                name="ownerBio"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>About You (as a Hostel Owner)</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Tell students about your experience, management style, and what makes your properties a great place to live..."
                                className="resize-y"
                                {...field}
                                value={field.value ?? ''}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </>
        )}
        
        {!isSimpleProfile && (
          <>
            <FormField
              control={form.control}
              name="aadharFile"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Aadhar Card (JPG or PNG)</FormLabel>
                  <FormControl>
                    <Input
                      {...fieldProps}
                      id="aadharFile"
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={event => onChange(event.target.files)}
                    />
                  </FormControl>
                  {profile?.aadharUrl && (
                    <FormDescription>
                      <a href={profile.aadharUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        View current Aadhar
                      </a>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
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

        <Separator />
        <div className="space-y-2 pt-4">
            <h3 className="text-lg font-medium">Education</h3>
            <p className="text-sm text-muted-foreground">
                Tell us about your educational background.
            </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="collegeName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>College/University</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., University of Pune" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="graduationYear"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Graduation Year</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 2026" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="degree"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Degree</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Bachelor of Engineering" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="fieldOfStudy"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Field of Study</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Computer Science" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <Separator className="!mt-8" />

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
