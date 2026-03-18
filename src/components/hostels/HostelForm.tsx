
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import type { Hostel } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Image from 'next/image';
import { Card } from '../ui/card';
import { MAHARASHTRA_CITIES } from '@/lib/cities';
import { Checkbox } from '../ui/checkbox';

const hostelFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Hostel name must be at least 2 characters.',
  }),
  location: z.string().min(1, {
    message: 'Please select a city.',
  }),
  landmark: z.string().optional(),
  googleMapUrl: z.string().url({ message: 'Please enter a valid Google Maps URL.' }).optional().or(z.literal('')),
  description: z.string().min(20, {
    message: 'Description must be at least 20 characters.',
  }),
  amenities: z.string().min(3, {
    message: 'Please list at least one amenity.',
  }),
  price: z.coerce.number().positive({
    message: 'Price must be a positive number.',
  }),
  deposit: z.coerce.number().nonnegative("Deposit can't be negative.").optional(),
  rules: z.string().optional(),
  hostelFor: z.enum(['girls', 'boys', 'both'], {
    required_error: 'Please specify who this hostel is for.',
  }),
  contactName: z.string().min(2, 'Contact name is too short').optional().or(z.literal('')),
  contactNumber: z.string().regex(/^\d{10}$/, "Contact number must be exactly 10 digits.").optional().or(z.literal('')),
  checkInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use HH:MM format."),
  checkOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use HH:MM format."),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewsCount: z.coerce.number().int().nonnegative().optional(),
  isAcceptingStudents: z.boolean().default(true).optional(),
});

type HostelFormValues = z.infer<typeof hostelFormSchema>;

interface HostelFormProps {
  hostel?: Hostel;
}

