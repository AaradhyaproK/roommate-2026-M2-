'use server';

/**
 * @fileOverview This file defines a Genkit flow for enhancing hostel descriptions using AI.
 *
 * It provides suggestions to hostel owners on how to improve their hostel's description based on its features and amenities.
 *
 * - `enhanceHostelDescription` - A function that takes hostel details as input and returns enhanced description suggestions.
 * - `EnhanceHostelDescriptionInput` - The input type for the `enhanceHostelDescription` function.
 * - `EnhanceHostelDescriptionOutput` - The return type for the `enhanceHostelDescription` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceHostelDescriptionInputSchema = z.object({
  hostelName: z.string().describe('The name of the hostel.'),
  location: z.string().describe('The location of the hostel.'),
  amenities: z.string().describe('A comma-separated list of amenities offered by the hostel.'),
  currentDescription: z.string().describe('The current description of the hostel.'),
});

export type EnhanceHostelDescriptionInput = z.infer<typeof EnhanceHostelDescriptionInputSchema>;

const EnhanceHostelDescriptionOutputSchema = z.object({
  enhancedDescription: z
    .string()
    .describe('An enhanced description of the hostel, incorporating the provided details and amenities.'),
});

export type EnhanceHostelDescriptionOutput = z.infer<typeof EnhanceHostelDescriptionOutputSchema>;

export async function enhanceHostelDescription(
  input: EnhanceHostelDescriptionInput
): Promise<EnhanceHostelDescriptionOutput> {
  return enhanceHostelDescriptionFlow(input);
}

const enhanceHostelDescriptionPrompt = ai.definePrompt({
  name: 'enhanceHostelDescriptionPrompt',
  input: {schema: EnhanceHostelDescriptionInputSchema},
  output: {schema: EnhanceHostelDescriptionOutputSchema},
  prompt: `You are an expert marketing copywriter specializing in hostels.

  Given the following details about a hostel, create an engaging and informative description to attract potential tenants.
  The enhanced description should highlight the hostel's best features and appeal to the target audience (students and young travelers).

  Hostel Name: {{hostelName}}
  Location: {{location}}
  Amenities: {{amenities}}
  Current Description: {{currentDescription}}

  Enhanced Description:`,
});

const enhanceHostelDescriptionFlow = ai.defineFlow(
  {
    name: 'enhanceHostelDescriptionFlow',
    inputSchema: EnhanceHostelDescriptionInputSchema,
    outputSchema: EnhanceHostelDescriptionOutputSchema,
  },
  async input => {
    const {output} = await enhanceHostelDescriptionPrompt(input);
    return output!;
  }
);
