import { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const { user, isAuthenticated, setAuth } = useAuthStore();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setAuth(JSON.parse(storedUser), storedToken);
    }
  }, [setAuth]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}