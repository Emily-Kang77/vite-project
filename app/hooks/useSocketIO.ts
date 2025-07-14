import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketIOOptions {
  url: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface SocketEvent {
  event: string;
  data: any;
  timestamp: number;
}

export function useSocketIO(options: UseSocketIOOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(options.url, {
      autoConnect: options.autoConnect ?? true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000, // 5 second timeout
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      options.onConnect?.();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      options.onError?.(error);
    });

    return socket;
  }, [options.url, options.autoConnect, options.onConnect, options.onDisconnect, options.onError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, (data) => {
        const socketEvent: SocketEvent = {
          event,
          data,
          timestamp: Date.now(),
        };
        setLastEvent(socketEvent);
        setEvents(prev => [...prev, socketEvent]);
        callback(data);
      });
    }
  }, []);

  const off = useCallback((event: string) => {
    if (socketRef.current) {
      socketRef.current.off(event);
    }
  }, []);

  useEffect(() => {
    const socket = connect();
    
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array - only run once

  return {
    isConnected,
    lastEvent,
    events,
    emit,
    on,
    off,
    connect,
    disconnect,
    socket: socketRef.current,
  };
} 