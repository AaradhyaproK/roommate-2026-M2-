
'use client';
import React, { useState, useMemo } from 'react';
import { HostelCard } from '@/components/hostels/HostelCard';
import { Input } from '@/components/ui/input';
import { useCollection, useUser } from '@/firebase';
import type { Hostel } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAHARASHTRA_CITIES } from '@/lib/cities';

export default function FindHostelPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const { data: allHostels, loading: hostelsLoading } = useCollection<Hostel>('hostels');
  const [price, setPrice] = useState(20000);
  const { profile, loading: userLoading } = useUser();

  const loading = hostelsLoading || userLoading;

  const maxPrice = useMemo(() => {
    if (!allHostels || allHostels.length === 0) return 20000;
    return Math.max(...allHostels.map(h => h.price), 20000);
  }, [allHostels]);
  
  useState(() => {
    if (!loading) {
      setPrice(maxPrice);
    }
  });


  const filteredHostels = useMemo(() => {
    if (!allHostels || !profile) return [];
    
    return allHostels.filter(hostel => {
      // Visibility Filters (most important)
      if (hostel.isHidden) {
        return false;
      }
      if (hostel.isAcceptingStudents === false) {
        return false;
      }
      
      // Gender/Type Filter
      const userGender = profile.gender;
      const hostelType = hostel.hostelFor;

      if (userGender === 'male' && hostelType === 'girls') {
        return false;
      }
      if (userGender === 'female' && hostelType === 'boys') {
        return false;
      }

      // City Filter
      const matchesCity = cityFilter === 'all' || hostel.location === cityFilter;

      // Search and Price Filter
      const matchesSearch = hostel.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = hostel.price <= price;

      return matchesCity && matchesSearch && matchesPrice;
    });
  }, [allHostels, profile, searchTerm, price, cityFilter]);

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
            </div>
            <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-5 w-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[400px] w-full" />)}
            </div>
        </div>
    );
  }

  if (!profile?.gender) {
      return (
         <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Your Profile is Incomplete!</AlertTitle>
          <AlertDescription>
            To find suitable hostels, we need to know your gender. Please <Link href="/dashboard/profile" className="font-bold underline text-primary">update your profile</Link>.
          </AlertDescription>
        </Alert>
      )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight font-headline">Explore Hostels</h2>
        <p className="text-muted-foreground">Find the perfect place to stay for your next adventure.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {MAHARASHTRA_CITIES.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-1">
          <Input 
            type="text" 
            placeholder="Search by hostel name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="lg:col-span-1 space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="price-range">Max Price: <span className="font-bold text-primary">₹{price}</span></Label>
          </div>
          <Slider
            id="price-range"
            max={maxPrice}
            min={0}
            step={500}
            value={[price]}
            onValueChange={(value) => setPrice(value[0])}
            className="w-full pt-2"
            disabled={loading}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredHostels?.map((hostel) => (
          <HostelCard key={hostel.id} hostel={hostel} />
        ))}
      </div>

       {!loading && filteredHostels?.length === 0 && (
          <div className="text-center col-span-full py-12">
              <h3 className="text-xl font-semibold">No Hostels Found</h3>
              <p className="text-muted-foreground">Try adjusting your search or price filters, or check back later.</p>
          </div>
        )}
    </div>
  );
}
