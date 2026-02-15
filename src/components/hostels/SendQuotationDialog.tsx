
'use client';

import React, { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import type { Hostel, Inquiry, QuotationItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { IndianRupee, Loader2, PlusCircle, Trash2, FileText } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

interface SendQuotationDialogProps {
  inquiry: Inquiry;
  hostel: Hostel;
}

export function SendQuotationDialog({ inquiry, hostel }: SendQuotationDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Initialize with rent and deposit
    const initialItems: QuotationItem[] = [
      { id: 'rent', name: 'First Month\'s Rent', amount: hostel.price || 0 },
    ];
    if (hostel.deposit && hostel.deposit > 0) {
      initialItems.push({ id: 'deposit', name: 'Security Deposit', amount: hostel.deposit });
    }
    setItems(initialItems);
  }, [hostel]);

  useEffect(() => {
    const newTotal = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    setTotal(newTotal);
  }, [items]);

  const handleItemChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newItems = [...items];
    const itemToUpdate = { ...newItems[index]! };
    if (field === 'amount') {
      itemToUpdate.amount = Number(value) || 0;
    } else {
      itemToUpdate.name = String(value);
    }
    newItems[index] = itemToUpdate;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { id: `custom-${Date.now()}`, name: '', amount: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSendQuotation = async () => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const quotationData = {
      items,
      total,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    const inquiryDocRef = doc(firestore, 'inquiries', inquiry.id);

    try {
      await updateDoc(inquiryDocRef, {
        quotation: quotationData,
      });
      toast({
        title: 'Quotation Sent!',
        description: `A quotation has been sent to ${inquiry.userName}.`,
      });
      setDialogOpen(false);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: inquiryDocRef.path,
          operation: 'update',
          requestResourceData: { quotation: quotationData },
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Sending Quotation',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="default" className="w-full mb-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <FileText className="mr-2 h-4 w-4"/>
          Send Quotation
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Create Quotation for {inquiry.userName}</AlertDialogTitle>
          <AlertDialogDescription>
            Add or remove items to build the quotation. The total will be calculated automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                    <Input
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Item name (e.g., Mess Charges)"
                        disabled={item.id === 'rent' || item.id === 'deposit'}
                    />
                    <div className="relative">
                       <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                            className="w-32 pl-8"
                        />
                    </div>
                    {item.id !== 'rent' && item.id !== 'deposit' && (
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Item
            </Button>
        </div>

        <Separator />

        <div className="flex justify-between items-center font-bold text-lg">
            <Label>Total Amount</Label>
            <div className="flex items-center">
                <IndianRupee className="h-5 w-5 mr-1" />
                <span>{total.toLocaleString('en-IN')}</span>
            </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSendQuotation} disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Quotation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
