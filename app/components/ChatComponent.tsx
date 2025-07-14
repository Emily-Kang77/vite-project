import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocketIOContext } from '~/contexts/SocketIOContext';
import { useAuth } from '~/contexts/AuthContext';
import type { Room } from '~/services/roomService';

interface Message {
  id: string;
  text: string;
  user: string;
  timestamp: number;
}

interface ChatComponentProps {
  selectedRoom?: Room | null;
}

export function ChatComponent({ selectedRoom }: ChatComponentProps) {
  const { isConnected, emit, on, lastEvent, connect } = useSocketIOContext();
  const { user, isAuthenticated } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // Rate limit states
  const [messageCooldown, setMessageCooldown] = useState(0);
  const [joinCooldown, setJoinCooldown] = useState(0);
  const [messageError, setMessageError] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create stable event handlers using useCallback
  const handleMessage = useCallback((data: Message) => {
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const messageExists = prev.some(msg => msg.id === data.id);
      if (messageExists) {
        console.log('Message already exists, skipping duplicate:', data.id);
        return prev;
      }
      return [...prev, data];
    });
  }, []);

  const handleUserJoined = useCallback((data: { user: string }) => {
    setMessages(prev => {
      // Check if this join message already exists
      const joinMessageExists = prev.some(msg => 
        msg.user === 'System' && 
        msg.text === `${data.user} joined the chat`
      );
      
      if (joinMessageExists) {
        console.log('Join message already exists, skipping duplicate for:', data.user);
        return prev;
      }
      
      return [...prev, {
        id: `join-${Date.now()}-${Math.random()}`,
        text: `${data.user} joined the chat`,
        user: 'System',
        timestamp: Date.now()
      }];
    });
  }, []);

  const handleUserLeft = useCallback((data: { user: string }) => {
    setMessages(prev => {
      // Check if this leave message already exists
      const leaveMessageExists = prev.some(msg => 
        msg.user === 'System' && 
        msg.text === `${data.user} left the chat`
      );
      
      if (leaveMessageExists) {
        console.log('Leave message already exists, skipping duplicate for:', data.user);
        return prev;
      }
      
      return [...prev, {
        id: `leave-${Date.now()}-${Math.random()}`,
        text: `${data.user} left the chat`,
        user: 'System',
        timestamp: Date.now()
      }];
    });
  }, []);

  const handleJoinSuccess = useCallback((data: { roomId: string, user: string }) => {
    console.log('ChatComponent: handleJoinSuccess called with data:', data);
    console.log('ChatComponent: Current state before update - isJoined:', isJoined, 'isJoining:', isJoining);
    setIsJoined(true);
    setIsJoining(false);
    setJoinError('');
    setJoinCooldown(0); // Clear any join cooldown
    console.log('ChatComponent: State update triggered for joinSuccess');
  }, [isJoined, isJoining]);

  const handleJoinError = useCallback((data: { error: string; resetTime?: number }) => {
    console.error('Frontend: Failed to join room:', data.error);
    let errorMessage = data.error;
    
    if (data.resetTime) {
      const resetDate = new Date(data.resetTime);
      const timeUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / 1000);
      errorMessage += ` Try again in ${timeUntilReset} seconds.`;
      setJoinCooldown(timeUntilReset);
    }
    
    setJoinError(errorMessage);
    setIsJoined(false);
    setIsJoining(false);
  }, []);

  const handleUserList = useCallback((data: any) => {
    console.log('Frontend: Received userList event:', data);
  }, []);

  const handleMessageError = useCallback((data: { error: string; resetTime?: number }) => {
    console.error('Frontend: Message error:', data.error);
    let errorMessage = data.error;
    
    if (data.resetTime) {
      const resetDate = new Date(data.resetTime);
      const timeUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / 1000);
      errorMessage += ` Try again in ${timeUntilReset} seconds.`;
      setMessageCooldown(timeUntilReset);
    }
    
    setMessageError(errorMessage);
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setMessageError('');
    }, 5000);
  }, []);

  // Set up event listeners once with stable handlers
  useEffect(() => {
    console.log('ChatComponent: Setting up event listeners');
    console.log('ChatComponent: Socket connection status:', isConnected);
    console.log('ChatComponent: Available socket functions:', {
      emit: typeof emit,
      on: typeof on,
      connect: typeof connect
    });
    
    // Log each event registration
    console.log('ChatComponent: Registering event listeners...');
    on('message', handleMessage);
    console.log('ChatComponent: Registered "message" listener');
    
    on('userJoined', handleUserJoined);
    console.log('ChatComponent: Registered "userJoined" listener');
    
    on('userLeft', handleUserLeft);
    console.log('ChatComponent: Registered "userLeft" listener');
    
    on('joinSuccess', handleJoinSuccess);
    console.log('ChatComponent: Registered "joinSuccess" listener');
    
    on('joinError', handleJoinError);
    console.log('ChatComponent: Registered "joinError" listener');
    
    on('userList', handleUserList);
    console.log('ChatComponent: Registered "userList" listener');

    on('messageError', handleMessageError);
    console.log('ChatComponent: Registered "messageError" listener');

    console.log('ChatComponent: All event listeners set up');

    // Cleanup function
    return () => {
      console.log('ChatComponent: Cleaning up event listeners');
      // Note: The 'off' function might not be available in this implementation
      // If it causes issues, we can remove the cleanup
    };
  }, [on, handleMessage, handleUserJoined, handleUserLeft, handleJoinSuccess, handleJoinError, handleUserList, handleMessageError]);

  // Countdown timers for rate limits
  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageCooldown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const joinTimer = setInterval(() => {
      setJoinCooldown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(messageTimer);
      clearInterval(joinTimer);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadRoomMessages = useCallback(async () => {
    if (!selectedRoom) {
      console.log('No selected room, skipping message load');
      return;
    }
    
    console.log('Loading messages for room:', selectedRoom.id, selectedRoom.name);
    
    try {
      setLoadingMessages(true);
      const url = `http://localhost:3000/api/rooms/${selectedRoom.id}/messages`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const roomMessages = await response.json();
        console.log('Received messages:', roomMessages);
        // Transform database messages to match our Message interface
        const transformedMessages: Message[] = roomMessages.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          user: msg.user?.username || 'Unknown',
          timestamp: new Date(msg.createdAt).getTime()
        }));
        setMessages(transformedMessages);
      } else {
        console.error('Failed to load messages - status:', response.status);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedRoom]);

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      console.log('Frontend: Room selected:', selectedRoom);
      console.log('Frontend: Room ID:', selectedRoom.id);
      console.log('Frontend: Room name:', selectedRoom.name);
      loadRoomMessages();
    }
  }, [selectedRoom, loadRoomMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected || !isAuthenticated || !selectedRoom || !isJoined || messageCooldown > 0) return;

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text: newMessage,
      user: user?.username || 'Unknown',
      timestamp: Date.now()
    };

    // Send message with room and user info for database
    emit('message', {
      ...message,
      roomId: selectedRoom.id,
      userId: user?.id || 'unknown'
    });
    setNewMessage('');
  };

  const handleJoin = () => {
    console.log('ChatComponent: handleJoin called');
    console.log('ChatComponent: Join conditions - isAuthenticated:', isAuthenticated, 'isConnected:', isConnected, 'selectedRoom:', !!selectedRoom, 'isJoining:', isJoining);
    
    if (isAuthenticated && isConnected && selectedRoom && !isJoining && joinCooldown === 0) {
      console.log('ChatComponent: All conditions met, proceeding with join');
      console.log('ChatComponent: User details - ID:', user?.id, 'username:', user?.username);
      console.log('ChatComponent: Room details - ID:', selectedRoom.id, 'name:', selectedRoom.name);
      
      setIsJoined(false);
      setIsJoining(true);
      setJoinError('');
      
      const joinData = { 
        username: user?.username,
        userId: user?.id,
        roomId: selectedRoom.id 
      };
      console.log('ChatComponent: Emitting join event with data:', joinData);
      console.log('ChatComponent: Socket emit function type:', typeof emit);
      
      emit('join', joinData);
      console.log('ChatComponent: Join event emitted');
    } else {
      console.log('ChatComponent: Cannot join - conditions not met');
      console.log('ChatComponent: - isAuthenticated:', isAuthenticated);
      console.log('ChatComponent: - isConnected:', isConnected);
      console.log('ChatComponent: - selectedRoom exists:', !!selectedRoom);
      console.log('ChatComponent: - isJoining:', isJoining);
      console.log('ChatComponent: - joinCooldown:', joinCooldown);
    }
  };

  // Show placeholder if no room is selected
  if (!selectedRoom) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <p>Select a room from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p>Please log in to join the chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className={`p-3 rounded-lg text-center ${
        isConnected 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* User Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Logged in as: <span className="font-semibold">{user?.username}</span>
        </p>
      </div>

      {/* Join Button */}
      <button
        onClick={handleJoin}
        disabled={!isConnected || isJoined || isJoining || joinCooldown > 0}
        className={`w-full p-2 rounded-lg transition-colors ${
          isJoined 
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50' 
            : isJoining
            ? 'bg-yellow-500 text-white cursor-not-allowed'
            : joinCooldown > 0
            ? 'bg-red-400 text-white cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isJoined 
          ? '✅ Joined' 
          : isJoining 
          ? 'Joining...' 
          : joinCooldown > 0 
          ? `⏳ Try again in ${joinCooldown}s` 
          : 'Join Chat'
        }
      </button>

      {/* Join Error */}
      {joinError && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg dark:bg-red-900 dark:text-red-200">
          Failed to join: {joinError}
        </div>
      )}

      {/* Messages */}
      <div className="h-64 overflow-y-auto border border-gray-300 rounded-lg p-3 dark:border-gray-600 dark:bg-gray-800">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet</p>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                    {message.user}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Error */}
      {messageError && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg dark:bg-red-900 dark:text-red-200">
          {messageError}
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={messageCooldown > 0 ? `Wait ${messageCooldown}s...` : "Type a message..."}
          disabled={!isConnected || !isJoined || messageCooldown > 0}
          className="flex-1 p-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isConnected || !newMessage.trim() || !isJoined || messageCooldown > 0}
          className={`px-4 py-2 rounded-lg transition-colors ${
            messageCooldown > 0
              ? 'bg-red-400 text-white cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {messageCooldown > 0 ? `${messageCooldown}s` : 'Send'}
        </button>
      </form>

      {/* Last Event Debug */}
      {lastEvent && (
        <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded dark:bg-gray-800">
          Last event: {lastEvent.event} - {JSON.stringify(lastEvent.data)}
        </div>
      )}
    </div>
  );
} 