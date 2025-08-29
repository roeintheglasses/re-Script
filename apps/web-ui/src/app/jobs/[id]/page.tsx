'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CodeComparison } from '@/components/ui/CodeComparison';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { apiClient } from '@/lib/api';
import { formatRelativeTime, formatFileSize, getStatusColor, capitalize } from '@/lib/utils';
import { useJobUpdates } from '@/hooks/useJobUpdates';

interface JobDetails {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  input: {
    files: string[];
    originalCode: Record<string, string>;
  };
  output?: {
    files: string[];
    processedCode: Record<string, string>;
  };
  progress: {
    percentage: number;
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
  };
  config: {
    provider: {
      name: string;
      model: string;
    };
    options: {
      temperature: number;
      maxTokens: number;
    };
    processing: {
      chunkSize: number;
      maxConcurrency: number;
      enableWebcrack: boolean;
      enableBabel: boolean;
      enableLlm: boolean;
      enablePrettier: boolean;
    };
  };
  stats?: {
    processingTime: number;
    inputSize: number;
    outputSize: number;
  };
  errors?: string[];
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');

  // Real-time job updates
  const { jobUpdates, isConnected, error: connectionError, reconnect } = useJobUpdates({
    enabled: true,
    onJobUpdate: (update) => {
      if (update.jobId === jobId && job) {
        setJob(prev => prev ? {
          ...prev,
          status: update.status || prev.status,
          progress: update.progress || prev.progress,
          output: update.result ? {
            files: update.result.outputFiles,
            processedCode: prev.output?.processedCode || {},
          } : prev.output,
          stats: update.result?.stats || prev.stats,
        } : null);
      }
    },
  });

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getJob(jobId);
      const jobData = response as JobDetails;
      setJob(jobData);

      // Set first file as selected by default
      if (jobData.input.files.length > 0 && !selectedFile) {
        setSelectedFile(jobData.input.files[0]);
      }
    } catch (err) {
      console.error('Failed to load job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryJob = async () => {
    try {
      await apiClient.retryJob(jobId);
      loadJobDetails();
    } catch (err) {
      console.error('Failed to retry job:', err);
    }
  };

  const handleCancelJob = async () => {
    try {
      await apiClient.cancelJob(jobId);
      loadJobDetails();
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-error-500" />;
      case 'running':
        return <ClockIcon className="h-5 w-5 text-primary-500 animate-spin" />;
      case 'cancelled':
        return <StopIcon className="h-5 w-5 text-warning-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-secondary-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Job Details" subtitle="Loading job information...">
        <div className="flex items-center justify-center h-64">
          <div className="spinner h-8 w-8 text-primary-600"></div>
          <span className="ml-2 text-secondary-600">Loading job details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout title="Job Details" subtitle="Error loading job">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-error-400" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900">Error loading job</h3>
          <p className="mt-1 text-sm text-secondary-500">{error || 'Job not found'}</p>
          <div className="mt-4 flex justify-center space-x-2">
            <button onClick={loadJobDetails} className="btn btn-primary btn-sm">
              Retry
            </button>
            <button onClick={() => router.back()} className="btn btn-outline btn-sm">
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const originalCode = selectedFile ? job.input.originalCode[selectedFile] || '' : '';
  const processedCode = selectedFile && job.output 
    ? job.output.processedCode[selectedFile] || '' 
    : '';

  return (
    <DashboardLayout 
      title={`Job ${job.id.slice(0, 8)}`} 
      subtitle="Job details and processing results"
      headerAction={
        <div className="flex items-center space-x-4">
          <ConnectionStatus 
            isConnected={isConnected} 
            error={connectionError} 
            onReconnect={reconnect}
          />
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Job Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Status Card */}
          <div className="card">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(job.status)}
                    <span className={`badge badge-${getStatusColor(job.status)}`}>
                      {capitalize(job.status)}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-600">
                    Created {formatRelativeTime(job.createdAt)}
                  </p>
                  {job.completedAt && (
                    <p className="text-sm text-secondary-600">
                      Completed {formatRelativeTime(job.completedAt)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col space-y-1">
                  {job.status === 'failed' && (
                    <button
                      onClick={handleRetryJob}
                      className="btn btn-outline btn-sm flex items-center"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Retry
                    </button>
                  )}
                  {(job.status === 'pending' || job.status === 'running') && (
                    <button
                      onClick={handleCancelJob}
                      className="btn btn-error btn-sm flex items-center"
                    >
                      <StopIcon className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="card">
            <div className="card-content">
              <h3 className="text-sm font-medium text-secondary-900 mb-3">Progress</h3>
              {job.status === 'running' ? (
                <div>
                  <div className="progress mb-2">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${job.progress.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-secondary-600">
                    {job.progress.currentStep}
                  </p>
                  <p className="text-xs text-secondary-500">
                    Step {job.progress.completedSteps} of {job.progress.totalSteps}
                  </p>
                </div>
              ) : (
                <div className="text-center text-secondary-500">
                  {job.status === 'completed' ? '100% Complete' : 
                   job.status === 'failed' ? 'Processing failed' : 
                   'Pending'}
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="card">
            <div className="card-content">
              <h3 className="text-sm font-medium text-secondary-900 mb-3">Statistics</h3>
              {job.stats ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Processing Time:</span>
                    <span className="font-mono">{(job.stats.processingTime / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Input Size:</span>
                    <span className="font-mono">{formatFileSize(job.stats.inputSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Output Size:</span>
                    <span className="font-mono">{formatFileSize(job.stats.outputSize)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-secondary-500">No stats available</div>
              )}
            </div>
          </div>
        </div>

        {/* File Selection */}
        {job.input.files.length > 1 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-secondary-900">Select File</h3>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {job.input.files.map((file) => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      selectedFile === file
                        ? 'border-primary-300 bg-primary-50 text-primary-900'
                        : 'border-secondary-200 hover:border-secondary-300 hover:bg-secondary-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-2 text-secondary-400" />
                      <span className="text-sm font-medium truncate">
                        {file.split('/').pop()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Code Comparison */}
        {selectedFile && (
          <CodeComparison
            originalCode={originalCode}
            processedCode={processedCode}
            originalTitle="Original Code"
            processedTitle="Processed Code"
            language="javascript"
          />
        )}

        {/* Configuration Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">Configuration</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div>
                <h4 className="text-sm font-medium text-secondary-900 mb-2">Provider</h4>
                <div className="text-sm text-secondary-600 space-y-1">
                  <div>Name: <span className="font-mono">{job.config.provider.name}</span></div>
                  <div>Model: <span className="font-mono">{job.config.provider.model}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-secondary-900 mb-2">Options</h4>
                <div className="text-sm text-secondary-600 space-y-1">
                  <div>Temperature: <span className="font-mono">{job.config.options.temperature}</span></div>
                  <div>Max Tokens: <span className="font-mono">{job.config.options.maxTokens}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-secondary-900 mb-2">Processing</h4>
                <div className="text-sm text-secondary-600 space-y-1">
                  <div>Chunk Size: <span className="font-mono">{job.config.processing.chunkSize}</span></div>
                  <div>Concurrency: <span className="font-mono">{job.config.processing.maxConcurrency}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Errors */}
        {job.errors && job.errors.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-secondary-900 flex items-center">
                <XCircleIcon className="h-5 w-5 text-error-500 mr-2" />
                Errors
              </h3>
            </div>
            <div className="card-content">
              <div className="space-y-2">
                {job.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-error-50 border border-error-200 rounded text-sm text-error-800">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}