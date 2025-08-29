import { useState, useCallback } from 'react';
import { useEventSource } from './useEventSource';

interface JobUpdate {
  jobId: string;
  type: 'status' | 'progress' | 'result';
  status?: string;
  progress?: {
    percentage: number;
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
  };
  result?: {
    outputFiles: string[];
    errors: string[];
    stats: {
      processingTime: number;
      inputSize: number;
      outputSize: number;
    };
  };
  timestamp: string;
}

interface UseJobUpdatesOptions {
  baseUrl?: string;
  enabled?: boolean;
  onJobUpdate?: (update: JobUpdate) => void;
}

interface UseJobUpdatesReturn {
  jobUpdates: Record<string, JobUpdate>;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
  clearUpdates: () => void;
  getJobUpdate: (jobId: string) => JobUpdate | null;
}

export function useJobUpdates({
  baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  enabled = true,
  onJobUpdate,
}: UseJobUpdatesOptions = {}): UseJobUpdatesReturn {
  const [jobUpdates, setJobUpdates] = useState<Record<string, JobUpdate>>({});

  const handleMessage = useCallback((data: JobUpdate) => {
    if (data && data.jobId) {
      setJobUpdates(prev => ({
        ...prev,
        [data.jobId]: data,
      }));
      
      onJobUpdate?.(data);
    }
  }, [onJobUpdate]);

  const handleError = useCallback((error: Event) => {
    console.error('Job updates EventSource error:', error);
  }, []);

  const handleOpen = useCallback((event: Event) => {
    console.log('Job updates EventSource connected');
  }, []);

  const { isConnected, error, reconnect, close } = useEventSource({
    url: `${baseUrl}/api/jobs/events`,
    onMessage: handleMessage,
    onError: handleError,
    onOpen: handleOpen,
    enabled,
    retryInterval: 3000,
    maxRetries: 10,
  });

  const clearUpdates = useCallback(() => {
    setJobUpdates({});
  }, []);

  const getJobUpdate = useCallback((jobId: string): JobUpdate | null => {
    return jobUpdates[jobId] || null;
  }, [jobUpdates]);

  return {
    jobUpdates,
    isConnected,
    error,
    reconnect,
    clearUpdates,
    getJobUpdate,
  };
}