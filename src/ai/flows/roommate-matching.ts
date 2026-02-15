'use server';

/**
 * @fileOverview This file is intended for AI-based roommate matching.
 * The current implementation uses a simple, non-AI matching logic.
 * The Genkit flow structure is kept for potential future AI integration.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getPotentialRoommates } from '@/services/firestore';


const getRoommateProfilesTool = ai.defineTool(
  {
    name: 'getRoommateProfiles',
    description: 'Retrieves a list of profiles for potential roommates from the platform.',
    inputSchema: z.object({
      excludeUserId: z.string().describe("The ID of the user to exclude from the search, usually the one making the request.")
    }),
    outputSchema: z.array(z.object({
      id: z.string(),
      name: z.string().optional(),
      age: z.number().optional(),
      occupation: z.string().optional(),
      skills: z.string().optional(),
      interests: z.string().optional(),
      preferences: z.string().optional(),
      city: z.string().optional(),
      preferredCity: z.string().optional(),
    })),
  },
  async ({excludeUserId}) => {
    console.log('Fetching potential roommates, excluding:', excludeUserId);
    return getPotentialRoommates(excludeUserId);
  }
);


const RoommateMatchInputSchema = z.object({
  currentUser: z.object({
    id: z.string(),
    skills: z.string().optional(),
    interests: z.string().optional(),
    age: z.number().optional(),
    occupation: z.string().optional(),
    preferences: z.string().optional(),
    city: z.string().optional(),
    preferredCity: z.string().optional(),
  }).describe("The profile of the user seeking a roommate."),
});
export type RoommateMatchInput = z.infer<typeof RoommateMatchInputSchema>;

const RoommateMatchOutputSchema = z.object({
  roommateSuggestion: z
    .string()
    .describe(
      'A description of the suggested roommate, including their compatibility with the student based on the input data.'
    ),
  compatibilityScore: z
    .number()
    .describe(
      'A score (out of 100) indicating the compatibility between the student and the suggested roommate.'
    ),
  rationale: z
    .string()
    .describe(
      'Explanation of why the suggested roommate is a good match, based on the input data.'
    ),
});
export type RoommateMatchOutput = z.infer<typeof RoommateMatchOutputSchema>;

// This function is not currently used but is kept for future AI implementation.
export async function roommateMatch(input: RoommateMatchInput): Promise<RoommateMatchOutput> {
  // This would be where the AI logic would go.
  // For now, it throws an error as it's been replaced by simple matching.
  throw new Error("AI roommate matching is disabled. Simple matching is used instead.");
}
