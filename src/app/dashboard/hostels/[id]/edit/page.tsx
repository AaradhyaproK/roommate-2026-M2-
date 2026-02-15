'use client';

import { HostelForm } from '@/components/hostels/HostelForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useUser } from '@/firebase';
import type { Hostel } from '@/lib/types';
import { notFound, useParams } from 'next/navigation';

export default function EditHostelPage() {
    const params = useParams();
    const hostelId = params.id as string;
    const { data: hostel, loading: hostelLoading } = useDoc<Hostel>(`hostels/${hostelId}`);
    const { user, loading: userLoading } = useUser();

    const loading = hostelLoading || userLoading;

    if (loading) {
        return (
             <div className="mx-auto max-w-2xl">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {Array.from({length: 6}).map((_, i) => (
                           <div key={i} className="space-y-2">
                             <Skeleton className="h-4 w-1/4" />
                             <Skeleton className="h-10 w-full" />
                           </div>
                        ))}
                        <Skeleton className="h-10 w-32" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!hostel) {
        return notFound();
    }
    
    // Security check to ensure only the owner can edit
    if (user?.uid !== hostel.ownerId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to edit this hostel.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Edit {hostel.name}</CardTitle>
          <CardDescription>Update the details for your hostel listing.</CardDescription>
        </CardHeader>
        <CardContent>
          <HostelForm hostel={hostel} />
        </CardContent>
      </Card>
    </div>
  );
}
