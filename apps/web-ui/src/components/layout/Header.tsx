'use client';

import React from 'react';
import { 
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
  onMobileMenuClick?: () => void;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ onMenuClick, onMobileMenuClick, title = 'Dashboard', subtitle, action }: HeaderProps) {
  return (
    <header className="bg-white border-b border-secondary-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and title */}
        <div className="flex items-center space-x-4">
          {/* Desktop menu toggle */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="hidden md:block p-2 -ml-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-md transition-colors"
              aria-label="Toggle sidebar"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          )}
          
          {/* Mobile menu toggle */}
          {onMobileMenuClick && (
            <button
              onClick={onMobileMenuClick}
              className="md:hidden p-2 -ml-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-md transition-colors"
              aria-label="Open mobile menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-secondary-900 truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-secondary-600 truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Custom action, Search, notifications, and user menu */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Custom action */}
          {action && (
            <div className="flex items-center">
              {action}
            </div>
          )}
          
          {/* Search - Hidden on mobile */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-secondary-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs..."
              className="w-48 xl:w-64 pl-10 pr-3 py-2 border border-secondary-300 rounded-md text-sm placeholder-secondary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Search icon for mobile/tablet */}
          <button className="lg:hidden p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-md transition-colors">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-md transition-colors">
              <BellIcon className="h-5 w-5" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 h-2 w-2 bg-error-500 rounded-full"></span>
            </button>
          </div>

          {/* User menu */}
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 text-secondary-700 hover:bg-secondary-100 rounded-md transition-colors">
              <UserCircleIcon className="h-6 w-6" />
              <span className="hidden lg:block text-sm font-medium">User</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}