export function HostelForm({ hostel }: HostelFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [imageUrls, setImageUrls] = useState<string[]>(hostel?.imageUrls || []);
  const [isUploading, setIsUploading] = useState(false);
  
  const isEditMode = !!hostel;

  const defaultValues: Partial<HostelFormValues> = {
    name: hostel?.name || '',
    location: hostel?.location || '',
    landmark: hostel?.landmark || '',
    description: hostel?.description || '',
    amenities: hostel?.amenities.join(', ') || 'WiFi, Kitchen, ',
    price: hostel?.price || 1000,
    googleMapUrl: hostel?.googleMapUrl || '',
    deposit: hostel?.deposit || 0,
    rules: hostel?.rules || '',
    hostelFor: hostel?.hostelFor || 'both',
    contactName: hostel?.contactName || '',
    contactNumber: hostel?.contactNumber || '',
    checkInTime: hostel?.checkInTime || '14:00',
    checkOutTime: hostel?.checkOutTime || '11:00',
    rating: hostel?.rating || 4.5,
    reviewsCount: hostel?.reviewsCount || 0,
    isAcceptingStudents: hostel?.isAcceptingStudents ?? true,
  };

  const form = useForm<HostelFormValues>({
    resolver: zodResolver(hostelFormSchema),
    defaultValues,
    mode: 'onChange',
  });
  
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) {
      toast({ variant: 'destructive', title: 'Error', description: 'ImgBB API key is not configured.' });
      return;
    }
    
    setIsUploading(true);

    try {
      const uploadedUrls = await Promise.all(
        Array.from(files).map(async (image) => {
          const formData = new FormData();
          formData.append('image', image as Blob);

          const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
          });
          const uploadResult = await res.json();
          if (uploadResult.success) {
            return uploadResult.data.url;
          } else {
            throw new Error(uploadResult.error?.message || 'Image upload failed.');
          }
        })
      );

      setImageUrls(prevUrls => [...prevUrls, ...uploadedUrls]);
      toast({ title: 'Success', description: 'Image(s) added successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Error', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageDelete = (urlToDelete: string) => {
    setImageUrls(prevUrls => prevUrls.filter(url => url !== urlToDelete));
    toast({ title: 'Image Removed', description: 'The image has been removed from the list.' });
  };


  async function onSubmit(data: HostelFormValues) {
    if (!firestore || !user) {
        toast({
            variant: "destructive",
            title: 'Authentication Error',
            description: 'You must be logged in to manage hostels.',
        });
        return;
    }
    
    if (imageUrls.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'You must upload at least one image.',
      });
      return;
    }


    setIsSubmitting(true);
    try {
      const finalHostelData = {
        ...data,
        amenities: data.amenities.split(',').map(a => a.trim()).filter(Boolean),
        imageUrls,
        imageHint: hostel?.imageHint || 'hostel interior',
        ownerId: user.uid,
        createdAt: hostel?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rating: isEditMode ? data.rating : 4.5,
        reviewsCount: isEditMode ? data.reviewsCount : Math.floor(Math.random() * 50) + 5,
        isHidden: isEditMode ? hostel.isHidden : false,
        landmark: data.landmark || null,
        contactName: data.contactName || null,
        contactNumber: data.contactNumber || null,
      };

      if (isEditMode && hostel.id) {
         const hostelDocRef = doc(firestore, 'hostels', hostel.id);
         await setDoc(hostelDocRef, finalHostelData, { merge: true })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: hostelDocRef.path,
                    operation: 'update',
                    requestResourceData: finalHostelData,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });

         toast({
            title: 'Hostel Updated!',
            description: `${hostel.name} has been updated successfully.`,
         });

      } else {
        const hostelsCollectionRef = collection(firestore, 'hostels');
        const newDoc = await addDoc(hostelsCollectionRef, finalHostelData)
          .catch((serverError) => {
              const permissionError = new FirestorePermissionError({
                  path: hostelsCollectionRef.path,
                  operation: 'create',
                  requestResourceData: finalHostelData,
              });
              errorEmitter.emit('permission-error', permissionError);
              throw permissionError;
          });
          
        await setDoc(doc(firestore, 'hostels', newDoc.id), { id: newDoc.id }, { merge: true });

        toast({
          title: 'Hostel Listed!',
          description: 'Your new hostel has been listed successfully.',
        });
      }
      
      router.push('/dashboard/hostels');
      router.refresh(); 

    } catch (error: any) {
        if (!(error instanceof FirestorePermissionError)) {
            toast({
                variant: "destructive",
                title: 'Submission Error',
                description: error.message || 'An unexpected error occurred.',
            });
        }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="isAcceptingStudents"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Actively accepting new students
                </FormLabel>
                <FormDescription>
                  Uncheck this if your hostel is full or you are not accepting new applications. This will hide your hostel from public listings.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hostel Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., The Cozy Corner" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MAHARASHTRA_CITIES.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="landmark"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Landmark (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Near K. K. Wagh College" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                A nearby landmark to help students find your hostel.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="googleMapUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Google Map URL</FormLabel>
              <FormControl>
                <Input placeholder="https://maps.app.goo.gl/..." {...field} />
              </FormControl>
              <FormDescription>
                Share a Google Maps link for the precise location.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your hostel..."
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amenities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amenities</FormLabel>
              <FormControl>
                <Input placeholder="WiFi, Kitchen, etc." {...field} />
              </FormControl>
              <FormDescription>
                Please provide a comma-separated list of amenities.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="hostelFor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>This hostel is for</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select who this hostel is for" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="girls">Girls Only</SelectItem>
                    <SelectItem value="boys">Boys Only</SelectItem>
                    <SelectItem value="both">Both (Co-ed)</SelectItem>
                  </SelectContent>
                </Select>
              <FormDescription>
                This will help students find the right environment.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Person Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Mr. Patil" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Public contact name for the hostel.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                        <Input placeholder="10-digit mobile number" {...field} value={field.value ?? ''} />
                    </FormControl>
                     <FormDescription>Public contact number for the hostel.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price per month (₹)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="deposit"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Security Deposit (₹)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 2000" {...field} />
                    </FormControl>
                     <FormDescription>Optional. Amount to be collected as a security deposit.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="checkInTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., 14:00" {...field} />
                    </FormControl>
                     <FormDescription>Please use HH:MM format (e.g., 14:00 for 2 PM).</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="checkOutTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Check-out Time</FormLabel>
                    <FormControl>
                         <Input placeholder="e.g., 11:00" {...field} />
                    </FormControl>
                    <FormDescription>Please use HH:MM format (e.g., 11:00 for 11 AM).</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hostel Rules</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., No smoking, quiet hours after 10 PM..."
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>Optional. List any important rules for residents.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormItem>
            <FormLabel>Hostel Images</FormLabel>
             <FormDescription>
                Add or remove images for your hostel listing. You must have at least one image.
              </FormDescription>
            <Card className="p-4 space-y-4">
                {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {imageUrls.map((url, index) => (
                            <div key={index} className="relative group aspect-square">
                                <Image
                                    src={url}
                                    alt={`Hostel image ${index + 1}`}
                                    fill
                                    className="object-cover rounded-md border"
                                />
                                <div className="absolute top-1 right-1">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7 opacity-70 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleImageDelete(url)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete image</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e.target.files)}
                        className="hidden"
                        disabled={isUploading}
                    />
                    <label htmlFor="image-upload" className="w-full">
                        <Button type="button" asChild className="w-full" disabled={isUploading}>
                           <span className="cursor-pointer">
                             {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                             {isUploading ? "Uploading..." : "Add More Images"}
                           </span>
                        </Button>
                    </label>
                </div>
                {imageUrls.length === 0 && <p className="text-sm text-destructive text-center">Please upload at least one image.</p>}
            </Card>
        </FormItem>

        <Button type="submit" disabled={isSubmitting || isUploading} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? 'Save Changes' : 'List My Hostel'}
        </Button>
      </form>
    </Form>
  );
}
