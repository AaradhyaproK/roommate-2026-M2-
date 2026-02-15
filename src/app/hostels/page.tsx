
'use client';
import React, { useMemo } from 'react';
import { HostelCard } from '@/components/hostels/HostelCard';
import { useCollection } from '@/firebase';
import type { Hostel } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function AllHostelsPage() {
  const { data: allHostels, loading: hostelsLoading } = useCollection<Hostel>('hostels');

  const visibleHostels = useMemo(() => {
    if (!allHostels) return [];
    return allHostels.filter(hostel => !hostel.isHidden && hostel.isAcceptingStudents !== false);
  }, [allHostels]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Explore All Hostels</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Find the perfect place to stay from our complete list of available hostels.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {hostelsLoading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[420px] w-full rounded-xl" />)
              ) : visibleHostels && visibleHostels.length > 0 ? (
                visibleHostels.map((hostel) => (
                  <HostelCard key={hostel.id} hostel={hostel} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                    <h3 className="text-xl font-semibold">No Hostels Listed</h3>
                    <p className="text-muted-foreground">Check back later to see new listings!</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
