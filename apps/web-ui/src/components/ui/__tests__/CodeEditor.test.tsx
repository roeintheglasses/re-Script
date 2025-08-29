import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodeEditor } from '../CodeEditor'

const mockOnChange = vi.fn()
const mockOnCopy = vi.fn()
const mockOnDownload = vi.fn()

const defaultProps = {
  value: 'const hello = "world";',
  onChange: mockOnChange,
  language: 'javascript',
  onCopy: mockOnCopy,
  onDownload: mockOnDownload,
}

describe('CodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders correctly', () => {
    render(<CodeEditor {...defaultProps} />)
    
    expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument()
    expect(screen.getByDisplayValue('const hello = "world";')).toBeInTheDocument()
  })

  it('shows file statistics', () => {
    render(<CodeEditor {...defaultProps} />)
    
    expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument()
    expect(screen.getByText(/1 lines/)).toBeInTheDocument()
    expect(screen.getByText(/bytes/)).toBeInTheDocument()
  })

  it('shows title when provided', () => {
    render(<CodeEditor {...defaultProps} title="Test Editor" />)
    
    expect(screen.getByText('Test Editor')).toBeInTheDocument()
  })

  it('handles copy to clipboard', async () => {
    render(<CodeEditor {...defaultProps} />)
    
    const copyButton = screen.getByTitle('Copy to clipboard')
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const hello = "world";')
      expect(mockOnCopy).toHaveBeenCalled()
    })
  })

  it('handles download functionality', () => {
    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = vi.fn(() => 'mock-url')
    const mockRevokeObjectURL = vi.fn()
    const mockClick = vi.fn()
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()
    
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    }
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    render(<CodeEditor {...defaultProps} />)
    
    const downloadButton = screen.getByTitle('Download file')
    fireEvent.click(downloadButton)
    
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockOnDownload).toHaveBeenCalled()
    
    // Cleanup
    vi.restoreAllMocks()
  })

  it('toggles fullscreen mode', () => {
    render(<CodeEditor {...defaultProps} />)
    
    const fullscreenButton = screen.getByTitle('Enter fullscreen')
    fireEvent.click(fullscreenButton)
    
    expect(screen.getByTitle('Exit fullscreen')).toBeInTheDocument()
  })

  it('handles onChange events', () => {
    render(<CodeEditor {...defaultProps} />)
    
    const editor = screen.getByTestId('mock-monaco-editor')
    fireEvent.change(editor, { target: { value: 'new code' } })
    
    expect(mockOnChange).toHaveBeenCalledWith('new code')
  })

  it('handles read-only mode', () => {
    render(<CodeEditor {...defaultProps} readOnly={true} />)
    
    const editor = screen.getByTestId('mock-monaco-editor')
    expect(editor).toHaveAttribute('readOnly')
  })

  it('applies custom className', () => {
    render(<CodeEditor {...defaultProps} className="custom-editor" />)
    
    const container = screen.getByTestId('mock-monaco-editor').closest('.custom-editor')
    expect(container).toBeInTheDocument()
  })

  it('handles different languages', () => {
    render(<CodeEditor {...defaultProps} language="typescript" />)
    
    expect(screen.getByText('TYPESCRIPT')).toBeInTheDocument()
  })

  it('shows correct line count for multiline code', () => {
    const multilineCode = `const hello = "world";
const foo = "bar";
const baz = "qux";`
    
    render(<CodeEditor {...defaultProps} value={multilineCode} />)
    
    expect(screen.getByText(/3 lines/)).toBeInTheDocument()
  })

  it('hides copy and download buttons when no value', () => {
    render(<CodeEditor {...defaultProps} value="" />)
    
    expect(screen.queryByTitle('Copy to clipboard')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Download file')).not.toBeInTheDocument()
  })

  it('handles theme switching', () => {
    const { rerender } = render(<CodeEditor {...defaultProps} theme="light" />)
    
    // Monaco editor theme would be passed to the mocked component
    // In a real test, you'd verify the theme prop is passed correctly
    
    rerender(<CodeEditor {...defaultProps} theme="vs-dark" />)
    
    // Theme change would be reflected in Monaco editor props
  })
})