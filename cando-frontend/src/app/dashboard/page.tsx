'use client'

import { useCompany } from '@/lib/contexts/CompanyContext'
import { DashboardLayout } from '@/components/layout'
import { cn } from '@/lib/utils'
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

const metrics = [
  { name: 'Total Revenue', value: '$24,000', change: '+4.75%', changeType: 'positive' },
  { name: 'Active Users', value: '12', change: '+2', changeType: 'positive' },
  { name: 'Documents', value: '34', change: '+5', changeType: 'positive' },
  { name: 'Pending Tasks', value: '8', change: '-2', changeType: 'negative' },
]

const recentActivity = [
  {
    id: 1,
    type: 'document',
    title: 'Annual Report 2024',
    timestamp: '2 hours ago',
    icon: DocumentTextIcon,
  },
  {
    id: 2,
    type: 'user',
    title: 'New team member added',
    timestamp: '4 hours ago',
    icon: UserGroupIcon,
  },
  {
    id: 3,
    type: 'task',
    title: 'Monthly financial review completed',
    timestamp: '1 day ago',
    icon: ChartBarIcon,
  },
]

export default function DashboardPage() {
  const { currentCompany, isLoading } = useCompany()

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-8 w-1/3 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Company Overview */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {currentCompany?.name || 'Dashboard'}
          </h1>
          {currentCompany?.trading_name && (
            <p className="mt-1 text-sm text-gray-500">
              Trading as {currentCompany.trading_name}
            </p>
          )}
      </div>

        {/* Key Metrics */}
                  <div>
          <h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Key Metrics
          </h2>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.name}
                className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:pt-6"
              >
                <dt>
                  <div className="absolute rounded-md bg-blue-500 p-3">
                    <ChartBarIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-500">
                    {metric.name}
                  </p>
                </dt>
                <dd className="ml-16 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                  <p
                    className={cn(
                      metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600',
                      'ml-2 flex items-baseline text-sm font-semibold'
                    )}
                  >
                    {metric.change}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <ul role="list" className="divide-y divide-gray-200">
              {recentActivity.map((item) => (
                <li key={item.id} className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <item.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {item.timestamp}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
            </div>
      </div>
    </DashboardLayout>
  )
} 