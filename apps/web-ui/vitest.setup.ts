import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  Editor: ({ onChange, value, ...props }: any) => null,
}))

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, ...props }) => ({
    getRootProps: () => ({
      'data-testid': 'dropzone',
    }),
    getInputProps: () => ({
      'data-testid': 'dropzone-input',
    }),
    isDragActive: false,
    isDragAccept: false,
    isDragReject: false,
  }),
}))

// Mock EventSource
global.EventSource = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
})) as any

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
})

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock fetch for API calls
global.fetch = vi.fn()

// Suppress console warnings in tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning:'))
    ) {
      return
    }
    originalConsoleWarn.call(console, ...args)
  }

  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error: Not implemented'))
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
})

afterAll(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})