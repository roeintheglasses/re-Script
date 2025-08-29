import { useEffect, useRef, useState } from 'react';

interface EventSourceOptions {
  url: string;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  enabled?: boolean;
  retryInterval?: number;
  maxRetries?: number;
}

interface UseEventSourceReturn {
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
  close: () => void;
}

export function useEventSource({
  url,
  onMessage,
  onError,
  onOpen,
  enabled = true,
  retryInterval = 5000,
  maxRetries = 5,
}: EventSourceOptions): UseEventSourceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!enabled || eventSourceRef.current) return;

    try {
      setError(null);
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = (event) => {
        console.log('EventSource connected:', url);
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;
        onOpen?.(event);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (parseError) {
          console.error('Failed to parse EventSource message:', parseError);
          onMessage?.(event.data);
        }
      };

      eventSource.onerror = (event) => {
        console.error('EventSource error:', event);
        setIsConnected(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Connection closed');
          
          // Attempt to reconnect if within retry limit
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`Attempting to reconnect (${retryCountRef.current}/${maxRetries}) in ${retryInterval}ms...`);
            
            retryTimeoutRef.current = setTimeout(() => {
              eventSourceRef.current = null;
              connect();
            }, retryInterval);
          } else {
            setError('Maximum reconnection attempts exceeded');
          }
        }

        onError?.(event);
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const disconnect = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
  };

  const reconnect = () => {
    disconnect();
    retryCountRef.current = 0;
    setError(null);
    connect();
  };

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [url, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    error,
    reconnect,
    close: disconnect,
  };
}