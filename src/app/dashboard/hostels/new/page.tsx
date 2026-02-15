import { HostelForm } from '@/components/hostels/HostelForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewHostelPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Add a New Hostel</CardTitle>
          <CardDescription>Fill out the form below to list your property on RoomMateMatch.</CardDescription>
        </CardHeader>
        <CardContent>
          <HostelForm />
        </CardContent>
      </Card>
    </div>
  );
}
