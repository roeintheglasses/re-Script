import React from 'react';
import {
  SignalIcon,
  SignalSlashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ 
  isConnected, 
  error, 
  onReconnect,
  className = '',
}: ConnectionStatusProps) {
  if (isConnected && !error) {
    return (
      <div className={`flex items-center text-success-600 ${className}`}>
        <SignalIcon className="h-4 w-4 mr-1" />
        <span className="text-xs font-medium">Live</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center text-error-600 ${className}`}>
        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
        <span className="text-xs font-medium">Error</span>
        {onReconnect && (
          <button
            onClick={onReconnect}
            className="ml-2 text-xs text-error-500 hover:text-error-700 transition-colors"
            title="Reconnect"
          >
            <ArrowPathIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center text-warning-600 ${className}`}>
      <SignalSlashIcon className="h-4 w-4 mr-1" />
      <span className="text-xs font-medium">Connecting...</span>
    </div>
  );
}