import React, { useState } from 'react';
import { 
  ArrowsRightLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import { CodeEditor } from './CodeEditor';
import { cn } from '@/lib/utils';

interface CodeComparisonProps {
  originalCode: string;
  processedCode: string;
  originalTitle?: string;
  processedTitle?: string;
  language?: string;
  className?: string;
}

type ViewMode = 'split' | 'original' | 'processed';

export function CodeComparison({
  originalCode,
  processedCode,
  originalTitle = 'Original Code',
  processedTitle = 'Processed Code',
  language = 'javascript',
  className = '',
}: CodeComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getStats = (code: string) => {
    const lines = code.split('\n').length;
    const chars = code.length;
    const size = new Blob([code]).size;
    return { lines, chars, size };
  };

  const originalStats = getStats(originalCode);
  const processedStats = getStats(processedCode);
  const compression = originalStats.size > 0 
    ? ((originalStats.size - processedStats.size) / originalStats.size * 100).toFixed(1)
    : '0';

  return (
    <div className={cn(
      'border border-secondary-200 rounded-lg overflow-hidden bg-white',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      {/* Header with controls */}
      <div className="bg-secondary-50 border-b border-secondary-200 px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-secondary-900">Code Comparison</h3>
            
            {/* Stats */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-secondary-600">
              <div className="flex items-center space-x-1">
                <span>Original:</span>
                <span className="font-mono">{originalStats.lines} lines</span>
                <span>•</span>
                <span className="font-mono">{(originalStats.size / 1024).toFixed(1)}KB</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>Processed:</span>
                <span className="font-mono">{processedStats.lines} lines</span>
                <span>•</span>
                <span className="font-mono">{(processedStats.size / 1024).toFixed(1)}KB</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>Change:</span>
                <span className={cn(
                  'font-mono',
                  parseFloat(compression) > 0 ? 'text-success-600' : 'text-error-600'
                )}>
                  {parseFloat(compression) > 0 ? '-' : '+'}{Math.abs(parseFloat(compression))}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View mode controls */}
            <div className="flex items-center border border-secondary-300 rounded-md">
              <button
                onClick={() => setViewMode('original')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium border-r border-secondary-300 transition-colors',
                  viewMode === 'original' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-secondary-700 hover:bg-secondary-100'
                )}
              >
                Original
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium border-r border-secondary-300 transition-colors flex items-center',
                  viewMode === 'split' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-secondary-700 hover:bg-secondary-100'
                )}
              >
                <ArrowsRightLeftIcon className="h-3 w-3 mr-1" />
                Split
              </button>
              <button
                onClick={() => setViewMode('processed')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'processed' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-secondary-700 hover:bg-secondary-100'
                )}
              >
                Processed
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-200 rounded transition-colors"
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
      </div>

      {/* Code editors */}
      <div className={cn(
        'flex',
        viewMode === 'split' ? 'divide-x divide-secondary-200' : '',
        isFullscreen ? 'flex-1' : ''
      )}>
        {/* Original code */}
        {(viewMode === 'split' || viewMode === 'original') && (
          <div className={cn(
            viewMode === 'split' ? 'flex-1' : 'w-full'
          )}>
            <CodeEditor
              value={originalCode}
              language={language}
              theme="vs-dark"
              height={isFullscreen ? '100%' : '500px'}
              readOnly={true}
              title={viewMode === 'split' ? originalTitle : undefined}
              className="border-0 rounded-none"
            />
          </div>
        )}

        {/* Processed code */}
        {(viewMode === 'split' || viewMode === 'processed') && (
          <div className={cn(
            viewMode === 'split' ? 'flex-1' : 'w-full'
          )}>
            <CodeEditor
              value={processedCode}
              language={language}
              theme="vs-dark"
              height={isFullscreen ? '100%' : '500px'}
              readOnly={true}
              title={viewMode === 'split' ? processedTitle : undefined}
              className="border-0 rounded-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}