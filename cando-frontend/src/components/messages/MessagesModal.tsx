'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { EllipsisHorizontalIcon, PlusIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useMessages } from '@/lib/hooks/useMessages'
import { useAuth } from '@/lib/hooks/useAuth'

interface MessagesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
  const { user } = useAuth()
  const { conversations, currentMessages, isLoading, loadConversationMessages, sendMessage } = useMessages(user?.id || '')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages(selectedConversation)
    }
  }, [selectedConversation, loadConversationMessages])

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageText.trim()) return

    try {
      await sendMessage(selectedConversation, messageText)
      setMessageText('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

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
                {/* Left sidebar */}
                <div className="w-80 border-r border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recent conversations</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation.id)}
                        className={`w-full text-left p-4 hover:bg-gray-50 flex items-start space-x-3 ${
                          selectedConversation === conversation.id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {conversation.isCompany ? (
                            <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                              {conversation.name[0]}
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{conversation.name}</p>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-600 text-xs font-medium text-white">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 flex flex-col">
                  {selectedConversation && (
                    <>
                      {/* Chat header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          {conversations.find(c => c.id === selectedConversation)?.isCompany ? (
                            <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                              {conversations.find(c => c.id === selectedConversation)?.name[0]}
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200" />
                          )}
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                              {conversations.find(c => c.id === selectedConversation)?.name}
                            </h2>
                            <p className="text-sm text-gray-500">Active now</p>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-500">
                          <EllipsisHorizontalIcon className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {message.sender.is_company ? (
                                <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                                  {message.sender.name[0]}
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200" />
                              )}
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

                      {/* Message input */}
                      <div className="p-4 border-t border-gray-200">
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
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <button className="text-gray-400 hover:text-gray-500">
                              <span className="sr-only">Attach a file</span>
                              <PlusIcon className="h-5 w-5" />
                            </button>
                          </div>
                          <div className="flex items-center">
                            <div className="flex items-center space-x-2 rounded-full bg-white px-4 py-1 text-sm text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300">
                              <LockClosedIcon className="h-4 w-4" />
                              <span>Upgrade to Premium</span>
                              <span>to send unlimited messages</span>
                            </div>
                            <button className="ml-2 rounded-md bg-primary-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
                              Upgrade
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
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