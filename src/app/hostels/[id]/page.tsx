
'use client';
import Image from 'next/image';
import { notFound, useParams, useRouter } from 'next/navigation';
import { MapPin, IndianRupee, Star, Users, Clock, ExternalLink, Info, ClipboardList, ArrowLeft, Landmark, Phone, User } from 'lucide-react';
import React from 'react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDoc } from '@/firebase';
import type { Hostel } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingInquiryDialog } from '@/components/hostels/BookingInquiryDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import Link from 'next/link';


function LoadingSkeleton() {
    return (
        <>
        <Header />
        <main className="flex-1">
            <div className="container mx-auto max-w-5xl py-12 px-4 md:px-6 space-y-8">
                 <Skeleton className="h-9 w-24 rounded-md" />
                 <div className="flex flex-col md:flex-row gap-8">
                    <Skeleton className="h-40 w-40 rounded-full"/>
                    <div className="space-y-4 flex-1">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-6 w-1/3" />
                        <div className="flex gap-8">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                        <Skeleton className="h-16 w-full" />
                    </div>
                </div>
                 
                 <Skeleton className="h-px w-full" />

                 <div className="grid grid-cols-3 gap-1">
                      {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full"/>)}
                 </div>
            </div>
        </main>
        <Footer />
        </>
    )
}

export default function HostelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: hostel, loading } = useDoc<Hostel>(`hostels/${params.id}`);
  const [selectedImg, setSelectedImg] = React.useState<string | null>(null);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!hostel) {
    notFound();
  }
  
  const profileImage = hostel.imageUrls?.[0] || 'https://placehold.co/400x400';

  return (
    <>
      <Header />
      <main className="flex-1 bg-secondary/30">
        <div className="container mx-auto max-w-5xl py-8 md:py-12 px-4 md:px-6 space-y-8">
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="group -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back
          </Button>

          {/* Header Section */}
          <header className="flex flex-col md:flex-row gap-8 items-center">
            <div className="relative h-32 w-32 md:h-40 md:w-40 flex-shrink-0">
                <Image 
                    src={profileImage} 
                    alt={`Main profile image of ${hostel.name}`}
                    data-ai-hint={hostel.imageHint}
                    fill
                    className="rounded-full object-cover border-4 border-background shadow-md"
                />
            </div>

            <div className="flex flex-col gap-2 text-center md:text-left w-full">
                <h1 className="text-3xl md:text-4xl font-bold font-headline">{hostel.name}</h1>
                 <div className="flex items-center justify-center md:justify-start text-muted-foreground gap-x-2 gap-y-1">
                    <MapPin className="mr-1 h-4 w-4" />
                    <span>{hostel.location}</span>
                </div>
                {hostel.landmark && (
                    <div className="flex items-center justify-center md:justify-start text-muted-foreground gap-x-2 gap-y-1 mt-1">
                        <Landmark className="mr-1 h-4 w-4 text-primary" />
                        <span className="font-semibold">{hostel.landmark}</span>
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 mt-2">
                   <div className="flex items-center font-semibold" title="Price">
                        <IndianRupee className="mr-1.5 h-4 w-4 text-primary" />
                        <span>{hostel.price.toLocaleString('en-IN')} / month</span>
                    </div>
                    {hostel.deposit && hostel.deposit > 0 && (
                        <div className="flex items-center font-semibold" title="Security Deposit">
                            <IndianRupee className="mr-1.5 h-4 w-4 text-primary" />
                            <span>{hostel.deposit.toLocaleString('en-IN')} deposit</span>
                        </div>
                    )}
                   <div className="flex items-center" title="Rating">
                      <Star className="mr-1.5 h-4 w-4 text-amber-500" />
                      <span className="font-bold">{hostel.rating?.toFixed(1) ?? 'N/A'}</span>
                      <span className="text-sm text-muted-foreground ml-1">({hostel.reviewsCount ?? 0} reviews)</span>
                    </div>
                     <div className="flex items-center font-semibold" title="Hostel for">
                        <Users className="mr-1.5 h-4 w-4 text-primary" />
                        <span className="capitalize">{hostel.hostelFor}</span>
                    </div>
                     <div className="flex items-center font-semibold" title="Check-in time">
                        <Clock className="mr-1.5 h-4 w-4 text-primary" />
                        <span>{hostel.checkInTime}</span>
                    </div>
                     <div className="flex items-center font-semibold" title="Check-out time">
                        <Clock className="mr-1.5 h-4 w-4 text-primary" />
                        <span>{hostel.checkOutTime}</span>
                    </div>
                </div>

                <div className="flex justify-center md:justify-start gap-4 mt-4">
                    <BookingInquiryDialog hostel={hostel} />
                    {hostel.googleMapUrl && (
                        <Button asChild variant="outline">
                            <Link href={hostel.googleMapUrl} target="_blank">
                                View on Map <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
          </header>

          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold font-headline">About this hostel</h2>
              </div>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line bg-background border p-4 rounded-xl">{hostel.description}</p>
            </div>
            {hostel.rules && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <ClipboardList className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-bold font-headline">Rules</h2>
                </div>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-line bg-background border p-4 rounded-xl">{hostel.rules}</p>
              </div>
            )}
          </div>
          
          <Separator />
          
          {(hostel.contactName || hostel.contactNumber) && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Phone className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold font-headline">Contact Information</h2>
              </div>
              <div className="bg-background border p-4 rounded-xl space-y-3">
                {hostel.contactName && (
                  <div className="flex items-center">
                    <User className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{hostel.contactName}</span>
                  </div>
                )}
                {hostel.contactNumber && (
                  <div className="flex items-center">
                    <Phone className="mr-3 h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${hostel.contactNumber}`} className="text-primary hover:underline">{hostel.contactNumber}</a>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2">
            {hostel.imageUrls?.map((url, index) => (
              <button key={index} onClick={() => setSelectedImg(url)} className="group relative aspect-square w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                <Image
                  src={url}
                  alt={`Image ${index + 1} of ${hostel.name}`}
                  data-ai-hint={hostel.imageHint}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                 <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {!hostel.imageUrls || hostel.imageUrls.length === 0 && (
            <p className="text-center text-muted-foreground col-span-full">No images have been uploaded for this hostel yet.</p>
          )}

        </div>

         <Dialog open={!!selectedImg} onOpenChange={(isOpen) => !isOpen && setSelectedImg(null)}>
            <DialogContent className="max-w-4xl h-[80vh] p-0 border-0 bg-transparent">
                <DialogHeader className="sr-only">
                    <DialogTitle>Hostel Image Preview</DialogTitle>
                </DialogHeader>
                {selectedImg && (
                    <Image
                        src={selectedImg}
                        alt="Selected hostel image"
                        fill
                        className="object-contain"
                    />
                )}
            </DialogContent>
        </Dialog>

      </main>
      <Footer />
    </>
  );
}
