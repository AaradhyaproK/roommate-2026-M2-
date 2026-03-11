'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  User,
  Building,
  Menu,
  BedDouble,
  LogOut,
  Search,
  MessageSquare,
  Shield,
  FileText,
  Wallet,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

import { Logo } from '@/components/shared/Logo';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2 } from 'lucide-react';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { user, loading, profile } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const navItems = React.useMemo(() => {
    const allItems = [
      { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['student', 'owner', 'admin'] },
      { href: '/dashboard/profile', label: 'My Profile', icon: User, roles: ['student', 'owner', 'admin'] },
      { href: '/dashboard/chat', label: 'Messages', icon: MessageSquare, roles: ['student', 'owner', 'admin'] },
      { href: '/dashboard/admin', label: 'Manage Users', icon: Shield, roles: ['admin'] },
      { href: '/dashboard/admin/owner-requests', label: 'Owner Requests', icon: Users, roles: ['admin'] },
      { href: '/dashboard/admin/earnings', label: 'Platform Earnings', icon: IndianRupee, roles: ['admin'] },
      { href: '/dashboard/hostels', label: 'My Hostels', icon: Building, roles: ['owner'], requiresVerification: true },
      { href: '/dashboard/payments', label: 'Payments', icon: Wallet, roles: ['owner'], requiresVerification: true },
      { href: '/dashboard/hostels', label: 'Manage Hostels', icon: Building, roles: ['admin'] },
      { href: '/dashboard/find-hostel', label: 'Find a Hostel', icon: Search, roles: ['student'] },
      { href: '/dashboard/my-inquiries', label: 'My Inquiries', icon: FileText, roles: ['student'] },
      { href: '/dashboard/find-roommate', label: 'Find a Roommate', icon: Users, roles: ['student'] },
    ];
    // Wait until loading is false and profile is available.
    if (loading || !profile?.role) return [];
    
    return allItems.filter(item => {
      if (!item.roles.includes(profile.role!)) {
        return false;
      }
      if (item.requiresVerification && profile.verificationStatus !== 'approved') {
        return false;
      }
      return true;
    });
  }, [profile, loading]);
  

  const pathname = usePathname();

  const closeSheet = () => setIsSheetOpen(false);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: error.message,
      });
    }
  };

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user || !profile) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
        </div>
    );
  }
  
  const currentLabel = navItems.find(item => pathname === item.href)?.label || navItems.find(item => pathname.startsWith(item.href) && item.href !== '/dashboard')?.label || 'Dashboard';


  const NavContent = () => (
    <nav className="grid items-start gap-1 p-2 text-sm font-medium">
      {navItems.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          onClick={closeSheet}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            pathname === item.href && item.label !== 'Dashboard' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : '',
            pathname.startsWith(item.href) && item.href !== '/dashboard' && item.label !== 'Dashboard' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : '',
            pathname === item.href && item.href === '/dashboard' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : ''
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="grid h-screen w-full overflow-hidden md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6 shrink-0">
            <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
              <Logo />
            </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
            <NavContent />
        </div>
        <div className="mt-auto p-4 border-t border-sidebar-border">
            <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
        </div>
      </div>
      <div className="flex flex-col h-screen">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6 shrink-0">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-sidebar p-0 text-sidebar-foreground">
               <div className="flex h-16 items-center border-b px-6">
                 <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Logo />
                 </Link>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <NavContent />
              </div>
              <div className="mt-auto p-4 border-t border-sidebar-border">
                <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="text-xl font-bold md:text-2xl font-headline">
              {currentLabel}
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto bg-secondary/50 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
