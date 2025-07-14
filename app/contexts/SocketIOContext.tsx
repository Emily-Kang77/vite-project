import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSocketIO } from '~/hooks/useSocketIO';

interface SocketIOContextType {
  isConnected: boolean;
  lastEvent: any;
  events: any[];
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string) => void;
  connect: () => void;
  disconnect: () => void;
}

const SocketIOContext = createContext<SocketIOContextType | null>(null);

interface SocketIOProviderProps {
  children: ReactNode;
  url?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function SocketIOProvider({ 
  children, 
  url = 'http://localhost:3000', // Default Socket.IO server URL
  onConnect,
  onDisconnect,
  onError
}: SocketIOProviderProps) {
  const {
    isConnected,
    lastEvent,
    events,
    emit,
    on,
    off,
    connect,
    disconnect
  } = useSocketIO({
    url,
    onConnect: () => {
      console.log('Socket.IO connected');
      onConnect?.();
    },
    onDisconnect: () => {
      console.log('Socket.IO disconnected');
      onDisconnect?.();
    },
    onError: (error) => {
      console.error('Socket.IO error:', error);
      onError?.(error);
    }
  });

  // Set up common event listeners (only for debugging, not for handling)
  useEffect(() => {
    // Only log events for debugging, don't handle them here
    // The actual event handling should be done in the components that need them
    const handleMessage = (data: any) => {
      console.log('SocketIOContext: Message event received (debug only)');
    };

    const handleUserJoined = (data: any) => {
      console.log('SocketIOContext: UserJoined event received (debug only)');
    };

    const handleUserLeft = (data: any) => {
      console.log('SocketIOContext: UserLeft event received (debug only)');
    };

    // Don't listen for joinSuccess here - let ChatComponent handle it
    // This prevents duplicate event handling
    on('message', handleMessage);
    on('userJoined', handleUserJoined);
    on('userLeft', handleUserLeft);

    return () => {
      off('message');
      off('userJoined');
      off('userLeft');
    };
  }, []); // Empty dependency array - only run once

  return (
    <SocketIOContext.Provider 
      value={{ 
        isConnected, 
        lastEvent, 
        events, 
        emit, 
        on, 
        off, 
        connect, 
        disconnect 
      }}
    >
      {children}
    </SocketIOContext.Provider>
  );
}

export function useSocketIOContext() {
  const context = useContext(SocketIOContext);
  if (!context) {
    throw new Error('useSocketIOContext must be used within SocketIOProvider');
  }
  return context;
} 