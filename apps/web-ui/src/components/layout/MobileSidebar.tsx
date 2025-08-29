'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  XMarkIcon,
  HomeIcon,
  QueueListIcon,
  DocumentTextIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Overview and statistics',
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: QueueListIcon,
    description: 'Active job monitoring',
  },
  {
    name: 'Upload',
    href: '/dashboard/upload',
    icon: DocumentTextIcon,
    description: 'Upload and process files',
  },
  {
    name: 'History',
    href: '/history',
    icon: ClockIcon,
    description: 'Browse job history',
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    description: 'Processing statistics',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
    description: 'Configuration and preferences',
  },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary-600 bg-opacity-75 transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out md:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RS</span>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-secondary-900">re-Script</h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5',
                    isActive
                      ? 'text-primary-600'
                      : 'text-secondary-400 group-hover:text-secondary-600'
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-secondary-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-200">
          <div className="text-xs text-secondary-500 text-center">
            <div>Version 2.1.0</div>
            <div className="mt-1">© 2024 re-Script</div>
          </div>
        </div>
      </div>
    </>
  );
}