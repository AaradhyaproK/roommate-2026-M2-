import { BedDouble } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <BedDouble className="h-7 w-7 text-primary" />
      <span className="font-extrabold text-xl font-headline">RoomMateMatch</span>
    </div>
  );
}
