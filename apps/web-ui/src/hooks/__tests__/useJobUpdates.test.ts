import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useJobUpdates } from '../useJobUpdates'

// Mock useEventSource
vi.mock('../useEventSource', () => ({
  useEventSource: vi.fn(),
}))

import { useEventSource } from '../useEventSource'

const mockUseEventSource = vi.mocked(useEventSource)

const mockJobUpdate = {
  jobId: 'test-job-1',
  type: 'status' as const,
  status: 'completed',
  timestamp: '2024-01-01T12:00:00Z',
}

describe('useJobUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEventSource.mockReturnValue({
      isConnected: true,
      error: null,
      reconnect: vi.fn(),
      close: vi.fn(),
    })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useJobUpdates())
    
    expect(result.current.jobUpdates).toEqual({})
    expect(result.current.isConnected).toBe(true)
    expect(result.current.error).toBe(null)
    expect(typeof result.current.reconnect).toBe('function')
    expect(typeof result.current.clearUpdates).toBe('function')
    expect(typeof result.current.getJobUpdate).toBe('function')
  })

  it('handles job updates correctly', () => {
    let onMessageCallback: (data: any) => void = () => {}
    
    mockUseEventSource.mockImplementation(({ onMessage }) => {
      onMessageCallback = onMessage
      return {
        isConnected: true,
        error: null,
        reconnect: vi.fn(),
        close: vi.fn(),
      }
    })

    const mockOnJobUpdate = vi.fn()
    const { result } = renderHook(() => 
      useJobUpdates({ onJobUpdate: mockOnJobUpdate })
    )
    
    act(() => {
      onMessageCallback(mockJobUpdate)
    })
    
    expect(result.current.jobUpdates['test-job-1']).toEqual(mockJobUpdate)
    expect(mockOnJobUpdate).toHaveBeenCalledWith(mockJobUpdate)
  })

  it('ignores invalid job updates', () => {
    let onMessageCallback: (data: any) => void = () => {}
    
    mockUseEventSource.mockImplementation(({ onMessage }) => {
      onMessageCallback = onMessage
      return {
        isConnected: true,
        error: null,
        reconnect: vi.fn(),
        close: vi.fn(),
      }
    })

    const { result } = renderHook(() => useJobUpdates())
    
    act(() => {
      onMessageCallback({ type: 'status' }) // Missing jobId
    })
    
    expect(result.current.jobUpdates).toEqual({})
  })

  it('clears updates when requested', () => {
    let onMessageCallback: (data: any) => void = () => {}
    
    mockUseEventSource.mockImplementation(({ onMessage }) => {
      onMessageCallback = onMessage
      return {
        isConnected: true,
        error: null,
        reconnect: vi.fn(),
        close: vi.fn(),
      }
    })

    const { result } = renderHook(() => useJobUpdates())
    
    // Add a job update
    act(() => {
      onMessageCallback(mockJobUpdate)
    })
    
    expect(result.current.jobUpdates['test-job-1']).toEqual(mockJobUpdate)
    
    // Clear updates
    act(() => {
      result.current.clearUpdates()
    })
    
    expect(result.current.jobUpdates).toEqual({})
  })

  it('retrieves specific job updates', () => {
    let onMessageCallback: (data: any) => void = () => {}
    
    mockUseEventSource.mockImplementation(({ onMessage }) => {
      onMessageCallback = onMessage
      return {
        isConnected: true,
        error: null,
        reconnect: vi.fn(),
        close: vi.fn(),
      }
    })

    const { result } = renderHook(() => useJobUpdates())
    
    // Add a job update
    act(() => {
      onMessageCallback(mockJobUpdate)
    })
    
    expect(result.current.getJobUpdate('test-job-1')).toEqual(mockJobUpdate)
    expect(result.current.getJobUpdate('non-existent')).toBeNull()
  })

  it('uses custom base URL', () => {
    renderHook(() => 
      useJobUpdates({ baseUrl: 'https://custom-api.com' })
    )
    
    expect(mockUseEventSource).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://custom-api.com/api/jobs/events',
      })
    )
  })

  it('can be disabled', () => {
    renderHook(() => useJobUpdates({ enabled: false }))
    
    expect(mockUseEventSource).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    )
  })

  it('handles connection errors', () => {
    mockUseEventSource.mockReturnValue({
      isConnected: false,
      error: 'Connection failed',
      reconnect: vi.fn(),
      close: vi.fn(),
    })

    const { result } = renderHook(() => useJobUpdates())
    
    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBe('Connection failed')
  })

  it('forwards EventSource configuration', () => {
    renderHook(() => useJobUpdates())
    
    expect(mockUseEventSource).toHaveBeenCalledWith(
      expect.objectContaining({
        retryInterval: 3000,
        maxRetries: 10,
      })
    )
  })

  it('handles progress updates', () => {
    let onMessageCallback: (data: any) => void = () => {}
    
    mockUseEventSource.mockImplementation(({ onMessage }) => {
      onMessageCallback = onMessage
      return {
        isConnected: true,
        error: null,
        reconnect: vi.fn(),
        close: vi.fn(),
      }
    })

    const { result } = renderHook(() => useJobUpdates())
    
    const progressUpdate = {
      jobId: 'test-job-2',
      type: 'progress' as const,
      progress: {
        percentage: 50,
        currentStep: 'Processing',
        completedSteps: 2,
        totalSteps: 4,
      },
      timestamp: '2024-01-01T12:00:00Z',
    }
    
    act(() => {
      onMessageCallback(progressUpdate)
    })
    
    expect(result.current.jobUpdates['test-job-2']).toEqual(progressUpdate)
  })

  it('handles result updates', () => {
    let onMessageCallback: (data: any) => void = () => {}
    
    mockUseEventSource.mockImplementation(({ onMessage }) => {
      onMessageCallback = onMessage
      return {
        isConnected: true,
        error: null,
        reconnect: vi.fn(),
        close: vi.fn(),
      }
    })

    const { result } = renderHook(() => useJobUpdates())
    
    const resultUpdate = {
      jobId: 'test-job-3',
      type: 'result' as const,
      result: {
        outputFiles: ['output.js'],
        errors: [],
        stats: {
          processingTime: 5000,
          inputSize: 1024,
          outputSize: 2048,
        },
      },
      timestamp: '2024-01-01T12:00:00Z',
    }
    
    act(() => {
      onMessageCallback(resultUpdate)
    })
    
    expect(result.current.jobUpdates['test-job-3']).toEqual(resultUpdate)
  })
})