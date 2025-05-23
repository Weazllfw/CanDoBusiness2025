'use client'

import { useEffect, useMemo } from 'react';
import { useMessages, MessageView, Conversation } from '@/lib/hooks/useMessages';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';
import ThreadList from '@/components/messages/ThreadList';
import ThreadHeader from '@/components/messages/ThreadHeader';
import { useRouter } from 'next/navigation';

interface MessageClientProps {
  currentUserId: string;
  partnerId: string | null;
  partnerType: 'user' | 'company' | null;
}

export default function MessageClient({
  currentUserId,
  partnerId,
  partnerType
}: MessageClientProps) {
  const router = useRouter();
  const {
    conversations,
    currentMessages,
    isLoadingConversations,
    isLoadingMessages,
    loadConversationMessages,
    sendMessage,
    fetchConversations, 
  } = useMessages(currentUserId);

  const activeConversation = useMemo(() => {
    if (!partnerId || !partnerType) return null;
    return conversations.find(c => c.partner_id === partnerId && c.partner_type === partnerType);
  }, [conversations, partnerId, partnerType]);

  useEffect(() => {
    if (partnerId && partnerType) {
      loadConversationMessages(partnerId, partnerType);
    } else {
      if (!isLoadingConversations && conversations.length > 0) {
        const firstConv = conversations[0];
        router.push(`/messages/${firstConv.partner_type}/${firstConv.partner_id}`);
      }
    }
  }, [partnerId, partnerType, loadConversationMessages, conversations, isLoadingConversations, router]);

  const handleSendMessage = async (content: string) => {
    if (!partnerId || !partnerType) {
      console.error("Cannot send message, no recipient selected (partnerId or partnerType is null).");
      return;
    }
    try {
      await sendMessage(partnerId, content, null, partnerType === 'company');
    } catch (error) {
      console.error('Error sending message from client:', error);
    }
  };
  
  return (
    <div className="flex h-full">
      <div className="w-96 border-r border-gray-200 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <p className="p-4 text-gray-500">Loading conversations...</p>
          ) : conversations.length > 0 ? (
            <ThreadList 
              conversations={conversations} 
              selectedPartnerId={partnerId}
              currentUserId={currentUserId}
            />
          ) : (
            <p className="p-4 text-gray-500">No conversations yet.</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-gray-50">
        {partnerId && partnerType && activeConversation ? (
          <>
            <ThreadHeader 
              partnerName={activeConversation.partner_name}
              partnerAvatarUrl={activeConversation.partner_avatar_url}
              partnerType={activeConversation.partner_type}
            />
            <div className="flex-1 overflow-y-auto p-4">
              <MessageList
                messages={currentMessages}
                currentUserId={currentUserId}
              />
            </div>
            <MessageInput
              onSend={handleSendMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
} 