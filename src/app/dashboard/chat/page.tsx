'use client';
import { useCollection, useUser } from '@/firebase';
import type { Chat } from '@/lib/types';
import { where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

function ChatListItem({ chat, currentUserId }: { chat: Chat; currentUserId: string }) {
  const otherParticipantId = chat.participantIds.find(id => id !== currentUserId)!;
  const otherParticipant = chat.participants[otherParticipantId];
  
  if (!otherParticipant) {
    return null; // Or some fallback UI
  }
  
  const lastMessageTime = chat.lastMessage?.createdAt?.toDate ? 
    formatDistanceToNow(chat.lastMessage.createdAt.toDate(), { addSuffix: true }) :
    '';

  return (
    <Link href={`/dashboard/chat/${chat.id}`} className="block hover:bg-secondary/80 rounded-lg">
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="flex flex-row items-center gap-4 p-4">
          <Avatar className="h-12 w-12 border">
            <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.name} />
            <AvatarFallback>{otherParticipant.name?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg font-semibold">{otherParticipant.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{lastMessageTime}</p>
            </div>
            <p className="text-sm text-muted-foreground truncate">
                {chat.lastMessage ? (chat.lastMessage.senderId === currentUserId ? "You: " : "") + chat.lastMessage.text : "No messages yet"}
            </p>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}


export default function ChatsPage() {
  const { user, loading: userLoading } = useUser();
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(
    'chats',
    user ? [
        where('participantIds', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc'),
    ] : []
  );

  const loading = userLoading || chatsLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
          <CardHeader>
              <CardTitle className="font-headline">Messages</CardTitle>
              <CardDescription>Your recent conversations with other users.</CardDescription>
          </CardHeader>
        <CardContent className="p-0">
          {chats && chats.length > 0 ? (
            <div className="divide-y">
              {chats.map(chat => (
                <ChatListItem key={chat.id} chat={chat} currentUserId={user!.uid} />
              ))}
            </div>
          ) : (
             <div className="p-8 text-center text-muted-foreground">
                <p>You have no messages yet.</p>
                <p className="text-sm">Start a conversation from the "Find a Roommate" page.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
