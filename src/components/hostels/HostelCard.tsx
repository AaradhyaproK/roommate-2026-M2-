
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Landmark, EyeOff } from 'lucide-react';
import type { Hostel } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HostelCardProps {
  hostel: Hostel;
}

export function HostelCard({ hostel }: HostelCardProps) {
  const imageUrl = hostel.imageUrls && hostel.imageUrls.length > 0
    ? hostel.imageUrls[0]
    : 'https://picsum.photos/seed/placeholder/600/400';
    
  return (
    <div className="group block relative">
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-xl group-hover:-translate-y-2 rounded-xl">
        <CardHeader className="p-0">
          <div className="relative w-full h-56">
            <Image
              src={imageUrl}
              alt={`Image of ${hostel.name}`}
              data-ai-hint={hostel.imageHint}
              fill
              className="object-cover"
            />
             <div className="absolute top-3 left-3">
              {hostel.isAcceptingStudents === false ? (
                <Badge variant="destructive">Full</Badge>
              ) : (
                <Badge className="bg-green-500 hover:bg-green-600">Accepting</Badge>
              )}
            </div>
             <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-2">
                <p className="text-lg font-bold text-primary">
                    <span className="font-sans text-sm">₹</span>{hostel.price}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
             </div>
          </div>
          <div className="p-4 pb-2">
             <CardTitle className="text-xl font-bold font-headline group-hover:text-primary transition-colors">{hostel.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-grow grid gap-3 px-4 pb-4">
          <div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{hostel.location}</span>
            </div>
            {hostel.landmark && (
              <div className="flex items-center text-sm text-muted-foreground pt-1">
                <Landmark className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{hostel.landmark}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{hostel.description}</p>
           <div className="flex flex-wrap gap-2 pt-2">
            {hostel.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="secondary">{amenity}</Badge>
            ))}
             {hostel.amenities.length > 3 && (
                <Badge variant="outline">+{hostel.amenities.length - 3} more</Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="px-4 pb-4 pt-0">
          <Link href={`/hostels/${hostel.id}`} className="w-full">
            <Button variant="outline" className="w-full">
                View Details
            </Button>
          </Link>
        </CardFooter>
      </Card>
      {hostel.isHidden && (
         <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-4">
          <EyeOff className="h-10 w-10 text-destructive mb-2" />
          <h4 className="text-lg font-bold text-destructive-foreground">Hostel Hidden</h4>
          <p className="text-sm text-destructive-foreground/80">This listing is currently hidden by an administrator. Please contact support for assistance.</p>
        </div>
      )}
    </div>
  );
}
