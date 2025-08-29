'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon,
  QueueListIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Overview and quick actions',
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: QueueListIcon,
    description: 'Job management and history',
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

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-secondary-200 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-secondary-200">
        <div className="flex items-center">
          <CodeBracketIcon className="h-8 w-8 text-primary-600" />
          {!collapsed && (
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-secondary-900">Re-Script</h1>
              <p className="text-xs text-secondary-500">Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                  : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'flex-shrink-0 h-5 w-5',
                  collapsed ? 'mx-auto' : 'mr-3',
                  isActive ? 'text-primary-600' : 'text-secondary-400 group-hover:text-secondary-500'
                )}
              />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="truncate">{item.name}</p>
                  <p className="text-xs text-secondary-500 truncate">
                    {item.description}
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-secondary-200">
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 text-sm font-medium text-secondary-700 rounded-md hover:bg-secondary-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={cn('h-4 w-4 transition-transform', collapsed ? 'rotate-180' : '')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!collapsed && <span className="ml-2">Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}