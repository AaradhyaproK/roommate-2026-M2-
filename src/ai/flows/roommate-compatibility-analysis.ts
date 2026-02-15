'use server';

/**
 * @fileOverview Analyzes the compatibility between two student profiles for roommate matching.
 *
 * - roommateCompatibilityAnalysis - A function that analyzes the compatibility between two student profiles.
 * - RoommateProfile - The interface for the roommate profile.
 * - RoommateCompatibilityOutput - The return type for the roommateCompatibilityAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RoommateProfileSchema = z.object({
  skills: z.string().describe('The skills of the student.'),
  interests: z.string().describe('The interests of the student.'),
  age: z.number().describe('The age of the student.'),
  occupation: z.string().describe('The occupation of the student.'),
  preferences: z.string().describe('The preferences of the student.'),
});

export type RoommateProfile = z.infer<typeof RoommateProfileSchema>;

const RoommateCompatibilityOutputSchema = z.object({
  compatibilityAnalysis: z
    .string()
    .describe('An analysis of the compatibility between the two students.'),
  compatibilityScore: z
    .number()
    .describe('A score indicating the compatibility between the two students.'),
});

export type RoommateCompatibilityOutput = z.infer<typeof RoommateCompatibilityOutputSchema>;

export async function roommateCompatibilityAnalysis(
  profile1: RoommateProfile,
  profile2: RoommateProfile
): Promise<RoommateCompatibilityOutput> {
  return roommateCompatibilityAnalysisFlow({
    profile1,
    profile2,
  });
}

const prompt = ai.definePrompt({
  name: 'roommateCompatibilityPrompt',
  input: {
    schema: z.object({
      profile1: RoommateProfileSchema,
      profile2: RoommateProfileSchema,
    }),
  },
  output: {schema: RoommateCompatibilityOutputSchema},
  prompt: `You are an AI roommate compatibility analyst. You will be provided
with two student profiles and you need to analyze their compatibility as
roommates.

Consider their skills, interests, age, occupation, and preferences to determine
how well they would get along as roommates.

Profile 1:
Skills: {{{profile1.skills}}}
Interests: {{{profile1.interests}}}
Age: {{{profile1.age}}}
Occupation: {{{profile1.occupation}}}
Preferences: {{{profile1.preferences}}}

Profile 2:
Skills: {{{profile2.skills}}}
Interests: {{{profile2.interests}}}
Age: {{{profile2.age}}}
Occupation: {{{profile2.occupation}}}
Preferences: {{{profile2.preferences}}}

Analyze their compatibility and provide a compatibility score between 0 and 100.

{{output}}`,
});

const roommateCompatibilityAnalysisFlow = ai.defineFlow(
  {
    name: 'roommateCompatibilityAnalysisFlow',
    inputSchema: z.object({
      profile1: RoommateProfileSchema,
      profile2: RoommateProfileSchema,
    }),
    outputSchema: RoommateCompatibilityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
