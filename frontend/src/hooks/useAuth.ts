import { useState, useEffect } from 'react';
import { apiService } from '../lib/api/client';
import { User } from '../types';

export interface AuthError extends Error {
  requiresVerification?: boolean;
  email?: string;
  statusCode?: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => setUser(null);
    window.addEventListener('auth:expired', handleExpiredSession);
    return () => window.removeEventListener('auth:expired', handleExpiredSession);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        setUser(response.data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiService.login(email, password);
      if (response.success && response.data) {
        const { user } = response.data;
        setUser(user);
        setLoading(false);
        return user;
      } else {
        setLoading(false);
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: unknown) {
      setLoading(false);
      const apiError = error as { 
        response?: { 
          status?: number;
          data?: { 
            message?: string; 
            requiresVerification?: boolean; 
            email?: string 
          } 
        } 
      };
      
      const err: AuthError = new Error(
        apiError.response?.data?.message || 
        (error instanceof Error ? error.message : 'Login failed')
      );
      err.requiresVerification = apiError.response?.data?.requiresVerification;
      err.email = apiError.response?.data?.email || email;
      err.statusCode = apiError.response?.status;
      throw err;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => {
    setLoading(true);
    try {
      const response = await apiService.register(userData);
      setLoading(false);
      // Do not automatically set user as authenticated: respects Supabase email confirmation
      return response;
    } catch (error: unknown) {
      setLoading(false);
      const apiError = error as { 
        response?: { 
          data?: { 
            message?: string; 
            requiresVerification?: boolean; 
            errors?: Array<{ msg: string }> 
          } 
        } 
      };
      const validationMsg = apiError.response?.data?.errors?.[0]?.msg;
      const message = validationMsg || apiError.response?.data?.message || (error instanceof Error ? error.message : 'Registration failed');
      const err: AuthError = new Error(message);
      err.requiresVerification = apiError.response?.data?.requiresVerification;
      throw err;
    }
  };

  const resendConfirmation = async (email: string) => {
    return await apiService.resendConfirmation(email);
  };

  const verifyEmail = async (token: string, email: string) => {
    return await apiService.verifyEmail(token, email);
  };

  const forgotPassword = async (email: string) => {
    return await apiService.forgotPassword(email);
  };

  const resetPassword = async (data: { token: string; email: string; newPassword: string }) => {
    return await apiService.resetPassword(data);
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return {
    user,
    loading,
    login,
    register,
    resendConfirmation,
    verifyEmail,
    forgotPassword,
    resetPassword,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };
};
