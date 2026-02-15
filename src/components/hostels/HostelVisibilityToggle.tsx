
'use client';

import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Hostel } from '@/lib/types';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface HostelVisibilityToggleProps {
  hostel: Hostel;
}

export function HostelVisibilityToggle({ hostel }: HostelVisibilityToggleProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleVisibilityChange = async (isChecked: boolean) => {
    if (!firestore) return;
    setIsUpdating(true);

    const hostelDocRef = doc(firestore, 'hostels', hostel.id);
    const newHiddenStatus = !isChecked;

    try {
      await updateDoc(hostelDocRef, {
        isHidden: newHiddenStatus,
      }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: hostelDocRef.path,
          operation: 'update',
          requestResourceData: { isHidden: newHiddenStatus },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });

      toast({
        title: `Hostel ${newHiddenStatus ? 'Hidden' : 'Made Visible'}`,
        description: `${hostel.name} is now ${newHiddenStatus ? 'hidden from' : 'visible to'} students.`,
      });
    } catch (error) {
      if (!(error instanceof FirestorePermissionError)) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not update the hostel visibility.',
        });
      }
      // Revert the switch state on failure
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin"/> :
        <Switch
            id={`visibility-toggle-${hostel.id}`}
            checked={!hostel.isHidden}
            onCheckedChange={handleVisibilityChange}
            aria-label="Toggle hostel visibility"
        />
       }
      <Label htmlFor={`visibility-toggle-${hostel.id}`} className={hostel.isHidden ? 'text-destructive' : 'text-green-600'}>
        {hostel.isHidden ? 'Hidden' : 'Visible'}
      </Label>
    </div>
  );
}
