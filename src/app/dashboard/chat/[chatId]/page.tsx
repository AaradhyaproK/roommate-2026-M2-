'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useUser } from '@/firebase';
import type { Chat, Message } from '@/lib/types';
import {
  collection,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, profile } = useUser();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = params.chatId as string;

  const { data: chat, loading: chatLoading } = useDoc<Chat>(`chats/${chatId}`);
  const { data: messages, loading: messagesLoading } = useCollection<Message>(
    `chats/${chatId}/messages`,
    [orderBy('createdAt', 'asc')]
  );

  const otherParticipantId = chat?.participantIds.find(id => id !== user?.uid);
  const otherParticipant = chat && otherParticipantId ? chat.participants[otherParticipantId] : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
     if (!chatLoading && !chat) {
        // If loading is finished and there's no chat, redirect
        router.replace('/dashboard/chat');
     }
  }, [chat, chatLoading, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !firestore) return;

    setIsSending(true);

    const messageData = {
      chatId,
      senderId: user.uid,
      text: newMessage,
      createdAt: serverTimestamp(),
    };

    const messagesCollectionRef = collection(firestore, `chats/${chatId}/messages`);
    const chatDocRef = doc(firestore, 'chats', chatId);

    try {
      addDoc(messagesCollectionRef, messageData).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: messagesCollectionRef.path,
          operation: 'create',
          requestResourceData: messageData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });

      // Update last message on chat
      updateDoc(chatDocRef, {
        lastMessage: {
          text: newMessage,
          createdAt: serverTimestamp(),
          senderId: user.uid,
        },
        updatedAt: serverTimestamp(),
      });

      setNewMessage('');
    } catch (error) {
       if (!(error instanceof FirestorePermissionError)) {
          console.error('Failed to send message:', error);
       }
    } finally {
      setIsSending(false);
    }
  };
  
  if (chatLoading || messagesLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  if (!chat) {
    return null; // Or a "Chat not found" message
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] bg-background rounded-xl border">
      <div className="flex items-center p-4 border-b">
         {otherParticipant && (
            <div className="flex items-center gap-4">
                 <Avatar>
                    <AvatarImage src={otherParticipant.avatarUrl} />
                    <AvatarFallback>{otherParticipant.name?.[0]}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold font-headline">{otherParticipant.name}</h2>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map(message => {
          const isSender = message.senderId === user?.uid;
          return (
            <div key={message.id} className={cn('flex items-end gap-2', isSender ? 'justify-end' : 'justify-start')}>
              {!isSender && otherParticipant && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={otherParticipant.avatarUrl} />
                  <AvatarFallback>{otherParticipant.name?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs md:max-w-md lg:max-w-lg rounded-xl px-4 py-2 text-sm',
                  isSender
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-secondary text-secondary-foreground rounded-bl-none'
                )}
              >
                <p>{message.text}</p>
              </div>
               {isSender && profile && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatarUrl} />
                  <AvatarFallback>{profile.name?.[0]}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
