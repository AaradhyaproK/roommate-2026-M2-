
'use client';
import { useCollection, useUser, useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function DocumentViewerDialog({ docUrl, triggerText }: { docUrl: string; triggerText: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto font-normal">
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{triggerText}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 -mx-6 -mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={docUrl} alt={triggerText} className="w-full h-auto rounded-b-lg" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ userId }: { userId: string }) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!firestore) return;
    setIsDeleting(true);
    const userDocRef = doc(firestore, 'users', userId);

    try {
      await deleteDoc(userDocRef);
      toast({
        title: 'User Deleted',
        description: 'The user has been permanently deleted.',
      });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Deleting User',
          description: error.message,
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the user and all their associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, delete user
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminPage() {
  const { profile, loading: userLoading } = useUser();
  const router = useRouter();
  const { data: users, loading: usersLoading } = useCollection<UserProfile>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, roleFilter]);

  if (userLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  // Security check: Only allow admins to view this page
  if (!userLoading && profile?.role !== 'admin') {
      router.replace('/dashboard');
      return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel - User Management</CardTitle>
          <CardDescription>View and manage all users on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs value={roleFilter} onValueChange={setRoleFilter} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="student">Students</TabsTrigger>
                <TabsTrigger value="owner">Owners</TabsTrigger>
                <TabsTrigger value="admin">Admins</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {usersLoading ? (
              <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role / Status</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">
                          {user.role}
                        </Badge>
                        {user.role === 'owner' && (
                          <Badge
                            variant={
                              user.verificationStatus === 'approved'
                                ? 'default'
                                : user.verificationStatus === 'pending'
                                ? 'outline'
                                : 'secondary'
                            }
                            className="capitalize ml-2"
                          >
                            {user.verificationStatus || 'unverified'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'student' && user.aadharUrl ? (
                          <DocumentViewerDialog docUrl={user.aadharUrl} triggerText="View Aadhar" />
                        ) : user.role === 'owner' && (user.aadharProofUrl || user.residentProofUrl) ? (
                          <div className="flex flex-col gap-1 items-start">
                            {user.aadharProofUrl && (
                              <DocumentViewerDialog docUrl={user.aadharProofUrl} triggerText="View Aadhar" />
                            )}
                            {user.residentProofUrl && (
                              <DocumentViewerDialog docUrl={user.residentProofUrl} triggerText="View Residence Proof" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No documents</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                          {/* Prevent admin from deleting themselves */}
                          {profile && profile.id !== user.id && (
                              <DeleteUserDialog userId={user.id} />
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <h3 className="text-xl font-semibold">No Users Found</h3>
                  <p>Try adjusting your search or filter.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
