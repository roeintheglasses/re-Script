'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowPathIcon,
  TrashIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { ExportButton } from '@/components/ui/ExportButton';
import { apiClient } from '@/lib/api';
import { formatRelativeTime, formatFileSize, getStatusColor, capitalize } from '@/lib/utils';
import { useJobUpdates } from '@/hooks/useJobUpdates';

interface HistoryJob {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  input: {
    files: string[];
    totalSize: number;
  };
  output?: {
    files: string[];
    totalSize: number;
  };
  config: {
    provider: {
      name: string;
      model: string;
    };
  };
  stats?: {
    processingTime: number;
    inputSize: number;
    outputSize: number;
  };
  progress?: {
    percentage: number;
    currentStep: string;
  };
}

type SortField = 'createdAt' | 'status' | 'processingTime' | 'inputSize' | 'outputSize';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

export default function HistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  
  // Display options
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Real-time updates
  const { isConnected, error: connectionError, reconnect } = useJobUpdates({
    enabled: true,
    onJobUpdate: (update) => {
      setJobs(prevJobs => {
        const updatedJobs = prevJobs.map(job => {
          if (job.id === update.jobId) {
            return {
              ...job,
              status: update.status || job.status,
              progress: update.progress || job.progress,
              stats: update.result?.stats || job.stats,
              completedAt: update.status === 'completed' ? new Date().toISOString() : job.completedAt,
            };
          }
          return job;
        });
        return updatedJobs;
      });
    },
  });

  useEffect(() => {
    loadJobHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, searchQuery, statusFilter, providerFilter, dateRange, sortField, sortDirection]);

  const loadJobHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getJobs({ limit: 500 });
      const jobsData = (response as any).jobs || [];
      setJobs(jobsData);
    } catch (err) {
      console.error('Failed to load job history:', err);
      setError('Failed to load job history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job => 
        job.id.toLowerCase().includes(query) ||
        job.input.files.some(file => file.toLowerCase().includes(query)) ||
        job.config.provider.name.toLowerCase().includes(query) ||
        job.config.provider.model.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Provider filter
    if (providerFilter !== 'all') {
      filtered = filtered.filter(job => job.config.provider.name === providerFilter);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(job => new Date(job.createdAt) >= dateRange.start!);
    }
    if (dateRange.end) {
      filtered = filtered.filter(job => new Date(job.createdAt) <= dateRange.end!);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'processingTime':
          aValue = a.stats?.processingTime || 0;
          bValue = b.stats?.processingTime || 0;
          break;
        case 'inputSize':
          aValue = a.stats?.inputSize || a.input.totalSize || 0;
          bValue = b.stats?.inputSize || b.input.totalSize || 0;
          break;
        case 'outputSize':
          aValue = a.stats?.outputSize || a.output?.totalSize || 0;
          bValue = b.stats?.outputSize || b.output?.totalSize || 0;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredJobs(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await apiClient.retryJob(jobId);
      loadJobHistory();
    } catch (err) {
      console.error('Failed to retry job:', err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        await apiClient.deleteJob(jobId);
        loadJobHistory();
      } catch (err) {
        console.error('Failed to delete job:', err);
      }
    }
  };

  // Get unique providers for filter
  const providers = useMemo(() => {
    const uniqueProviders = Array.from(new Set(jobs.map(job => job.config.provider.name)));
    return uniqueProviders.sort();
  }, [jobs]);

  // Statistics
  const stats = useMemo(() => {
    const totalJobs = filteredJobs.length;
    const completedJobs = filteredJobs.filter(job => job.status === 'completed').length;
    const failedJobs = filteredJobs.filter(job => job.status === 'failed').length;
    const runningJobs = filteredJobs.filter(job => job.status === 'running').length;
    
    const totalInputSize = filteredJobs.reduce((sum, job) => sum + (job.stats?.inputSize || 0), 0);
    const totalOutputSize = filteredJobs.reduce((sum, job) => sum + (job.stats?.outputSize || 0), 0);
    const averageProcessingTime = filteredJobs
      .filter(job => job.stats?.processingTime)
      .reduce((sum, job) => sum + job.stats!.processingTime, 0) / 
      filteredJobs.filter(job => job.stats?.processingTime).length;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      runningJobs,
      totalInputSize,
      totalOutputSize,
      averageProcessingTime: isNaN(averageProcessingTime) ? 0 : averageProcessingTime,
    };
  }, [filteredJobs]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Running' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Job History" subtitle="Browse and analyze past processing jobs">
        <div className="flex items-center justify-center h-64">
          <div className="spinner h-8 w-8 text-primary-600"></div>
          <span className="ml-2 text-secondary-600">Loading job history...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Job History" 
      subtitle="Browse and analyze past processing jobs"
      headerAction={
        <ConnectionStatus 
          isConnected={isConnected} 
          error={connectionError} 
          onReconnect={reconnect}
        />
      }
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-primary-100">
                  <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-secondary-500">Total Jobs</p>
                  <p className="text-2xl font-semibold text-secondary-900">{stats.totalJobs}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-success-100">
                  <ChartBarIcon className="h-6 w-6 text-success-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-secondary-500">Success Rate</p>
                  <p className="text-2xl font-semibold text-secondary-900">
                    {stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-secondary-100">
                  <ClockIcon className="h-6 w-6 text-secondary-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-secondary-500">Avg Processing Time</p>
                  <p className="text-2xl font-semibold text-secondary-900">
                    {stats.averageProcessingTime > 0 ? `${(stats.averageProcessingTime / 1000).toFixed(1)}s` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-warning-100">
                  <DocumentTextIcon className="h-6 w-6 text-warning-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-secondary-500">Data Processed</p>
                  <p className="text-2xl font-semibold text-secondary-900">
                    {formatFileSize(stats.totalInputSize)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="card">
          <div className="card-content">
            <div className="space-y-4">
              {/* Top row - Search and main filters */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <input
                      type="text"
                      placeholder="Search by job ID, filename, provider, or model..."
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

                {/* Provider Filter */}
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="input w-auto"
                >
                  <option value="all">All Providers</option>
                  {providers.map(provider => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>

                {/* Date Range Picker */}
                <DateRangePicker
                  startDate={dateRange.start || undefined}
                  endDate={dateRange.end || undefined}
                  onDateRangeChange={handleDateRangeChange}
                />
              </div>

              {/* Bottom row - Display options and actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-secondary-300 rounded-md">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1.5 text-xs font-medium border-r border-secondary-300 transition-colors ${
                        viewMode === 'table' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'text-secondary-700 hover:bg-secondary-100'
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'text-secondary-700 hover:bg-secondary-100'
                      }`}
                    >
                      Grid
                    </button>
                  </div>

                  {/* Items per page */}
                  <div className="flex items-center space-x-2 text-sm text-secondary-600">
                    <span>Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="input text-sm py-1 w-auto"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span>items</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Refresh Button */}
                  <button
                    onClick={loadJobHistory}
                    disabled={loading}
                    className="btn btn-outline btn-sm flex items-center"
                  >
                    <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>

                  {/* Export Button */}
                  <ExportButton
                    data={filteredJobs}
                    filename="job-history"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">
              Jobs ({filteredJobs.length})
              {filteredJobs.length !== jobs.length && (
                <span className="text-sm text-secondary-500 font-normal ml-2">
                  filtered from {jobs.length} total
                </span>
              )}
            </h3>
          </div>
          <div className="card-content p-0">
            {error ? (
              <div className="p-8 text-center">
                <p className="text-error-600">{error}</p>
                <button onClick={loadJobHistory} className="mt-2 btn btn-primary btn-sm">
                  Retry
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-8 text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-secondary-300" />
                <p className="mt-2 text-secondary-500">
                  {jobs.length === 0 ? 'No jobs found' : 'No jobs match your filters'}
                </p>
                {jobs.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setProviderFilter('all');
                      setDateRange({ start: null, end: null });
                    }}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-800"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <div>
                {/* Table View */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <button
                            onClick={() => handleSort('createdAt')}
                            className="text-xs font-medium text-secondary-500 uppercase tracking-wider hover:text-secondary-700 flex items-center"
                          >
                            Created
                            {sortField === 'createdAt' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Job ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Files
                        </th>
                        <th className="px-6 py-3 text-left">
                          <button
                            onClick={() => handleSort('status')}
                            className="text-xs font-medium text-secondary-500 uppercase tracking-wider hover:text-secondary-700 flex items-center"
                          >
                            Status
                            {sortField === 'status' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left">
                          <button
                            onClick={() => handleSort('processingTime')}
                            className="text-xs font-medium text-secondary-500 uppercase tracking-wider hover:text-secondary-700 flex items-center"
                          >
                            Time
                            {sortField === 'processingTime' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left">
                          <button
                            onClick={() => handleSort('inputSize')}
                            className="text-xs font-medium text-secondary-500 uppercase tracking-wider hover:text-secondary-700 flex items-center"
                          >
                            Size
                            {sortField === 'inputSize' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                      {paginatedJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-secondary-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {formatRelativeTime(job.createdAt)}
                          </td>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-secondary-900">
                              {job.config.provider.name}
                            </div>
                            <div className="text-xs text-secondary-500">
                              {job.config.provider.model}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {job.stats?.processingTime 
                              ? `${(job.stats.processingTime / 1000).toFixed(1)}s`
                              : '-'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {formatFileSize(job.stats?.inputSize || job.input.totalSize || 0)}
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
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="text-error-600 hover:text-error-900 transition-colors"
                                title="Delete job"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-secondary-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-secondary-600">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredJobs.length)} of {filteredJobs.length} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="btn btn-outline btn-sm"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-secondary-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="btn btn-outline btn-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Grid View */
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {paginatedJobs.map((job) => (
                    <div key={job.id} className="border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`badge badge-${getStatusColor(job.status)}`}>
                          {capitalize(job.status)}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => router.push(`/jobs/${job.id}`)}
                            className="p-1 text-primary-600 hover:text-primary-900 transition-colors"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {job.status === 'failed' && (
                            <button
                              onClick={() => handleRetryJob(job.id)}
                              className="p-1 text-warning-600 hover:text-warning-900 transition-colors"
                              title="Retry job"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1 text-error-600 hover:text-error-900 transition-colors"
                            title="Delete job"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-mono text-secondary-600">
                          ID: {job.id.slice(0, 12)}
                        </div>
                        <div className="text-sm text-secondary-900">
                          {job.input.files.length} file{job.input.files.length !== 1 ? 's' : ''}
                          {job.input.files[0] && (
                            <span className="block text-xs text-secondary-500 truncate">
                              {job.input.files[0].split('/').pop()}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-secondary-600">
                          {job.config.provider.name} • {job.config.provider.model}
                        </div>
                        <div className="text-xs text-secondary-500">
                          {formatRelativeTime(job.createdAt)}
                        </div>
                        {job.stats && (
                          <div className="text-xs text-secondary-500">
                            {formatFileSize(job.stats.inputSize)} → {formatFileSize(job.stats.outputSize)} 
                            ({(job.stats.processingTime / 1000).toFixed(1)}s)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grid Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-secondary-600">
                      Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredJobs.length)} of {filteredJobs.length} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="btn btn-outline btn-sm"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-secondary-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="btn btn-outline btn-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}