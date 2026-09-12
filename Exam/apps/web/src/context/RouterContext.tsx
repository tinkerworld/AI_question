import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface RouterContextType {
  path: string;
  navigate: (to: string, replace?: boolean) => void;
  isPath: (matches: string | string[]) => boolean;
}

export const normalizePath = (rawPath: string): string => {
  if (!rawPath || rawPath === '') return '/';
  let cleaned = rawPath.trim().toLowerCase();
  // Strip trailing slash if longer than 1 character
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
};

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/';
  });

  const navigate = useCallback((to: string, replace: boolean = false) => {
    const target = normalizePath(to);
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState({}, '', target);
      } else {
        window.history.pushState({}, '', target);
      }
      setPath(target);
      window.scrollTo(0, 0);
    }
  }, []);

  const isPath = useCallback((matches: string | string[]): boolean => {
    if (Array.isArray(matches)) {
      return matches.some((m) => normalizePath(m) === path);
    }
    return normalizePath(matches) === path;
  }, [path]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <RouterContext.Provider value={{ path, navigate, isPath }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
