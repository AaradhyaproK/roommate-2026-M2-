
'use client';

import Link from 'next/link';
import { User, Users, Building, ArrowRight, Search, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const allQuickLinks = [
  {
    title: 'My Profile',
    description: 'Update your personal details and roommate preferences.',
    href: '/dashboard/profile',
    icon: User,
    roles: ['student', 'owner', 'admin'],
  },
  {
    title: 'Find a Hostel',
    description: 'Browse and explore available hostel listings.',
    href: '/dashboard/find-hostel',
    icon: Search,
    roles: ['student'],
  },
  {
    title: 'Find a Roommate',
    description: 'Use our AI to find your perfect roommate match.',
    href: '/dashboard/find-roommate',
    icon: Users,
    roles: ['student'],
  },
  {
    title: 'My Hostels',
    description: 'View, edit, or add new hostel listings.',
    href: '/dashboard/hostels',
    icon: Building,
    roles: ['owner'],
  },
  {
    title: 'Manage Hostels',
    description: 'Manage all hostel listings on the platform.',
    href: '/dashboard/hostels',
    icon: Building,
    roles: ['admin'],
  },
  {
    title: 'Manage Users',
    description: 'Manage users and platform settings.',
    href: '/dashboard/admin',
    icon: Shield,
    roles: ['admin'],
  },
];

export default function DashboardPage() {
  const { profile, loading } = useUser();

  const quickLinks = React.useMemo(() => {
    if (loading || !profile?.role) return [];
    if (profile.role === 'admin') {
      return allQuickLinks.filter(link => ['Manage Users', 'Manage Hostels'].includes(link.title));
    }
    return allQuickLinks.filter(link => link.roles.includes(profile.role!));
  }, [profile, loading]);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline">Welcome back, {profile?.name}!</h2>
        <p className="text-muted-foreground">
          Here&apos;s a quick overview of your account.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Card key={link.href} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{link.title}</CardTitle>
              <link.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </CardContent>
            <div className="p-6 pt-0">
               <Button asChild variant="outline" size="sm">
                <Link href={link.href}>
                  Go to {link.title} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
       {quickLinks.length === 0 && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Dashboard is Empty</CardTitle>
              <CardDescription>
                It looks like there are no actions for your role, or your profile is still loading.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
    </div>
  );
}

