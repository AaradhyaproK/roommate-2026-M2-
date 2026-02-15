
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Search, Users, Home as HomeIcon, Bot, ShieldCheck, Star } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { HostelCard } from '@/components/hostels/HostelCard';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection } from '@/firebase';
import type { Hostel } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMemo } from 'react';

export default function HomePage() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');
  const { data: allHostels, loading } = useCollection<Hostel>('hostels', []);

  const featuredHostels = useMemo(() => {
    if (!allHostels) return [];
    // Filter out hidden and non-accepting hostels, then slice
    return allHostels.filter(hostel => !hostel.isHidden && hostel.isAcceptingStudents !== false).slice(0, 3);
  }, [allHostels]);

  const whyChooseUsFeatures = [
    {
      icon: <Bot className="h-10 w-10 text-primary" />,
      title: 'AI-Powered Matching',
      description: 'Our smart algorithm connects you with roommates who share your lifestyle, habits, and interests for a better living experience.',
    },
    {
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      title: 'Verified & Secure',
      description: 'We prioritize your safety. All hostel listings and user profiles are verified to ensure a trustworthy and secure community.',
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: 'Community Focused',
      description: 'More than just a room. Find friends, join local events, and become part of a vibrant student community in your new city.',
    },
  ];

  const testimonials = [
     {
      name: 'Priya Sharma',
      role: 'Student',
      avatar: 'PS',
      text: "RoomMateMatch made finding a place in a new city so easy! The AI matching helped me find a roommate who's now one of my best friends. I felt safe throughout the whole process.",
    },
    {
      name: 'Rajesh Kumar',
      role: 'Hostel Owner',
      avatar: 'RK',
      text: "Listing my property was simple, and I started receiving inquiries from verified students almost immediately. It has been a fantastic way to keep my hostel full with great tenants.",
    },
  ];


  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-24 md:py-32 lg:py-48">
          {heroImage && (
            <Image
              alt="Background"
              className="absolute inset-0 object-cover w-full h-full"
              data-ai-hint={heroImage.imageHint}
              fill
              priority
              src={heroImage.imageUrl}
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
          <div className="container relative mx-auto z-10 px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
                <h1 className="text-4xl font-extrabold tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                  Find Your Space, Match Your Vibe
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl">
                  Discover the perfect hostel and connect with like-minded roommates. Your next adventure starts here.
                </p>
              <div className="space-x-4">
                <Button asChild size="lg">
                  <Link href="/hostels">
                    Find a Hostel <ArrowRight className="ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/signup">
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">A Simpler Way to Find Your Home</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Finding the right place and people shouldn't be hard. Here’s how we make it easy.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-12 py-12 md:grid-cols-3">
              <div className="grid gap-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold font-headline">Search & Filter</h3>
                <p className="text-muted-foreground">Easily browse listings with powerful filters for location, price, and amenities to find the perfect hostel for you.</p>
              </div>
              <div className="grid gap-4 text-center">
                 <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold font-headline">Connect & Match</h3>
                <p className="text-muted-foreground">Use our AI-powered tool to find compatible roommates. Chat securely to get to know them before you move in.</p>
              </div>
              <div className="grid gap-4 text-center">
                 <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <HomeIcon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold font-headline">Settle In</h3>
                <p className="text-muted-foreground">Once you've found your match, send an inquiry to the hostel owner and get ready to start your new chapter.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Hostels Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Featured Hostels</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Explore top-rated hostels in prime locations. Comfort, community, and convenience await.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[420px] w-full rounded-xl" />)
              ) : (
                featuredHostels.map((hostel) => (
                  <HostelCard key={hostel.id} hostel={hostel} />
                ))
              )}
            </div>
            <div className="flex justify-center">
              <Button asChild variant="outline">
                <Link href="/hostels">
                  View All Hostels <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* Why Choose Us Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">The RoomMateMatch Advantage</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                We're more than just a listing site. We're your partner in finding the perfect home and community.
              </p>
            </div>
            <div className="mx-auto grid items-start gap-8 py-12 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              {whyChooseUsFeatures.map((feature) => (
                <div key={feature.title} className="grid gap-4 rounded-lg border bg-background p-6 shadow-sm transition-all hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    {feature.icon}
                    <h3 className="text-xl font-bold font-headline">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Loved by Students & Owners</h2>
                 <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Don't just take our word for it. Here's what our community is saying.
                </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 sm:grid-cols-1 md:gap-12 lg:grid-cols-2">
                {testimonials.map((testimonial) => (
                    <Card key={testimonial.name}>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border-2 border-primary">
                                    <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg font-semibold">{testimonial.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <p className="text-muted-foreground italic">"{testimonial.text}"</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 md:px-6">
             <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Ready to Find Your Match?</h2>
                <p className="max-w-[600px] text-primary-foreground/80 md:text-xl">
                    Join our community today and take the first step towards finding the perfect hostel and roommate. It's free to get started!
                </p>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/signup">
                    Sign Up for Free
                  </Link>
                </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
