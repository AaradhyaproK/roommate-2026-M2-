import { RoommateFinder } from "@/components/matching/RoommateFinder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FindRoommatePage() {
    return (
        <div className="mx-auto max-w-6xl">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Find Your Perfect Roommate</CardTitle>
                    <CardDescription>
                        Click the button below to get an AI-powered roommate suggestion based on your profile. Make sure your profile is up-to-date!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RoommateFinder />
                </CardContent>
            </Card>
        </div>
    );
}
