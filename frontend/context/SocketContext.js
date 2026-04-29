import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      newSocket.on('message:new', (message) => {
        console.log('New message:', message);
      });

      newSocket.on('order:statusChanged', (data) => {
        console.log('Order status changed:', data);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === null) {
    return null;
  }
  if (context === undefined) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}