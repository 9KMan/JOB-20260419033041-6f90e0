import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      setAuth(data.user, data.token);
      toast.success('Welcome back!');
      router.push('/dashboard');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const { data } = await authAPI.register(userData);
      setAuth(data.user, data.token);
      toast.success('Account created successfully!');
      router.push('/onboarding');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reset link');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    forgotPassword
  };
}