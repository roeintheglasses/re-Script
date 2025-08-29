import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../api-client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: 'test' }),
      text: vi.fn().mockResolvedValue('test'),
    })
  })

  describe('GET requests', () => {
    it('makes GET request with correct headers', async () => {
      await apiClient.get('/test')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('handles query parameters', async () => {
      await apiClient.get('/test', { params: { foo: 'bar', baz: 'qux' } })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test?foo=bar&baz=qux',
        expect.any(Object)
      )
    })
  })

  describe('POST requests', () => {
    it('makes POST request with JSON body', async () => {
      const data = { name: 'test' }
      await apiClient.post('/test', data)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })
      )
    })
  })

  describe('File uploads', () => {
    it('uploads files with FormData', async () => {
      const file = new File(['test'], 'test.js', { type: 'text/javascript' })
      const formData = new FormData()
      formData.append('files', file)
      formData.append('config', JSON.stringify({ provider: 'anthropic' }))

      await apiClient.uploadFiles([file], { provider: 'anthropic' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/jobs/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      )
    })
  })

  describe('Error handling', () => {
    it('throws error for non-ok responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: vi.fn().mockResolvedValue('Not found'),
      })

      await expect(apiClient.get('/nonexistent')).rejects.toThrow('HTTP 404: Not Found')
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(apiClient.get('/test')).rejects.toThrow('Network error')
    })
  })

  describe('Job management', () => {
    it('cancels job correctly', async () => {
      await apiClient.cancelJob('job-123')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/jobs/job-123/cancel',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('retries job correctly', async () => {
      await apiClient.retryJob('job-123')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/jobs/job-123/retry',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('deletes job correctly', async () => {
      await apiClient.deleteJob('job-123')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/jobs/job-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })
})