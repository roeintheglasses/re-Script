'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AnalyticsPage() {
  return (
    <DashboardLayout title="Analytics" subtitle="Processing statistics and insights">
      <div className="card">
        <div className="card-content">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              Analytics Dashboard
            </h3>
            <p className="text-secondary-600">
              Analytics and statistics components will be implemented in future tasks.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}