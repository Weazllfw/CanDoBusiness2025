import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, BuildingOfficeIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon, TagIcon } from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import type { Database } from '@/lib/types/database.types'

type PublicCompany = Database['public']['Views']['public_companies']['Row']

interface CompanyDetailsModalProps {
  company: PublicCompany | null
  isOpen: boolean
  onClose: () => void
  onConnect: (companyId: string) => void
  onMessage: (companyId: string) => void
}

export function CompanyDetailsModal({ company, isOpen, onClose, onConnect, onMessage }: CompanyDetailsModalProps) {
  if (!company) return null

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
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:h-16 sm:w-16">
                    <BuildingOfficeIcon className="h-8 w-8 text-gray-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 flex items-center">
                      {company.name}
                      {company.is_verified && (
                        <ShieldCheckIcon className="ml-2 h-5 w-5 text-green-500" aria-label="Verified" />
                      )}
                    </Dialog.Title>
                    {company.trading_name && (
                      <p className="text-sm text-gray-500">Trading as {company.trading_name}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Location */}
                  {(company.city || company.province) && (
                    <div className="flex items-start">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
                      <div className="ml-3">
                        <p className="text-sm text-gray-900">
                          {[company.city, company.province].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {company.website && (
                    <div className="flex items-start">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 mt-1" />
                      <div className="ml-3">
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-500"
                        >
                          {company.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Industry Tags */}
                  {company.industry_tags && company.industry_tags.length > 0 && (
                    <div className="flex items-start">
                      <TagIcon className="h-5 w-5 text-gray-400 mt-1" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 mb-2">Industries</p>
                        <div className="flex flex-wrap gap-2">
                          {company.industry_tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Capability Tags */}
                  {company.capability_tags && company.capability_tags.length > 0 && (
                    <div className="flex items-start">
                      <TagIcon className="h-5 w-5 text-gray-400 mt-1" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 mb-2">Capabilities</p>
                        <div className="flex flex-wrap gap-2">
                          {company.capability_tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto"
                    onClick={() => onConnect(company.id)}
                  >
                    Connect with Company
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                    onClick={() => onMessage(company.id)}
                  >
                    <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Send Message
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
} 