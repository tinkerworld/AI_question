import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config/api';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface ImpersonationSession {
  id: string;
  token: string;
  actorUserId: string;
  actorEmail?: string;
  effectiveUserId: string;
  effectiveEmail?: string;
  mode: 'PREVIEW_STUDENT' | 'IMPERSONATE_REAL_STUDENT';
  reason?: string;
  sessionData: {
    simulatedPlan: 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';
    contentVersion: 'DRAFT' | 'REVIEW' | 'PUBLISHED';
    usageMode: 'NORMAL' | 'UNLIMITED_QA';
    courseAccess: string[];
    featureFlags: Record<string, boolean>;
  };
  startedAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  impersonationSession: ImpersonationSession | null;
  isImpersonating: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  previewTargetExamId: string | null;
  setPreviewTargetExamId: (id: string | null) => void;
  previewReturnTab: string | null;
  setPreviewReturnTab: (tab: string | null) => void;
  previewReturnExamId: string | null;
  setPreviewReturnExamId: (id: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  startPreview: (config: any) => Promise<{ success: boolean; message?: string }>;
  startImpersonation: (targetUserId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
  exitImpersonation: () => Promise<void>;
}

// Explicit one-time cleanup / migration of legacy localStorage tokens on app load
if (typeof window !== 'undefined') {
  try {
    const legacyToken = localStorage.getItem('token');
    const legacyRefresh = localStorage.getItem('refreshToken');
    const legacyImpersonation = localStorage.getItem('impersonationSession');
    if (legacyToken || legacyRefresh || legacyImpersonation) {
      // If current tab has no sessionStorage token yet, migrate legacy token into this single tab
      if (legacyToken && !sessionStorage.getItem('token')) {
        sessionStorage.setItem('token', legacyToken);
      }
      if (legacyRefresh && !sessionStorage.getItem('refreshToken')) {
        sessionStorage.setItem('refreshToken', legacyRefresh);
      }
      if (legacyImpersonation && !sessionStorage.getItem('impersonationSession')) {
        sessionStorage.setItem('impersonationSession', legacyImpersonation);
      }
      // Purge from localStorage so it never leaks across tabs again
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('impersonationSession');
    }
  } catch {
    // Ignore storage access errors
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('token');
  });
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('refreshToken');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('exams');
  const [previewTargetExamId, setPreviewTargetExamId] = useState<string | null>(null);
  const [previewReturnTab, setPreviewReturnTab] = useState<string | null>(null);
  const [previewReturnExamId, setPreviewReturnExamId] = useState<string | null>(null);

  const verifyAndLoadSession = async () => {
    const savedToken = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
    const savedRefresh = typeof window !== 'undefined' ? sessionStorage.getItem('refreshToken') : null;

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
        // Ensure active tab's token is in sessionStorage
        sessionStorage.setItem('token', savedToken);
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
          sessionStorage.setItem('token', newAccess);
          sessionStorage.setItem('refreshToken', newRefresh);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
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
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('refreshToken');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setToken(null);
          setRefreshToken(null);
        }
      } else {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
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
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const { accessToken, refreshToken: newRefresh, user: loggedInUser } = body.data;
        sessionStorage.setItem('token', accessToken);
        sessionStorage.setItem('refreshToken', newRefresh);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setToken(accessToken);
        setRefreshToken(newRefresh);
        setUser(loggedInUser);
        return { success: true };
      } else {
        return { success: false, message: body.message || 'Invalid email or password' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during authentication' };
    }
  };

  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const saved = sessionStorage.getItem('impersonationSession');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isImpersonating = !!impersonationSession && !!token;

  const startPreview = async (config: any): Promise<{ success: boolean; message?: string }> => {
    const currentStaffToken = sessionStorage.getItem('staffToken') || token || (typeof window !== 'undefined' ? sessionStorage.getItem('token') : null);
    if (!currentStaffToken) return { success: false, message: 'Authentication required' };

    try {
      const res = await fetch(`${API_BASE}/preview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentStaffToken}`,
        },
        body: JSON.stringify(config),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const { sessionToken, session } = body.data;
        // Backup staff token in sessionStorage if not already saved
        if (!sessionStorage.getItem('staffToken')) {
          sessionStorage.setItem('staffToken', currentStaffToken);
        }
        sessionStorage.setItem('token', sessionToken);
        sessionStorage.setItem('impersonationSession', JSON.stringify(session));
        localStorage.removeItem('token');
        localStorage.removeItem('impersonationSession');
        setToken(sessionToken);
        setImpersonationSession(session);

        // Fetch effective student profile
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (meRes.ok) {
          const meBody = await meRes.json();
          setUser(meBody.data);
        }

        if (config.targetExamId) {
          setPreviewTargetExamId(config.targetExamId);
        }
        if (config.returnTab) {
          setPreviewReturnTab(config.returnTab);
        }
        if (config.returnExamId) {
          setPreviewReturnExamId(config.returnExamId);
        }
        setActiveTab('student_exams');

        return { success: true };
      } else {
        return { success: false, message: body.message || 'Failed to start preview' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error starting preview' };
    }
  };

  const startImpersonation = async (targetUserId: string, reason: string): Promise<{ success: boolean; message?: string }> => {
    const currentStaffToken = sessionStorage.getItem('staffToken') || token || (typeof window !== 'undefined' ? sessionStorage.getItem('token') : null);
    if (!currentStaffToken) return { success: false, message: 'Authentication required' };

    try {
      const res = await fetch(`${API_BASE}/preview/impersonate/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentStaffToken}`,
        },
        body: JSON.stringify({ targetUserId, reason }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const { sessionToken, session } = body.data;
        if (!sessionStorage.getItem('staffToken')) {
          sessionStorage.setItem('staffToken', currentStaffToken);
        }
        sessionStorage.setItem('token', sessionToken);
        sessionStorage.setItem('impersonationSession', JSON.stringify(session));
        localStorage.removeItem('token');
        localStorage.removeItem('impersonationSession');
        setToken(sessionToken);
        setImpersonationSession(session);

        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (meRes.ok) {
          const meBody = await meRes.json();
          setUser(meBody.data);
        }
        setActiveTab('student_exams');
        return { success: true };
      } else {
        return { success: false, message: body.message || 'Failed to start impersonation' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error starting impersonation' };
    }
  };

  const exitImpersonation = async () => {
    const currentSession = impersonationSession;
    const staffToken = sessionStorage.getItem('staffToken');

    if (currentSession && token) {
      try {
        await fetch(`${API_BASE}/preview/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId: currentSession.id }),
        });
      } catch (e) {
        console.warn('Exit preview API error');
      }
    }

    sessionStorage.removeItem('impersonationSession');
    sessionStorage.removeItem('staffToken');
    localStorage.removeItem('impersonationSession');
    setImpersonationSession(null);
    setPreviewTargetExamId(null);

    const returnTab = previewReturnTab || 'exams';
    setPreviewReturnTab(null);

    if (staffToken) {
      sessionStorage.setItem('token', staffToken);
      localStorage.removeItem('token');
      setToken(staffToken);
      try {
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${staffToken}` },
        });
        if (meRes.ok) {
          const meBody = await meRes.json();
          setUser(meBody.data);
        }
      } catch {}
      setActiveTab(returnTab);
    } else {
      logout();
    }
  };

  const logout = async () => {
    const savedRefresh = typeof window !== 'undefined' ? sessionStorage.getItem('refreshToken') : null;
    const savedToken = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
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
      // Clear tab-specific sessionStorage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('impersonationSession');
      sessionStorage.removeItem('staffToken');
      // Also clear legacy localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('impersonationSession');
      setUser(null);
      setToken(null);
      setRefreshToken(null);
      setImpersonationSession(null);
      setPreviewTargetExamId(null);
      setPreviewReturnTab(null);
      setPreviewReturnExamId(null);
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
        impersonationSession,
        isImpersonating,
        activeTab,
        setActiveTab,
        previewTargetExamId,
        setPreviewTargetExamId,
        previewReturnTab,
        setPreviewReturnTab,
        previewReturnExamId,
        setPreviewReturnExamId,
        login,
        logout,
        startPreview,
        startImpersonation,
        exitImpersonation,
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
