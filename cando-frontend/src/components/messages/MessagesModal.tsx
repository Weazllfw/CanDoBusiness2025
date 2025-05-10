'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { EllipsisHorizontalIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useMessages, Conversation as HookConversation } from '@/lib/hooks/useMessages'
import { useAuth } from '@/lib/hooks/useAuth'

interface MessagesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
  const { user } = useAuth()
  const { 
    conversations, 
    currentMessages, 
    isLoadingConversations,
    loadConversationMessages, 
    sendMessage 
  } = useMessages(user?.id || '')
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')

  useEffect(() => {
    if (selectedConversationId) {
      loadConversationMessages(selectedConversationId)
    }
  }, [selectedConversationId, loadConversationMessages])

  useEffect(() => {
    if (!selectedConversationId && conversations && conversations.length > 0) {
      const firstConv = conversations[0];
      if (firstConv && firstConv.other_user_id) {
        setSelectedConversationId(firstConv.other_user_id);
      } else {
        console.warn('First conversation in list does not have expected structure (other_user_id) for auto-selection.');
      }
    }
  }, [conversations, selectedConversationId]);

  const handleSendMessage = async () => {
    if (!selectedConversationId || !messageText.trim()) return
    try {
      await sendMessage(selectedConversationId, messageText)
      setMessageText('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const activeConversationDetails = selectedConversationId 
    ? conversations.find(c => c.other_user_id === selectedConversationId)
    : null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-white shadow-xl transition-all w-full max-w-4xl h-[600px] flex">
                <div className="w-80 border-r border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recent conversations</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {isLoadingConversations ? (
                        <p className="p-4 text-sm text-gray-500">Loading conversations...</p>
                    ) : conversations.map((conversation: HookConversation) => (
                      <button
                        key={conversation.other_user_id}
                        onClick={() => setSelectedConversationId(conversation.other_user_id)}
                        className={`w-full text-left p-4 hover:bg-gray-50 flex items-start space-x-3 ${
                          selectedConversationId === conversation.other_user_id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {conversation.other_user_avatar ? (
                            <Image
                              src={conversation.other_user_avatar}
                              alt={conversation.other_user_name || 'User'}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                              {(conversation.other_user_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{conversation.other_user_name || 'Unknown User'}</p>
                            {conversation.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-600 text-xs font-medium text-white">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{conversation.last_message_content}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  {activeConversationDetails ? (
                    <>
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          {activeConversationDetails.other_user_avatar ? (
                              <Image
                                src={activeConversationDetails.other_user_avatar}
                                alt={activeConversationDetails.other_user_name || 'User'}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                                 {(activeConversationDetails.other_user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                          )}
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                              {activeConversationDetails.other_user_name || 'Unknown User'}
                            </h2>
                            <p className="text-sm text-gray-500">Active now</p>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-500">
                          <EllipsisHorizontalIcon className="h-6 w-6" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''
                            }`}
                          >
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                                {message.sender_id === user?.id 
                                  ? (user?.email?.charAt(0) || 'M').toUpperCase()
                                  : (activeConversationDetails?.other_user_name?.charAt(0) || 'O').toUpperCase()
                                }
                              </div>
                            </div>
                            <div className={`flex-1 ${message.sender_id === user?.id ? 'text-right' : ''}`}>
                              <div
                                className={`inline-block rounded-lg px-4 py-2 max-w-lg ${
                                  message.sender_id === user?.id
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-200 p-4">
                        <div className="flex items-end space-x-3">
                          <div className="flex-1">
                            <textarea
                              rows={1}
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendMessage()
                                }
                              }}
                              className="block w-full resize-none rounded-lg border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder="Write a message..."
                            />
                          </div>
                          <button
                            onClick={handleSendMessage}
                            className="rounded-full bg-primary-600 p-2 text-white shadow-sm hover:bg-primary-700"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <LockClosedIcon className="h-full w-full" />
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No conversation selected</h3>
                        <p className="mt-1 text-sm text-gray-500">Choose a conversation from the list to start chatting</p>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
} 