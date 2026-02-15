'use server';

import { initializeApp, getApps, getApp, AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { UserProfile } from '@/lib/types';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  // Use default credentials for server-side environments
  initializeApp();
}

const db = getFirestore();

/**
 * Fetches a list of potential roommates from the 'users' collection, excluding the current user.
 * This function is intended to be used by a server-side Genkit tool.
 * @deprecated This function is no longer used for simple matching. Data is fetched on the client.
 */
export async function getPotentialRoommates(excludeUserId: string): Promise<UserProfile[]> {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', 'student').get();

    if (snapshot.empty) {
      console.log('No matching documents.');
      return [];
    }
    
    const roommates: UserProfile[] = [];
    snapshot.forEach(doc => {
      // Exclude the user who is making the request
      if (doc.id !== excludeUserId) {
        const data = doc.data();
        roommates.push({
          id: doc.id,
          name: data.name,
          age: data.age,
          occupation: data.occupation,
          skills: data.skills,
          interests: data.interests,
          preferences: data.preferences,
          city: data.city,
          preferredCity: data.preferredCity,
        });
      }
    });

    return roommates;
  } catch (error) {
    console.error("Error fetching potential roommates: ", error);
    // In a real app, you might want to handle this more gracefully
    throw new Error('Could not fetch roommate profiles from the database.');
  }
}
