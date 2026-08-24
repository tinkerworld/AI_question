import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';

interface ExamLockContextType {
  isExamLocked: boolean;
  setExamLocked: (locked: boolean) => void;
  triggerExitWarning: () => void;
  registerExitWarningHandler: (handler: () => void) => void;
  unregisterExitWarningHandler: () => void;
}

const ExamLockContext = createContext<ExamLockContextType | undefined>(undefined);

export const ExamLockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isExamLocked, setIsExamLockedState] = useState<boolean>(false);
  const handlerRef = useRef<(() => void) | null>(null);

  const setExamLocked = (locked: boolean) => {
    setIsExamLockedState(locked);
  };

  const registerExitWarningHandler = (handler: () => void) => {
    handlerRef.current = handler;
  };

  const unregisterExitWarningHandler = () => {
    handlerRef.current = null;
  };

  const triggerExitWarning = () => {
    if (handlerRef.current) {
      handlerRef.current();
    } else if (typeof (window as any).__triggerExamExitModal === 'function') {
      (window as any).__triggerExamExitModal();
    }
  };

  return (
    <ExamLockContext.Provider
      value={{
        isExamLocked,
        setExamLocked,
        triggerExitWarning,
        registerExitWarningHandler,
        unregisterExitWarningHandler,
      }}
    >
      {children}
    </ExamLockContext.Provider>
  );
};

export const useExamLock = (): ExamLockContextType => {
  const context = useContext(ExamLockContext);
  if (!context) {
    throw new Error('useExamLock must be used within an ExamLockProvider');
  }
  return context;
};
