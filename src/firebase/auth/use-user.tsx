
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, IdTokenResult } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UserProfile } from '@/lib/types';


export interface User extends FirebaseUser {
  // Add any custom user properties here
}

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<IdTokenResult['claims'] | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); 

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true); // Reset loading state on user change
      if (firebaseUser) {
        setUser(firebaseUser as User);
        // We will continue loading until the profile is fetched in the other effect
      } else {
        // If no user, we are done loading
        setUser(null);
        setClaims(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    // If there's no user object, we are not loading profile data
    if (!user) {
        // if auth is still resolving, `user` is null, so we wait.
        // if auth is done and `user` is null, onAuthStateChanged sets loading to false.
        return;
    }

    // If we have a user but no firestore, we are still waiting
    if (!firestore) return;

    const profileDocRef = doc(firestore, `users/${user.uid}`);
    const unsubscribe = onSnapshot(
      profileDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            ...data,
            id: docSnap.id,
             // Generate a default avatar if one isn't provided
            avatarUrl: data.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${data.name || user.email}`,
          } as UserProfile);
        } else {
          setProfile({ id: user.uid, email: user.email! });
        }
        // Now that we have the profile (or know it doesn't exist), we are done loading.
        setLoading(false); 
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: profileDocRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error(err); // Keep the original error log for context
        setProfile(null);
        setLoading(false); // Also stop loading on error
      }
    );
    return () => unsubscribe();
  }, [user, firestore]);


  useEffect(() => {
    if (user) {
        user.getIdTokenResult().then((idTokenResult) => {
            setClaims(idTokenResult.claims);
        });
    }
  }, [user]);

  return { user, profile, claims, loading };
}
