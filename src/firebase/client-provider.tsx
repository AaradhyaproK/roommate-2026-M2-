'use client';

import React, { useMemo } from 'react';
import { initializeFirebase, FirebaseProvider } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: React.ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const { firebaseApp, auth, firestore } = useMemo(() => initializeFirebase(), []);

  const value = {
    firebaseApp: firebaseApp as FirebaseApp,
    auth: auth as Auth,
    firestore: firestore as Firestore,
  };

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}
