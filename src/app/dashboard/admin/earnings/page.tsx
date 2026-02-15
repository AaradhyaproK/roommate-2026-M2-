
'use client';
import { useCollection, useUser } from '@/firebase';
import type { Inquiry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, IndianRupee, Loader2, Search } from 'lucide-react';
import { where } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function PlatformEarningsPage() {
  const { profile, loading: userLoading } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: paidInquiries, loading } = useCollection<Inquiry>('inquiries', [
    where('quotation.status', '==', 'paid'),
  ]);

  const filteredInquiries = useMemo(() => {
    if (!paidInquiries) return [];
    return paidInquiries.filter(inquiry => 
      inquiry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.hostelName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [paidInquiries, searchTerm]);

  const totalEarnings = useMemo(() => {
    if (!paidInquiries) return 0;
    return paidInquiries.reduce((acc, inquiry) => acc + (inquiry.quotation?.platformFee || 0), 0);
  }, [paidInquiries]);

  // Security check: Only allow admins to view this page
  if (!userLoading && profile?.role !== 'admin') {
      router.replace('/dashboard');
      return null;
  }

  if (userLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Earnings</CardTitle>
           <CardDescription>Total commission earned from all successful bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <Loader2 className="h-8 w-8 animate-spin"/>
          ) : (
            <div className="text-4xl font-bold flex items-center">
              <IndianRupee className="h-8 w-8 mr-2"/>
              {totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
         <CardHeader>
          <CardTitle>All Transactions</CardTitle>
           <CardDescription>A complete log of all paid bookings on the platform.</CardDescription>
        </CardHeader>
         <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student or hostel name..."
                  className="pl-8 w-full max-w-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {loading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : (
              <>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Hostel</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total Paid</TableHead>
                        <TableHead className="text-right">Platform Fee</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInquiries?.map(inquiry => (
                            <TableRow key={inquiry.id}>
                                <TableCell className="font-medium">{inquiry.userName}</TableCell>
                                <TableCell>{inquiry.hostelName}</TableCell>
                                <TableCell>{inquiry.quotation?.createdAt ? format(new Date(inquiry.quotation!.createdAt), 'PP') : 'N/A'}</TableCell>
                                <TableCell>₹{inquiry.quotation!.total.toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  + ₹{inquiry.quotation!.platformFee?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {filteredInquiries.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold">No Transactions Found</h3>
                        <p>Try adjusting your search, or check if there are any paid bookings.</p>
                    </div>
                )}
              </>
            )}
            { !loading && (!paidInquiries || paidInquiries.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold">No Transactions Yet</h3>
                    <p>There have been no successful payments on the platform.</p>
                </div>
            )}
         </CardContent>
      </Card>
    </div>
  )
}
