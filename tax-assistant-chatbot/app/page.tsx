'use client';

import React, { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import Header from '@/components/Header';
import LoginPanel from '@/components/LoginPanel';
import { AppLanguage } from '@/lib/language';
import {
  EmployeeSession,
  EMPLOYEE_SESSION_STORAGE_KEY,
  restoreEmployeeSession,
} from '@/lib/employee-auth';

export default function Home() {
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [employee, setEmployee] = useState<EmployeeSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(
        EMPLOYEE_SESSION_STORAGE_KEY
      );

      if (storedValue) {
        const restored = restoreEmployeeSession(JSON.parse(storedValue));
        setEmployee(restored);
      }
    } catch {
      window.localStorage.removeItem(EMPLOYEE_SESSION_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const handleLogin = (session: EmployeeSession) => {
    setEmployee(session);
    window.localStorage.setItem(
      EMPLOYEE_SESSION_STORAGE_KEY,
      JSON.stringify(session)
    );
  };

  const handleLogout = () => {
    setEmployee(null);
    window.localStorage.removeItem(EMPLOYEE_SESSION_STORAGE_KEY);
  };

  return (
    <main className="h-screen min-h-0 overflow-hidden flex flex-col bg-background">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        employee={employee}
        onLogout={employee ? handleLogout : undefined}
      />
      {isHydrated ? (
        employee ? (
          <ChatInterface language={language} employee={employee} />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.35),_transparent_42%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)]">
            <LoginPanel language={language} onLogin={handleLogin} />
          </div>
        )
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50 text-sm text-slate-500">
          Preparing employee workspace...
        </div>
      )}
    </main>
  );
}
