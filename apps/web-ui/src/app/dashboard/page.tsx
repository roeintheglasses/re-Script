'use client';

import React, { useEffect, useState } from 'react';
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { apiClient } from '@/lib/api';
import { formatNumber, formatRelativeTime, getStatusColor } from '@/lib/utils';
import { useJobUpdates } from '@/hooks/useJobUpdates';

interface DashboardStats {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

interface RecentJob {
  id: string;
  status: string;
  createdAt: string;
  input: {
    files: string[];
  };
  progress?: {
    percentage: number;
    currentStep: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time job updates
  const { jobUpdates, isConnected, error: connectionError, reconnect } = useJobUpdates({
    enabled: true,
    onJobUpdate: (update) => {
      // Update recent jobs list when we receive updates
      setRecentJobs(prevJobs => {
        const updatedJobs = prevJobs.map(job => {
          if (job.id === update.jobId) {
            return {
              ...job,
              status: update.status || job.status,
              progress: update.progress || job.progress,
            };
          }
          return job;
        });
        return updatedJobs;
      });
    },
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobsResponse, queueStatsResponse] = await Promise.all([
        apiClient.getJobs({ limit: 10 }),
        apiClient.getQueueStats(),
      ]);

      // Process jobs data
      const jobs = (jobsResponse as any).jobs || [];
      const totalJobs = jobs.length;
      const runningJobs = jobs.filter((job: any) => job.status === 'running').length;
      const completedJobs = jobs.filter((job: any) => job.status === 'completed').length;
      const failedJobs = jobs.filter((job: any) => job.status === 'failed').length;

      setStats({
        totalJobs,
        runningJobs,
        completedJobs,
        failedJobs,
        queueStats: (queueStatsResponse as any).queue,
      });

      setRecentJobs(jobs.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Jobs',
      value: stats?.totalJobs || 0,
      icon: ClockIcon,
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-100',
      change: '+12%',
      changeType: 'increase' as const,
    },
    {
      title: 'Running',
      value: stats?.runningJobs || 0,
      icon: ClockIcon,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      change: '+3',
      changeType: 'increase' as const,
    },
    {
      title: 'Completed',
      value: stats?.completedJobs || 0,
      icon: CheckCircleIcon,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      change: '+8%',
      changeType: 'increase' as const,
    },
    {
      title: 'Failed',
      value: stats?.failedJobs || 0,
      icon: XCircleIcon,
      color: 'text-error-600',
      bgColor: 'bg-error-100',
      change: '-2%',
      changeType: 'decrease' as const,
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome back">
        <div className="flex items-center justify-center h-64">
          <div className="spinner h-8 w-8 text-primary-600"></div>
          <span className="ml-2 text-secondary-600">Loading dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome back">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-error-400" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900">Error loading dashboard</h3>
          <p className="mt-1 text-sm text-secondary-500">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 btn btn-primary btn-sm"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Welcome back"
      headerAction={
        <ConnectionStatus 
          isConnected={isConnected} 
          error={connectionError} 
          onReconnect={reconnect}
        />
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statCards.map((stat) => (
            <div key={stat.title} className="card">
              <div className="card-content">
                <div className="flex items-center">
                  <div className={`p-2 rounded-md ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-secondary-500">{stat.title}</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold text-secondary-900">
                        {formatNumber(stat.value)}
                      </p>
                      <div className="ml-2 flex items-center text-sm">
                        {stat.changeType === 'increase' ? (
                          <ArrowUpIcon className="h-4 w-4 text-success-500" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-error-500" />
                        )}
                        <span className={
                          stat.changeType === 'increase' 
                            ? 'text-success-600' 
                            : 'text-error-600'
                        }>
                          {stat.change}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Jobs and Queue Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Jobs */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-secondary-900">Recent Jobs</h3>
            </div>
            <div className="card-content">
              {recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-900 truncate">
                          Job {job.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-secondary-500">
                          {job.input.files.length} file(s) • {formatRelativeTime(job.createdAt)}
                        </p>
                        {job.progress && (
                          <div className="mt-1">
                            <div className="progress">
                              <div 
                                className="progress-bar" 
                                style={{ width: `${job.progress.percentage}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-secondary-500 mt-1">
                              {job.progress.currentStep} • {job.progress.percentage}%
                            </p>
                          </div>
                        )}
                      </div>
                      <span className={`badge badge-${getStatusColor(job.status)} ml-3`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-secondary-300" />
                  <p className="mt-2 text-sm text-secondary-500">No recent jobs</p>
                </div>
              )}
            </div>
          </div>

          {/* Queue Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-secondary-900">Queue Status</h3>
            </div>
            <div className="card-content">
              {stats?.queueStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-warning-50 rounded-lg">
                      <p className="text-2xl font-bold text-warning-600">
                        {stats.queueStats.waiting}
                      </p>
                      <p className="text-sm text-warning-800">Waiting</p>
                    </div>
                    <div className="text-center p-4 bg-primary-50 rounded-lg">
                      <p className="text-2xl font-bold text-primary-600">
                        {stats.queueStats.active}
                      </p>
                      <p className="text-sm text-primary-800">Active</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-success-50 rounded-lg">
                      <p className="text-2xl font-bold text-success-600">
                        {stats.queueStats.completed}
                      </p>
                      <p className="text-sm text-success-800">Completed</p>
                    </div>
                    <div className="text-center p-4 bg-error-50 rounded-lg">
                      <p className="text-2xl font-bold text-error-600">
                        {stats.queueStats.failed}
                      </p>
                      <p className="text-sm text-error-800">Failed</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}