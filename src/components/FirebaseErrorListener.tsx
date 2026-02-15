'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // The error object itself has a useful toString() method for logging.
      console.error(error.toString());
      
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (isDevelopment) {
        toast({
          variant: 'destructive',
          title: 'Firestore Security Rule Error',
          description: (
            <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
              <code className="text-white">{error.toString()}</code>
            </pre>
          ),
          duration: Infinity, 
        });
      } else {
        toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: 'Could not complete the request due to a permission issue.',
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
