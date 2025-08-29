'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { apiClient } from '@/lib/api';
import { formatRelativeTime, formatFileSize, getStatusColor, capitalize } from '@/lib/utils';
import { useJobUpdates } from '@/hooks/useJobUpdates';

interface Job {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  input: {
    files: string[];
  };
  progress: {
    percentage: number;
    currentStep: string;
  };
  config: {
    provider: {
      name: string;
      model: string;
    };
  };
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Real-time job updates
  const { jobUpdates, isConnected, error: connectionError, reconnect } = useJobUpdates({
    enabled: true,
    onJobUpdate: (update) => {
      // Update jobs list when we receive updates
      setJobs(prevJobs => {
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
    loadJobs();
  }, []);

  useEffect(() => {
    // Filter jobs based on search query and status filter
    let filtered = jobs;

    if (searchQuery) {
      filtered = filtered.filter(job => 
        job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.input.files.some(file => file.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchQuery, statusFilter]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getJobs({ limit: 50 });
      setJobs((response as any).jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await apiClient.retryJob(jobId);
      loadJobs(); // Reload jobs after retry
    } catch (err) {
      console.error('Failed to retry job:', err);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await apiClient.cancelJob(jobId);
      loadJobs(); // Reload jobs after cancel
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Running' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <DashboardLayout 
      title="Jobs" 
      subtitle="Manage and monitor your processing jobs"
      headerAction={
        <ConnectionStatus 
          isConnected={isConnected} 
          error={connectionError} 
          onReconnect={reconnect}
        />
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="card">
          <div className="card-content">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Search jobs by ID or filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10 w-full"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-secondary-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input w-auto"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadJobs}
                disabled={loading}
                className="btn btn-outline btn-md flex items-center"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">
              Jobs ({filteredJobs.length})
            </h3>
          </div>
          <div className="card-content p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="spinner h-8 w-8 text-primary-600 mx-auto"></div>
                <p className="mt-2 text-secondary-600">Loading jobs...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-error-600">{error}</p>
                <button onClick={loadJobs} className="mt-2 btn btn-primary btn-sm">
                  Retry
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-secondary-500">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No jobs match your filters' 
                    : 'No jobs found'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Job ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Files
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-secondary-900">
                            {job.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-secondary-900">
                            {job.input.files.length} file{job.input.files.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-secondary-500">
                            {job.input.files[0] && (
                              <span className="truncate max-w-xs block">
                                {job.input.files[0].split('/').pop()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge badge-${getStatusColor(job.status)}`}>
                            {capitalize(job.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {job.status === 'running' ? (
                            <div className="w-full">
                              <div className="progress mb-1">
                                <div 
                                  className="progress-bar" 
                                  style={{ width: `${job.progress.percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-secondary-500">
                                {job.progress.currentStep} • {job.progress.percentage}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-secondary-500">
                              {job.status === 'completed' ? '100%' : '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-secondary-900">
                            {job.config.provider.name}
                          </div>
                          <div className="text-xs text-secondary-500">
                            {job.config.provider.model}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {formatRelativeTime(job.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => router.push(`/jobs/${job.id}`)}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="View details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {job.status === 'failed' && (
                              <button
                                onClick={() => handleRetryJob(job.id)}
                                className="text-warning-600 hover:text-warning-900 transition-colors"
                                title="Retry job"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                            )}
                            {(job.status === 'pending' || job.status === 'running') && (
                              <button
                                onClick={() => handleCancelJob(job.id)}
                                className="text-error-600 hover:text-error-900 transition-colors"
                                title="Cancel job"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}