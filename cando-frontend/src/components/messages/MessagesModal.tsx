'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { EllipsisHorizontalIcon, LockClosedIcon, UserIcon, BuildingOffice2Icon, ChevronDownIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useMessages, Conversation as HookConversation, MessageView } from '@/lib/hooks/useMessages'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase' // Import Database type

interface MessagesModalProps {
  isOpen: boolean
  onClose: () => void
}

type AdministeredCompany = Database['public']['Functions']['get_user_administered_companies']['Returns'][number];

export default function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
  const { user } = useAuth()
  const { 
    conversations, 
    currentMessages, 
    isLoadingConversations,
    loadConversationMessages, 
    sendMessage 
  } = useMessages(user?.id || '')
  
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; type: 'user' | 'company' } | null>(null);
  const [messageText, setMessageText] = useState('')
  const [sendingAsCompanyId, setSendingAsCompanyId] = useState<string | null>(null);
  const [administeredCompanies, setAdministeredCompanies] = useState<AdministeredCompany[]>([]);
  const [isLoadingAdminCompanies, setIsLoadingAdminCompanies] = useState(false);

  useEffect(() => {
    if (selectedPartner) {
      loadConversationMessages(selectedPartner.id, selectedPartner.type);
    }
  }, [selectedPartner, loadConversationMessages])

  useEffect(() => {
    if (!selectedPartner && conversations && conversations.length > 0) {
      const firstConv = conversations[0];
      if (firstConv && firstConv.partner_id && firstConv.partner_type) {
        setSelectedPartner({ id: firstConv.partner_id, type: firstConv.partner_type });
      } else {
        console.warn('First conversation in list does not have expected structure (partner_id, partner_type) for auto-selection.');
      }
    }
  }, [conversations, selectedPartner]);

  useEffect(() => {
    const fetchAdminCompanies = async () => {
      if (!user?.id) return;
      setIsLoadingAdminCompanies(true);
      try {
        const { data, error } = await supabase.rpc('get_user_administered_companies', {
          p_user_id: user.id
        });
        if (error) throw error;
        setAdministeredCompanies(data || []); // Ensure array is set
      } catch (error) {
        console.error('Failed to fetch administered companies:', error);
        setAdministeredCompanies([]); // Ensure array on error
      } finally {
        setIsLoadingAdminCompanies(false);
      }
    };

    if (isOpen && user?.id) {
      fetchAdminCompanies();
    }
  }, [isOpen, user?.id]);

  const handleSendMessage = async () => {
    if (!selectedPartner || !messageText.trim()) return;
    try {
      await sendMessage(
        selectedPartner.id, 
        messageText, 
        sendingAsCompanyId,
        selectedPartner.type === 'company'
      );
      setMessageText('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const activeConversationDetails = selectedPartner
    ? conversations.find(c => c.partner_id === selectedPartner.id && c.partner_type === selectedPartner.type)
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
                        key={conversation.partner_id}
                        onClick={() => setSelectedPartner({ id: conversation.partner_id, type: conversation.partner_type })}
                        className={`w-full text-left p-4 hover:bg-gray-50 flex items-start space-x-3 ${selectedPartner?.id === conversation.partner_id && selectedPartner?.type === conversation.partner_type ? 'bg-gray-50' : ''}`}
                      >
                        <div className="flex-shrink-0">
                          {conversation.partner_avatar_url ? (
                            <Image
                              src={conversation.partner_avatar_url}
                              alt={conversation.partner_name || (conversation.partner_type === 'user' ? 'User' : 'Company')}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                              {conversation.partner_type === 'user' ? 
                                <UserIcon className="h-6 w-6 text-white" /> : 
                                <BuildingOffice2Icon className="h-6 w-6 text-white" />
                              }
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{conversation.partner_name || (conversation.partner_type === 'user' ? 'Unknown User' : 'Unknown Company')}</p>
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
                          {activeConversationDetails.partner_avatar_url ? (
                              <Image
                                src={activeConversationDetails.partner_avatar_url}
                                alt={activeConversationDetails.partner_name || (activeConversationDetails.partner_type === 'user' ? 'User' : 'Company')}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                                 {activeConversationDetails.partner_type === 'user' ? 
                                   <UserIcon className="h-6 w-6 text-white" /> : 
                                   <BuildingOffice2Icon className="h-6 w-6 text-white" />
                                 }
                              </div>
                          )}
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                              {activeConversationDetails.partner_name || (activeConversationDetails.partner_type === 'user' ? 'Unknown User' : 'Unknown Company')}
                            </h2>
                            <p className="text-sm text-gray-500 capitalize">{activeConversationDetails.partner_type} Chat</p>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-500">
                          <EllipsisHorizontalIcon className="h-6 w-6" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentMessages.map((message: MessageView) => (
                          <div
                            key={message.id}
                            className={`flex items-end space-x-3 ${message.is_sent_by_current_user ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className="flex-shrink-0">
                              {!message.is_sent_by_current_user && (
                                message.acting_as_company_id && message.acting_as_company_logo_url ? (
                                  <Image src={message.acting_as_company_logo_url} alt={message.acting_as_company_name || 'Company'} width={40} height={40} className="rounded-full" />
                                ) : message.sender_avatar_url ? (
                                  <Image src={message.sender_avatar_url} alt={message.sender_name || 'User'} width={40} height={40} className="rounded-full" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                                    {message.acting_as_company_id ? 
                                      <BuildingOffice2Icon className="h-6 w-6 text-white" /> : 
                                      <UserIcon className="h-6 w-6 text-white" />
                                    }
                                  </div>
                                )
                              )}
                            </div>
                            <div className={`flex-1 ${message.is_sent_by_current_user ? 'text-right' : 'text-left'}`}>
                              <div
                                className={`inline-block rounded-lg px-4 py-2 max-w-md break-words ${
                                  message.is_sent_by_current_user
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                {!message.is_sent_by_current_user && (
                                  <p className="text-xs font-semibold mb-0.5">
                                    {message.acting_as_company_name ? (
                                      <>{message.acting_as_company_name} <span className="text-gray-500 font-normal">({message.sender_name})</span></>
                                    ) : (
                                      message.sender_name || 'Unknown Sender'
                                    )}
                                  </p>
                                )}
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs mt-1 opacity-70">
                                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
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
                            disabled={!messageText.trim()}
                            className="rounded-full bg-primary-600 p-2 text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                          >
                            Send
                          </button>
                        </div>
                        {administeredCompanies.length > 0 && (
                          <div className="mt-2">
                            <label htmlFor="sendAsCompany" className="block text-sm font-medium text-gray-700">
                              Send as:
                            </label>
                            <div className="mt-1 relative">
                              <select
                                id="sendAsCompany"
                                name="sendAsCompany"
                                value={sendingAsCompanyId || ''}
                                onChange={(e) => setSendingAsCompanyId(e.target.value || null)}
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md appearance-none"
                              >
                                <option value="">Yourself ({user?.email?.split('@')[0]})</option>
                                {administeredCompanies.map((company) => (
                                  <option key={company.id} value={company.id}>
                                    {company.name}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                              </div>
                            </div>
                          </div>
                        )}
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