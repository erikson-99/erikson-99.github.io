import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface DebugContextType {
  debug: boolean;
  setDebug: (v: boolean) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [debug, setDebug] = useState<boolean>(() => {
    const v = localStorage.getItem('app:debug');
    return v ? v === '1' : false;
  });

  useEffect(() => {
    localStorage.setItem('app:debug', debug ? '1' : '0');
  }, [debug]);

  const value = useMemo(() => ({ debug, setDebug }), [debug]);
  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
};

export const useDebug = (): DebugContextType => {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error('useDebug must be used within a DebugProvider');
  return ctx;
};

