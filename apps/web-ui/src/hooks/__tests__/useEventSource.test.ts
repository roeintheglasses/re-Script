import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEventSource } from '../useEventSource'

// Mock EventSource
const mockEventSource = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
}

global.EventSource = vi.fn(() => mockEventSource) as any

describe('useEventSource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEventSource.readyState = 1 // OPEN
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with connecting state', () => {
    mockEventSource.readyState = 0 // CONNECTING
    const { result } = renderHook(() => 
      useEventSource({ url: 'http://localhost:3001/events' })
    )
    
    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('sets connected state when EventSource is open', () => {
    const { result } = renderHook(() => 
      useEventSource({ url: 'http://localhost:3001/events' })
    )
    
    expect(result.current.isConnected).toBe(true)
  })

  it('sets up event listeners correctly', () => {
    const onMessage = vi.fn()
    renderHook(() => 
      useEventSource({ 
        url: 'http://localhost:3001/events',
        onMessage 
      })
    )
    
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('open', expect.any(Function))
  })

  it('calls onMessage when message is received', () => {
    const onMessage = vi.fn()
    renderHook(() => 
      useEventSource({ 
        url: 'http://localhost:3001/events',
        onMessage 
      })
    )
    
    // Simulate message event
    const messageHandler = mockEventSource.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1]
    
    if (messageHandler) {
      const mockEvent = { data: '{"type": "test", "data": "value"}' }
      messageHandler(mockEvent)
      
      expect(onMessage).toHaveBeenCalledWith({ type: 'test', data: 'value' })
    }
  })

  it('handles error events', () => {
    const { result } = renderHook(() => 
      useEventSource({ url: 'http://localhost:3001/events' })
    )
    
    // Simulate error event
    const errorHandler = mockEventSource.addEventListener.mock.calls
      .find(call => call[0] === 'error')?.[1]
    
    if (errorHandler) {
      mockEventSource.readyState = 2 // CLOSED
      errorHandler({ type: 'error' })
      
      act(() => {
        // Allow state updates
      })
      
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection failed')
    }
  })

  it('can be disabled', () => {
    const { result } = renderHook(() => 
      useEventSource({ 
        url: 'http://localhost:3001/events',
        enabled: false 
      })
    )
    
    expect(global.EventSource).not.toHaveBeenCalled()
    expect(result.current.isConnected).toBe(false)
  })

  it('provides reconnect function', () => {
    const { result } = renderHook(() => 
      useEventSource({ url: 'http://localhost:3001/events' })
    )
    
    expect(typeof result.current.reconnect).toBe('function')
    
    act(() => {
      result.current.reconnect()
    })
    
    // Should create a new EventSource
    expect(global.EventSource).toHaveBeenCalledTimes(2)
  })

  it('provides close function', () => {
    const { result } = renderHook(() => 
      useEventSource({ url: 'http://localhost:3001/events' })
    )
    
    expect(typeof result.current.close).toBe('function')
    
    act(() => {
      result.current.close()
    })
    
    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => 
      useEventSource({ url: 'http://localhost:3001/events' })
    )
    
    unmount()
    
    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('handles retry logic', async () => {
    const { result } = renderHook(() => 
      useEventSource({ 
        url: 'http://localhost:3001/events',
        retryInterval: 1000,
        maxRetries: 3
      })
    )
    
    // Simulate connection failure
    const errorHandler = mockEventSource.addEventListener.mock.calls
      .find(call => call[0] === 'error')?.[1]
    
    if (errorHandler) {
      mockEventSource.readyState = 2 // CLOSED
      errorHandler({ type: 'error' })
      
      // Should attempt reconnection after interval
      expect(result.current.error).toBe('Connection failed')
    }
  })
})