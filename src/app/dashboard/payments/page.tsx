
'use client';

import React, { useMemo } from 'react';
import { useCollection, useUser } from '@/firebase';
import type { Inquiry } from '@/lib/types';
import { where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, IndianRupee, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function ConfirmedPaymentsPage() {
  const { user, loading: userLoading } = useUser();

  const { data: inquiries, loading: inquiriesLoading } = useCollection<Inquiry>(
    'inquiries',
    user
      ? [
          where('ownerId', '==', user.uid),
          where('quotation.status', '==', 'paid'),
        ]
      : []
  );

  const loading = userLoading || inquiriesLoading;

  const summary = useMemo(() => {
    if (!inquiries) return { gross: 0, fees: 0, net: 0 };

    const gross = inquiries.reduce((acc, inquiry) => acc + (inquiry.quotation?.total || 0), 0);
    const fees = inquiries.reduce((acc, inquiry) => acc + (inquiry.quotation?.platformFee || 0), 0);
    const net = gross - fees;

    return { gross, fees, net };
  }, [inquiries]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Your Earnings</CardTitle>
          <CardDescription>
            An overview of your revenue from confirmed bookings on RoomMateMatch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="grid md:grid-cols-3 gap-4 text-center">
                 <Skeleton className="h-24 w-full"/>
                 <Skeleton className="h-24 w-full"/>
                 <Skeleton className="h-24 w-full"/>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Gross Revenue</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">₹{summary.gross.toLocaleString('en-IN')}</div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Total amount paid by students.</p>
                    </CardContent>
                </Card>
                 <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Platform Fees</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-700 dark:text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900 dark:text-red-200">- ₹{summary.fees.toLocaleString('en-IN')}</div>
                        <p className="text-xs text-red-600 dark:text-red-400">5% commission on monthly rent.</p>
                    </CardContent>
                </Card>
                 <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">Your Net Earnings</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-700 dark:text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-200">₹{summary.net.toLocaleString('en-IN')}</div>
                        <p className="text-xs text-green-600 dark:text-green-400">The final amount you receive.</p>
                    </CardContent>
                </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Payment History</CardTitle>
          <CardDescription>
            A complete record of all confirmed bookings and payments for your hostels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center h-12">
                      <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-6 w-24" />
                  </div>
              ))}
            </div>
          ) : inquiries && inquiries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Hostel</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead className="text-right font-bold text-green-600">You Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => {
                  const totalPaid = inquiry.quotation?.total ?? 0;
                  const platformFee = inquiry.quotation?.platformFee ?? 0;
                  const ownerEarning = totalPaid - platformFee;

                  return (
                    <TableRow key={inquiry.id}>
                      <TableCell className="font-medium">{inquiry.userName}</TableCell>
                      <TableCell>{inquiry.hostelName}</TableCell>
                      <TableCell>
                        {inquiry.quotation?.createdAt
                          ? format(new Date(inquiry.quotation.createdAt), 'PP')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>₹{totalPaid.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-red-600">- ₹{platformFee.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ₹{ownerEarning.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold">All Clear!</h3>
              <p>You have no confirmed payments yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
