import { ChatComponent } from "~/components/ChatComponent";
import { RoomsList } from "~/components/RoomsList";
import { useState, useEffect } from "react";
import type { Room } from "~/services/roomService";
import { useAuth } from "~/contexts/AuthContext";

export default function Chat() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const { token, isAuthenticated } = useAuth();

  // Fetch current user data when chat page loads
  useEffect(() => {
    if (isAuthenticated && token) {
      // Call fetchCurrentUser from AuthContext
      const fetchCurrentUser = async () => {
        try {
          const response = await fetch('http://localhost:3000/api/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Chat: Successfully fetched current user from backend:', data.user);
          } else {
            console.error('Chat: Failed to fetch current user');
          }
        } catch (error) {
          console.error('Chat: Error fetching current user:', error);
        }
      };
      
      fetchCurrentUser();
    }
  }, [isAuthenticated, token]);

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-200">
        Real-time Chat
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Rooms Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4">
            <RoomsList 
              onRoomSelect={handleRoomSelect}
              selectedRoomId={selectedRoom?.id}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4">
            {selectedRoom ? (
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  {selectedRoom.name}
                </h2>
                {selectedRoom.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {selectedRoom.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-4 text-center text-gray-500">
                Select a room to start chatting
              </div>
            )}
            <ChatComponent selectedRoom={selectedRoom} />
          </div>
        </div>
      </div>
    </div>
  );
} 