import { useState, useEffect } from 'react';
import { fetchRooms, createRoom, type Room } from '~/services/roomService';

interface RoomsListProps {
  onRoomSelect?: (room: Room) => void;
  selectedRoomId?: string;
}

export function RoomsList({ onRoomSelect, selectedRoomId }: RoomsListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  // Fetch rooms on component mount
  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedRooms = await fetchRooms();
      setRooms(fetchedRooms);
    } catch (err) {
      setError('Failed to load rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const newRoom = await createRoom({
        name: newRoomName,
        description: newRoomDescription || undefined,
      });
      setRooms(prev => [newRoom, ...prev]);
      setNewRoomName('');
      setNewRoomDescription('');
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create room');
      console.error('Error creating room:', err);
    }
  };

  const handleRoomClick = (room: Room) => {
    onRoomSelect?.(room);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Chat Rooms
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'New Room'}
        </button>
      </div>

      {/* Create Room Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateRoom} className="space-y-3 p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            className="w-full p-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <textarea
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            placeholder="Room description (optional)"
            className="w-full p-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Rooms List */}
      <div className="space-y-2">
        {rooms.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No rooms available</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => handleRoomClick(room)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedRoomId === room.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">
                    {room.name}
                  </h3>
                  {room.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {room.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(room.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {room.members && (
                    <span className="text-xs text-gray-500">
                      {room.members.length} members
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadRooms}
        className="w-full p-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        Refresh Rooms
      </button>
    </div>
  );
} 