/**
 * Formatting utilities for re-script
 */

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  }
  
  if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  
  return `${(tokens / 1000000).toFixed(1)}M`;
}

export function formatJobStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '⏳ Pending',
    running: '🔄 Running',
    paused: '⏸️ Paused',
    completed: '✅ Completed',
    failed: '❌ Failed',
    cancelled: '🚫 Cancelled',
  };
  
  return statusMap[status] || status;
}

export function formatProgressBar(current: number, total: number, width = 20): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.floor(percentage * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = (percentage * 100).toFixed(0);
  
  return `[${bar}] ${percent}%`;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength - 3) + '...';
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleString();
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}