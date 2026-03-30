import React from 'react';

interface MessageBubbleProps {
  message: {
    type: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  };
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function formatTimestamp(timestamp?: string) {
  if (!timestamp) {
    return null;
  }

  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return null;
  }

  return timeFormatter.format(parsedTimestamp);
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const timestampLabel = formatTimestamp(message.timestamp);

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
