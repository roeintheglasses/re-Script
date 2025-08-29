/**
 * API client for re-Script web API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponseType<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
  [key: string]: any;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new ApiError(error.message || 'API request failed', {
          status: response.status,
          statusText: response.statusText,
          details: error,
        });
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or parsing errors
      throw new ApiError('Network error', {
        status: 0,
        statusText: 'Network Error',
        originalError: error,
      });
    }
  }

  // Health endpoints
  async getHealth() {
    return this.request('/health');
  }

  async getHealthStatus() {
    return this.request('/health/status');
  }

  async getHealthReady() {
    return this.request('/health/ready');
  }

  // Job management endpoints
  async getJobs(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/api/jobs${query}`);
  }

  async getJob(jobId: string) {
    return this.request(`/api/jobs/${jobId}`);
  }

  async createJob(data: {
    files: string[];
    config: any;
    options?: any;
  }) {
    return this.request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelJob(jobId: string) {
    return this.request(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  async retryJob(jobId: string) {
    return this.request(`/api/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  }

  async getQueueStats() {
    return this.request('/api/jobs/stats/queue');
  }

  // File upload endpoints
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/upload/file', {
      method: 'POST',
      headers: {
        // Remove Content-Type to let browser set it with boundary
      },
      body: formData,
    });
  }

  async uploadFiles(files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.request('/api/upload/files', {
      method: 'POST',
      headers: {
        // Remove Content-Type to let browser set it with boundary
      },
      body: formData,
    });
  }

  async uploadAndProcess(files: File[], config: any) {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('config', JSON.stringify(config));

    return this.request('/api/upload/process', {
      method: 'POST',
      headers: {
        // Remove Content-Type to let browser set it with boundary
      },
      body: formData,
    });
  }

  async getJobOutputs(jobId: string) {
    return this.request(`/api/upload/outputs/${jobId}`);
  }

  async getJobOutput(jobId: string, filename: string) {
    const response = await fetch(`${this.baseURL}/api/upload/outputs/${jobId}/${filename}`);
    
    if (!response.ok) {
      throw new ApiError('Failed to fetch output file', {
        status: response.status,
        statusText: response.statusText,
      });
    }
    
    return response.text();
  }

  async getUploadStats() {
    return this.request('/api/upload/stats');
  }

  // Event Stream
  createEventStream(endpoint: string): EventSource {
    const url = `${this.baseURL}${endpoint}`;
    return new EventSource(url);
  }

  createJobEventStream(jobId: string): EventSource {
    return this.createEventStream(`/api/events/stream/${jobId}`);
  }

  createGlobalEventStream(): EventSource {
    return this.createEventStream('/api/events/stream');
  }

  async getEventConnections() {
    return this.request('/api/events/connections');
  }

  async sendTestEvent(event: string, data: any, jobId?: string) {
    return this.request(`/api/events/test/${event}`, {
      method: 'POST',
      body: JSON.stringify({ data, jobId }),
    });
  }
}

// Custom API Error class
export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public details?: any;

  constructor(message: string, details: any = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status || 500;
    this.statusText = details.statusText || 'Internal Server Error';
    this.details = details;
  }
}

// Create and export default instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { ApiResponseType as ApiResponse, ApiError as ApiErrorResponse };
export { ApiClient };