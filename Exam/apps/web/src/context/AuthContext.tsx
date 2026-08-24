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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = 'http://localhost:4000/api/v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem('refreshToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('exams');
  const [previewTargetExamId, setPreviewTargetExamId] = useState<string | null>(null);
  const [previewReturnTab, setPreviewReturnTab] = useState<string | null>(null);
  const [previewReturnExamId, setPreviewReturnExamId] = useState<string | null>(null);

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

  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(() => {
    try {
      const saved = localStorage.getItem('impersonationSession');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isImpersonating = !!impersonationSession && !!token;

  const startPreview = async (config: any): Promise<{ success: boolean; message?: string }> => {
    const currentStaffToken = sessionStorage.getItem('staffToken') || token || localStorage.getItem('token');
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
        localStorage.setItem('token', sessionToken);
        localStorage.setItem('impersonationSession', JSON.stringify(session));
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
    const currentStaffToken = sessionStorage.getItem('staffToken') || token || localStorage.getItem('token');
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
        localStorage.setItem('token', sessionToken);
        localStorage.setItem('impersonationSession', JSON.stringify(session));
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

    localStorage.removeItem('impersonationSession');
    sessionStorage.removeItem('staffToken');
    setImpersonationSession(null);
    setPreviewTargetExamId(null);

    const returnTab = previewReturnTab || 'exams';
    setPreviewReturnTab(null);

    if (staffToken) {
      localStorage.setItem('token', staffToken);
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
      localStorage.removeItem('impersonationSession');
      sessionStorage.removeItem('staffToken');
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
