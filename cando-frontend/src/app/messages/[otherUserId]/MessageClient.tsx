'use client'

import { useEffect } from 'react';
import { useMessages, MessageView, Conversation } from '@/lib/hooks/useMessages';
import MessageList from '@/components/messages/MessageList';
import MessageInput from '@/components/messages/MessageInput';
import ThreadList from '@/components/messages/ThreadList';
import ThreadHeader from '@/components/messages/ThreadHeader';
import { useRouter } from 'next/navigation'; // For redirecting if no otherUserId

interface MessageClientProps {
  currentUserId: string;
  otherUserId: string | null; // Can be null if no chat is selected
}

export default function MessageClient({
  currentUserId,
  otherUserId,
}: MessageClientProps) {
  const router = useRouter();
  const {
    conversations,
    currentMessages,
    isLoadingConversations,
    isLoadingMessages,
    loadConversationMessages,
    sendMessage,
    fetchConversations, // Added for potential manual refresh
  } = useMessages(currentUserId);

  const activeConversation = conversations.find(c => c.other_user_id === otherUserId);

  useEffect(() => {
    if (otherUserId) {
      loadConversationMessages(otherUserId);
    } else {
      // If no otherUserId is provided, and there are conversations, redirect to the first one.
      // Or, display a "Select a conversation" message.
      if (!isLoadingConversations && conversations.length > 0) {
        // Commenting out redirect for now, to allow a state where no chat is selected.
        router.push(`/messages/${conversations[0].other_user_id}`);
      }
    }
  }, [otherUserId, loadConversationMessages, conversations, isLoadingConversations, router]);

  const handleSendMessage = async (content: string) => {
    if (!otherUserId) {
      console.error("Cannot send message, no recipient selected (otherUserId is null).");
      return;
    }
    try {
      await sendMessage(otherUserId, content);
    } catch (error) {
      console.error('Error sending message from client:', error);
      // Potentially show a toast notification to the user
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar for conversations */}
      <div className="w-96 border-r border-gray-200 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Messages</h2>
          {/* Potentially add a "New Message" button here */}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <p className="p-4 text-gray-500">Loading conversations...</p>
          ) : conversations.length > 0 ? (
            <ThreadList 
              conversations={conversations} 
              currentOtherUserId={otherUserId || undefined} 
            />
          ) : (
            <p className="p-4 text-gray-500">No conversations yet.</p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full bg-gray-50">
        {otherUserId && activeConversation ? (
          <>
            <ThreadHeader 
              otherUserName={activeConversation.other_user_name}
              otherUserAvatar={activeConversation.other_user_avatar}
              // isTyping={isTyping} // isTyping not part of new useMessages hook yet
            />
            <div className="flex-1 overflow-y-auto p-4">
              <MessageList
                messages={currentMessages}
                currentUserId={currentUserId}
                // hasMore and onLoadMore would be needed if we implement pagination for messages
                // For simplicity, current useMessages loads all messages for a conversation
              />
            </div>
            <MessageInput
              onSend={handleSendMessage}
              // replyTo and onCancelReply would be for message reply feature (future enhancement)
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