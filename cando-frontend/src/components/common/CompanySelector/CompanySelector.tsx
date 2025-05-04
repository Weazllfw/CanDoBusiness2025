import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon, BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/lib/contexts/CompanyContext'
import { cn } from '@/lib/utils'

export function CompanySelector() {
  const router = useRouter()
  const { currentCompany, companies, isLoading, error, setCurrentCompany } = useCompany()

  const handleCompanySelect = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    if (company) {
      await setCurrentCompany(company)
    }
  }

  const handleCreateNew = () => {
    router.push('/dashboard/companies/new')
  }

  if (error) {
    return (
      <div className="text-sm text-red-600" role="alert">
        Failed to load companies: {error}
      </div>
    )
  }

  const displayCompanyName = isLoading
    ? "Loading..."
    : currentCompany?.name || "Select a company"

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          className={cn(
            "inline-flex w-full items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset",
            isLoading ? "ring-gray-200" : "ring-gray-300 hover:bg-gray-50",
            "focus:outline-none focus:ring-2 focus:ring-blue-500"
          )}
          disabled={isLoading}
          aria-label="Select company"
        >
          <BuildingOfficeIcon
            className={cn(
              "h-5 w-5",
              isLoading ? "text-gray-400" : "text-gray-500"
            )}
            aria-hidden="true"
          />
          <span className="truncate">{displayCompanyName}</span>
          <ChevronDownIcon
            className={cn(
              "h-5 w-5",
              isLoading ? "text-gray-400" : "text-gray-500"
            )}
            aria-hidden="true"
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 z-10 mt-2 w-72 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {companies.length > 0 && (
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Your companies
            </div>
            )}
            {companies.length === 0 && !isLoading && (
               <div className="px-3 py-2 text-sm text-gray-500">
                 No companies found.
               </div>
             )}
            {companies.map((company) => (
              <Menu.Item key={company.id}>
                {({ active }) => (
                  <button
                    onClick={() => handleCompanySelect(company.id)}
                    className={cn(
                      active ? 'bg-gray-100' : '',
                      'flex w-full items-center px-3 py-2 text-sm text-left gap-x-3',
                      company.id === currentCompany?.id ? 'bg-blue-50' : ''
                    )}
                  >
                    <BuildingOfficeIcon
                      className={cn(
                        'h-5 w-5',
                        company.id === currentCompany?.id ? 'text-blue-500' : 'text-gray-400'
                      )}
                    />
                    <div className="flex-1 truncate">
                      <p className={cn(
                        'text-sm font-semibold leading-6',
                        company.id === currentCompany?.id ? 'text-blue-600' : 'text-gray-900'
                      )}>
                        {company.name}
                      </p>
                      {company.trading_name && (
                        <p className="text-xs text-gray-500 truncate">
                          Trading as: {company.trading_name}
                        </p>
                      )}
                    </div>
                    {company.is_primary && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        Primary
                      </span>
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
            <div className="relative mt-2">
              <div className="absolute inset-0 flex items-center px-3" aria-hidden="true">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center pt-2">
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  Add new company
                </button>
              </div>
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
} 