'use client';

import { Fragment, createContext, useContext, useState } from 'react'
import { Transition } from '@headlessui/react'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { XMarkIcon } from '@heroicons/react/20/solid'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  title: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (toast: ToastProps) => void
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastProps | null>(null)
  const [show, setShow] = useState(false)

  const showToast = (newToast: ToastProps) => {
    setToast(newToast)
    setShow(true)
    setTimeout(() => setShow(false), 5000) // Hide after 5 seconds
  }

  const getIcon = () => {
    switch (toast?.type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
      case 'info':
        return <InformationCircleIcon className="h-6 w-6 text-blue-400" aria-hidden="true" />
      default:
        return null
    }
  }

  const getBgColor = () => {
    switch (toast?.type) {
      case 'success':
        return 'bg-green-50'
      case 'error':
        return 'bg-red-50'
      case 'info':
        return 'bg-blue-50'
      default:
        return 'bg-gray-50'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Global notification live region */}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          {/* Notification panel */}
          <Transition
            show={show}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${getBgColor()}`}>
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {getIcon()}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{toast?.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{toast?.message}</p>
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      type="button"
                      className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => setShow(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </ToastContext.Provider>
  )
} 