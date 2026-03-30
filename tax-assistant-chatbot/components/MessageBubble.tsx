import React from 'react';
import { AppLanguage } from '@/lib/language';
import { getLocale } from '@/lib/ui-localization';

interface MessageBubbleProps {
  language: AppLanguage;
  message: {
    type: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  };
}

function formatTimestamp(timestamp: string | undefined, language: AppLanguage) {
  if (!timestamp) {
    return null;
  }

  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parsedTimestamp);
}

export default function MessageBubble({
  message,
  language,
}: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const timestampLabel = formatTimestamp(message.timestamp, language);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        {timestampLabel ? (
          <span
            className={`text-xs mt-1 block ${
              isUser ? 'text-blue-100' : 'text-gray-600'
            }`}
          >
            {timestampLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
