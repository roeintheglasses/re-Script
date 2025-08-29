'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export function DashboardLayout({ children, title, subtitle, headerAction }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-secondary-50">
      {/* Sidebar */}
      <div className={cn(
        'hidden md:flex md:flex-shrink-0 transition-all duration-300',
        sidebarCollapsed ? 'md:w-16' : 'md:w-64'
      )}>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={toggleSidebar}
        />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header 
          title={title}
          subtitle={subtitle}
          onMenuClick={toggleSidebar}
          onMobileMenuClick={toggleMobileMenu}
          action={headerAction}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}