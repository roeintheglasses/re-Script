'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" subtitle="Configuration and preferences">
      <div className="card">
        <div className="card-content">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              Settings Panel
            </h3>
            <p className="text-secondary-600">
              Settings and configuration components will be implemented in future tasks.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}