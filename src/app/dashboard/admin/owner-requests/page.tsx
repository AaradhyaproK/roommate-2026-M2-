'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, DocumentData, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

// NOTE: You should add logic here to ensure only admins can access this page.
// Example:
// import { useUser } from '@/firebase/auth';
// import { useRouter } from 'next/navigation';

interface OwnerRequest extends DocumentData {
  id: string;
  name: string;
  email: string;
  ownerUid: string;
  status: 'pending' | 'approved' | 'rejected';
  aadharProofUrl: string;
  residentProofUrl: string;
  requestedAt: string;
}

export default function OwnerRequestsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // const { user, loading: userLoading } = useUser();
  // const router = useRouter();

  useEffect(() => {
    // if (!userLoading && user?.role !== 'admin') {
    //   router.push('/'); // Redirect non-admins
    //   return;
    // }

    if (!firestore) return;

    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const requestsCollection = collection(firestore, 'owner-requests');
        const q = query(requestsCollection, where('status', '==', 'pending'), orderBy('requestedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const pendingRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OwnerRequest));
        setRequests(pendingRequests);
      } catch (error) {
        console.error('Error fetching owner requests: ', error);
        toast({
          variant: 'destructive',
          title: 'Failed to fetch requests',
          description: 'There was an error fetching pending owner requests.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [firestore, toast]);

  const handleRequestUpdate = async (request: OwnerRequest, newStatus: 'approved' | 'rejected') => {
    if (!firestore) return;
    setIsProcessing(request.id);
    try {
      const requestDocRef = doc(firestore, 'owner-requests', request.id);
      await updateDoc(requestDocRef, { status: newStatus });

      if (newStatus === 'approved') {
        const userDocRef = doc(firestore, 'users', request.ownerUid!);
        await updateDoc(userDocRef, {
          verificationStatus: 'approved',
          aadharProofUrl: request.aadharProofUrl,
          residentProofUrl: request.residentProofUrl,
        });
      }

      setRequests(prevRequests => prevRequests.filter(req => req.id !== request.id));

      toast({
        title: `Request ${newStatus}`,
        description: `The owner request has been successfully ${newStatus}.`,
      });
    } catch (error) {
      console.error(`Error updating request ${request.id}:`, error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error updating the request status.',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <main className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Hostel Owner Requests</CardTitle>
                <CardDescription>Review and approve or reject new hostel owner signups.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-center text-muted-foreground">No pending requests.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.name}</TableCell>
                      <TableCell>{req.email}</TableCell>
                      <TableCell>
                        <Link href={req.aadharProofUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary mr-4">
                          Aadhar
                        </Link>
                        <Link href={req.residentProofUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                          Residence
                        </Link>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleRequestUpdate(req, 'approved')} disabled={isProcessing === req.id}>
                          {isProcessing === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4 text-green-600" />} Approve
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleRequestUpdate(req, 'rejected')} disabled={isProcessing === req.id}>
                          {isProcessing === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </main>
  );
}