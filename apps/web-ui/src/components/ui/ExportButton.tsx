import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentIcon,
  TableCellsIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  data: any[];
  filename?: string;
  className?: string;
  disabled?: boolean;
}

type ExportFormat = 'json' | 'csv' | 'txt';

export function ExportButton({ 
  data, 
  filename = 'export', 
  className = '',
  disabled = false 
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const exportFormats = [
    {
      format: 'json' as ExportFormat,
      label: 'JSON',
      icon: CodeBracketIcon,
      description: 'JavaScript Object Notation',
    },
    {
      format: 'csv' as ExportFormat,
      label: 'CSV',
      icon: TableCellsIcon,
      description: 'Comma Separated Values',
    },
    {
      format: 'txt' as ExportFormat,
      label: 'TXT',
      icon: DocumentIcon,
      description: 'Plain text format',
    },
  ];

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  };

  const convertToText = (data: any[]) => {
    return data.map(item => {
      return Object.entries(item)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }).join('\n\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: ExportFormat) => {
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = convertToCSV(data);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'txt':
        content = convertToText(data);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      default:
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fullFilename = `${filename}_${timestamp}.${extension}`;
    
    downloadFile(content, fullFilename, mimeType);
    setIsOpen(false);
  };

  if (disabled || !data.length) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center px-3 py-2 border border-secondary-300 rounded-md text-sm font-medium text-secondary-400 bg-secondary-50 cursor-not-allowed',
          className
        )}
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        Export
      </button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-secondary-300 rounded-md text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        Export ({data.length})
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 mt-2 w-56 bg-white border border-secondary-200 rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="text-xs font-medium text-secondary-500 mb-2 px-2">
                Export {data.length} items as:
              </div>
              {exportFormats.map((format) => (
                <button
                  key={format.format}
                  onClick={() => handleExport(format.format)}
                  className="w-full flex items-center px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100 rounded-md transition-colors"
                >
                  <format.icon className="h-4 w-4 mr-3 text-secondary-400" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{format.label}</div>
                    <div className="text-xs text-secondary-500">{format.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}