import type { Hostel } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getImage = (id: string) => {
  const img = PlaceHolderImages.find((i) => i.id === id);
  return {
    url: img?.imageUrl ?? 'https://picsum.photos/seed/placeholder/600/400',
    hint: img?.imageHint ?? 'placeholder',
  };
};

export const featuredHostels: Hostel[] = [];
export const allHostels: Hostel[] = [];
