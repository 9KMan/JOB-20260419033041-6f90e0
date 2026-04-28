import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { messageAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useSocket } from '@/context/SocketContext';

export default function MessagesPage() {
  const router = useRouter();
  const socket = useSocket();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('message:new', (message) => {
        setMessages((prev) => [...prev, message.message]);
      });

      return () => {
        socket.off('message:new');
      };
    }
  }, [socket]);

  const fetchRooms = async () => {
    try {
      const { data } = await messageAPI.getRooms();
      setRooms(data.rooms || []);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomMessages = async (roomId) => {
    try {
      const { data } = await messageAPI.getRoomById(roomId);
      setSelectedRoom(data.room);
      setMessages(data.room.messages || []);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      const { data } = await messageAPI.send({
        content: newMessage,
        roomId: selectedRoom.id
      });
      setMessages([...messages, data.message]);
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Messages</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex h-[600px]">
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Conversations</h2>
              </div>
              {rooms.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => fetchRoomMessages(room.id)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      selectedRoom?.id === room.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {room.customer?.firstName} {room.customer?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {room.subject || 'Support Request'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        room.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {room.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="w-2/3 flex flex-col">
              {selectedRoom ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold">{selectedRoom.subject || 'Support Conversation'}</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderType === 'customer'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderType === 'customer' ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {formatDateTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="input flex-1"
                        placeholder="Type your message..."
                      />
                      <button type="submit" className="btn-primary">
                        Send
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a conversation to view messages
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}