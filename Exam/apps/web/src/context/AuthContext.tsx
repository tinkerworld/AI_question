import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = 'http://localhost:4000/api/v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem('refreshToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const verifyAndLoadSession = async () => {
    const savedToken = localStorage.getItem('token');
    const savedRefresh = localStorage.getItem('refreshToken');

    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (res.ok) {
        const body = await res.json();
        setUser(body.data);
        setToken(savedToken);
      } else if (res.status === 401 && savedRefresh) {
        // Try refresh token rotation
        const refRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: savedRefresh }),
        });

        if (refRes.ok) {
          const refBody = await refRes.json();
          const newAccess = refBody.data.accessToken;
          const newRefresh = refBody.data.refreshToken;
          localStorage.setItem('token', newAccess);
          localStorage.setItem('refreshToken', newRefresh);
          setToken(newAccess);
          setRefreshToken(newRefresh);

          // Fetch user details with new token
          const userRes = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${newAccess}` },
          });
          if (userRes.ok) {
            const userBody = await userRes.json();
            setUser(userBody.data);
          }
        } else {
          // Refresh failed -> clear session
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setToken(null);
          setRefreshToken(null);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      console.warn('Auth check offline or server unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyAndLoadSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const { accessToken, refreshToken: newRefresh, user: loggedInUser } = body.data;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        setToken(accessToken);
        setRefreshToken(newRefresh);
        setUser(loggedInUser);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, message: body.message || 'Invalid email or password' };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Network error during authentication' };
    }
  };

  const logout = async () => {
    const savedRefresh = localStorage.getItem('refreshToken');
    const savedToken = localStorage.getItem('token');
    try {
      if (savedToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify({ refreshToken: savedRefresh }),
        });
      }
    } catch (e) {
      console.warn('Logout API call error');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setToken(null);
      setRefreshToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
