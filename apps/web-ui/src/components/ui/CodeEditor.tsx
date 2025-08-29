import React, { useState } from 'react';
import { Editor } from '@monaco-editor/react';
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ClipboardIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: 'vs-dark' | 'light';
  height?: string;
  readOnly?: boolean;
  showMinimap?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  title?: string;
  className?: string;
  onCopy?: () => void;
  onDownload?: () => void;
}

export function CodeEditor({
  value = '',
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  height = '400px',
  readOnly = false,
  showMinimap = true,
  wordWrap = 'on',
  title,
  className = '',
  onCopy,
  onDownload,
}: CodeEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    onChange?.(value);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const copyToClipboard = async () => {
    if (value) {
      try {
        await navigator.clipboard.writeText(value);
        onCopy?.();
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  const downloadFile = () => {
    if (value) {
      const blob = new Blob([value], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code.${language === 'javascript' ? 'js' : language}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onDownload?.();
    }
  };

  return (
    <div className={cn(
      'border border-secondary-200 rounded-lg overflow-hidden',
      isFullscreen && 'fixed inset-0 z-50 bg-white',
      className
    )}>
      {/* Header */}
      <div className="bg-secondary-50 border-b border-secondary-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {title && (
            <h3 className="text-sm font-medium text-secondary-900">{title}</h3>
          )}
          <div className="flex items-center space-x-1 text-xs text-secondary-500">
            <span className="uppercase">{language}</span>
            <span>•</span>
            <span>{value.split('\n').length} lines</span>
            <span>•</span>
            <span>{new Blob([value]).size} bytes</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {value && (
            <>
              <button
                onClick={copyToClipboard}
                className="p-1.5 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                <ClipboardIcon className="h-4 w-4" />
              </button>
              <button
                onClick={downloadFile}
                className="p-1.5 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-200 rounded transition-colors"
                title="Download file"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-200 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="h-4 w-4" />
            ) : (
              <ArrowsPointingOutIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className={cn(
        'relative',
        isFullscreen && 'flex-1'
      )}>
        <Editor
          height={isFullscreen ? '100%' : height}
          language={language}
          theme={theme}
          value={value}
          onChange={handleEditorChange}
          options={{
            readOnly,
            minimap: { enabled: showMinimap },
            wordWrap,
            fontSize: 14,
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-secondary-500">Loading editor...</div>
            </div>
          }
        />
      </div>
    </div>
  );
}