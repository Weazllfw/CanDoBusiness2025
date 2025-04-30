'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  HomeIcon,
  DocumentTextIcon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  KeyIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface UserNavigationSection {
  type: 'section';
  name: string;
  items: NavigationItem[];
}

interface UserNavigationDivider {
  type: 'divider';
}

interface UserNavigationLink {
  name: string;
  href: string;
}

type UserNavigationItem = UserNavigationSection | UserNavigationDivider | UserNavigationLink;

const navigation: NavigationItem[] = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'RFQs', href: '/dashboard/rfq', icon: DocumentTextIcon },
  { name: 'Business', href: '/dashboard/business', icon: BuildingOfficeIcon },
];

const userNavigation: UserNavigationItem[] = [
  { 
    type: 'section',
    name: 'Account Settings',
    items: [
      { name: 'Your Profile', href: '/dashboard/account/profile', icon: UserCircleIcon },
      { name: 'Security', href: '/dashboard/account/security', icon: KeyIcon },
      { name: 'Billing', href: '/dashboard/account/billing', icon: CreditCardIcon },
      { name: 'Documents', href: '/dashboard/account/documents', icon: DocumentDuplicateIcon },
    ]
  },
  { 
    type: 'section',
    name: 'Business Settings',
    items: [
      { name: 'Company Profile', href: '/dashboard/business/profile', icon: BuildingOfficeIcon },
      { name: 'Team Members', href: '/dashboard/business/team', icon: UserGroupIcon },
      { name: 'Preferences', href: '/dashboard/business/preferences', icon: Cog6ToothIcon },
    ]
  },
  { type: 'divider' },
  { name: 'Sign out', href: '/auth/logout' },
];

export function TopNavBar() {
  return (
    <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
      {/* Left section - Logo and main nav */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-gray-900">CanDo</span>
          <span className="text-sm font-medium text-gray-500">Business</span>
        </Link>
        
        <nav className="hidden md:flex md:space-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              <item.icon className="mr-2 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right section - Notifications and Profile */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            3
          </span>
          <BellIcon className="h-6 w-6" />
        </button>

        {/* Profile dropdown */}
        <Menu as="div" className="relative ml-3">
          <Menu.Button className="flex items-center space-x-2 rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {userNavigation.map((item, index) => {
                // Handle divider
                if ('type' in item && item.type === 'divider') {
                  return <div key={index} className="my-1 border-t border-gray-200" />;
                }

                // Handle section
                if ('type' in item && item.type === 'section') {
                  return (
                    <div key={item.name}>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                        {item.name}
                      </div>
                      {item.items.map((subItem) => (
                        <Menu.Item key={subItem.name}>
                          {({ active }) => (
                            <Link
                              href={subItem.href}
                              className={cn(
                                active ? 'bg-gray-100' : '',
                                'flex items-center px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              <subItem.icon className="mr-3 h-5 w-5 text-gray-400" />
                              {subItem.name}
                            </Link>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  );
                }

                // Handle regular link
                return (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      <Link
                        href={item.href}
                        className={cn(
                          active ? 'bg-gray-100' : '',
                          'block px-4 py-2 text-sm text-gray-700'
                        )}
                      >
                        {item.name}
                      </Link>
                    )}
                  </Menu.Item>
                );
              })}
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </div>
  );
} 