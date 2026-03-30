'use client';

import React, { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import Header from '@/components/Header';
import { AppLanguage } from '@/lib/language';

export default function Home() {
  const [language, setLanguage] = useState<AppLanguage>('en');

  return (
    <main className="h-screen flex flex-col bg-background">
      <Header language={language} onLanguageChange={setLanguage} />
      <ChatInterface language={language} />
    </main>
  );
}
