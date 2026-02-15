
'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  Query,
  DocumentData,
  query,
  where,
  collectionGroup,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  startAt,
  endAt,
  FirestoreError,
  DocumentSnapshot,
  getDoc,
  doc,
  Firestore,
} from 'firebase/firestore';
import { useFirestore } from '..';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Inquiry, UserProfile } from '@/lib/types';


type QueryConstraint =
  | ReturnType<typeof where>
  | ReturnType<typeof orderBy>
  | ReturnType<typeof limit>
  | ReturnType<typeof startAfter>
  | ReturnType<typeof endBefore>
  | ReturnType<typeof limitToLast>
  | ReturnType<typeof startAt>
  | ReturnType<typeof endAt>;

async function resolveUserReference<T>(firestore: Firestore, docData: T & { id: string, userId?: string }): Promise<T> {
    if (!docData || typeof docData !== 'object' || !docData.userId) {
        return docData;
    }

    // Check if the user data is already populated
    if ('user' in docData && docData.user) {
        return docData;
    }

    try {
        const userRef = doc(firestore, 'users', docData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          // Add the user profile to the document data
          (docData as any).user = userSnap.data() as UserProfile;
        } else {
          (docData as any).user = null; // Or a default user object
        }
    } catch (e) {
        console.error("Failed to resolve user reference for userId:", docData.userId, e);
        (docData as any).user = null;
    }
    
    return docData;
}

export function useCollection<T = DocumentData>(
  path: string,
  queryConstraints: QueryConstraint[] = []
) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore) {
      setLoading(false);
      return;
    }

    const collectionRef = collection(firestore, path);
    const q = query(collectionRef, ...queryConstraints);

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        setLoading(true);
        const docsWithRefs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & {id: string, userId?: string}));
        
        // This is a simple implementation. In a real app, you might want to batch these reads.
        const docs = await Promise.all(docsWithRefs.map(d => resolveUserReference(firestore, d)));

        setData(docs);
        setLoading(false);
        setError(null); // Clear previous errors on new data
      },
      (err: FirestoreError) => {
         if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: path,
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(permissionError);
        } else {
            console.error(`Error fetching collection at path: ${path}`, err);
            setError(err);
        }
        setLoading(false);
        setData(null); // Clear data on error
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path, JSON.stringify(queryConstraints)]); // Simple dependency check

  return { data, loading, error };
}
