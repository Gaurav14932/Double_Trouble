'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from '@/components/MessageBubble';
import ResultsDisplay from '@/components/ResultsDisplay';
import { Send, Loader, Mic, Square } from 'lucide-react';
import { ChatResponseData } from '@/lib/chat-types';
import { AppLanguage, FEATURED_QUERIES, getUiCopy } from '@/lib/language';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  data?: ChatResponseData;
  timestamp?: string;
}

interface ChatHistorySnapshot {
  messages: Message[];
  input: string;
}

const normalizeMessage = (value: string) => value.replace(/\s+/g, ' ').trim();

function getSpeechRecognitionLanguage(language: AppLanguage) {
  if (language === 'hi') {
    return 'hi-IN';
  }

  if (language === 'mr') {
    return 'mr-IN';
  }

  return 'en-IN';
}

interface ChatInterfaceProps {
  language: AppLanguage;
}

export default function ChatInterface({ language }: ChatInterfaceProps) {
  const uiCopy = getUiCopy(language);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechBaseInputRef = useRef('');
  const speechTranscriptRef = useRef('');
  const skipVoiceAutoSendRef = useRef(false);
  const isListeningRef = useRef(false);
  const historyIndexRef = useRef(0);
  const pendingRequestIdRef = useRef(0);
  const sendMessageRef = useRef<(query: string) => Promise<void>>(async () => {});

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentState = (window.history.state ?? {}) as {
      chatView?: ChatHistorySnapshot;
      chatHistoryIndex?: number;
    };
    const snapshot = currentState.chatView;
    const historyIndex =
      typeof currentState.chatHistoryIndex === 'number'
        ? currentState.chatHistoryIndex
        : 0;

    historyIndexRef.current = historyIndex;

    if (snapshot) {
      messagesRef.current = snapshot.messages;
      setMessages(snapshot.messages);
      setInput(snapshot.input);
    } else {
      window.history.replaceState(
        {
          ...currentState,
          chatView: {
            messages: [],
            input: '',
          },
          chatHistoryIndex: 0,
        },
        ''
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      const nextState = (event.state ?? {}) as {
        chatView?: ChatHistorySnapshot;
        chatHistoryIndex?: number;
      };
      const nextSnapshot = nextState.chatView ?? {
        messages: [],
        input: '',
      };
      const nextIndex =
        typeof nextState.chatHistoryIndex === 'number'
          ? nextState.chatHistoryIndex
          : 0;

      pendingRequestIdRef.current += 1;
      historyIndexRef.current = nextIndex;
      messagesRef.current = nextSnapshot.messages;
      setMessages(nextSnapshot.messages);
      setInput(nextSnapshot.input);
      setLoading(false);
      setSpeechError('');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const pushHistorySnapshot = (snapshot: ChatHistorySnapshot) => {
    if (typeof window === 'undefined') return;

    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;

    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        chatView: snapshot,
        chatHistoryIndex: nextIndex,
      },
        ''
      );
  };

  const handleSendMessage = async (query: string) => {
    const normalizedQuery = normalizeMessage(query);
    if (!normalizedQuery) return;

    if (isListeningRef.current) {
      skipVoiceAutoSendRef.current = true;
      recognitionRef.current?.stop();
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: normalizedQuery,
      timestamp: new Date().toISOString(),
    };

    const requestId = pendingRequestIdRef.current + 1;
    pendingRequestIdRef.current = requestId;

    const pendingMessages = [...messagesRef.current, userMessage];
    messagesRef.current = pendingMessages;
    setMessages(pendingMessages);
    setInput('');
    setLoading(true);
    setSpeechError('');

    try {
      // Send query to backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: normalizedQuery, language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process query');
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content:
          data.reply || data.data?.explanation || 'Query executed successfully',
        data: data.data,
        timestamp: new Date().toISOString(),
      };

      if (pendingRequestIdRef.current !== requestId) {
        return;
      }

      const nextMessages = [...pendingMessages, assistantMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      pushHistorySnapshot({
        messages: nextMessages,
        input: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';

      const errorResponse: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };

      if (pendingRequestIdRef.current !== requestId) {
        return;
      }

      const nextMessages = [...pendingMessages, errorResponse];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      pushHistorySnapshot({
        messages: nextMessages,
        input: '',
      });
    } finally {
      if (pendingRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  sendMessageRef.current = handleSendMessage;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionApi =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) return;

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getSpeechRecognitionLanguage(language);

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setSpeechError('');
    };

    recognition.onresult = (event) => {
      const finalParts: string[] = [];
      const interimParts: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? '';

        if (event.results[i].isFinal) {
          finalParts.push(transcript);
        } else {
          interimParts.push(transcript);
        }
      }

      speechTranscriptRef.current = normalizeMessage(
        `${speechTranscriptRef.current} ${finalParts.join(' ')}`
      );

      const nextInput = normalizeMessage(
        `${speechBaseInputRef.current} ${speechTranscriptRef.current} ${interimParts.join(
          ' '
        )}`
      );

      setInput(nextInput);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') {
        return;
      }

      isListeningRef.current = false;
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setSpeechError(
          'Microphone permission is blocked. Please allow microphone access and try again.'
        );
        return;
      }

      if (event.error === 'audio-capture') {
        setSpeechError(
          'No microphone was detected. Please connect one and try again.'
        );
        return;
      }

      if (event.error === 'no-speech') {
        setSpeechError('No speech was detected. Please try again.');
        return;
      }

      setSpeechError('Voice input failed. Please try again.');
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);

      const finalText = normalizeMessage(
        `${speechBaseInputRef.current} ${speechTranscriptRef.current}`
      );
      const hasTranscript = speechTranscriptRef.current.length > 0;
      const skipAutoSend = skipVoiceAutoSendRef.current;
      const shouldAutoSend =
        hasTranscript && !skipAutoSend && speechBaseInputRef.current.length === 0;

      speechBaseInputRef.current = '';
      speechTranscriptRef.current = '';
      skipVoiceAutoSendRef.current = false;

      if (shouldAutoSend) {
        void sendMessageRef.current(finalText);
        return;
      }

      if (!skipAutoSend) {
        setInput(finalText);
      }
    };

    recognitionRef.current = recognition;
    setIsSpeechSupported(true);

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current || isListeningRef.current) {
      return;
    }

    recognitionRef.current.lang = getSpeechRecognitionLanguage(language);
  }, [language]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setSpeechError('Voice input is not supported in this browser.');
      return;
    }

    setSpeechError('');

    if (isListeningRef.current) {
      recognitionRef.current.stop();
      return;
    }

    speechBaseInputRef.current = normalizeMessage(input);
    speechTranscriptRef.current = '';
    skipVoiceAutoSendRef.current = false;

    try {
      recognitionRef.current.start();
    } catch {
      setSpeechError('Voice input could not start. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="min-h-full flex flex-col">
            <div className="flex-1 flex items-center">
              <div className="w-full mt-8 space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                    {uiCopy.emptyTitle}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {uiCopy.emptySubtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                  {FEATURED_QUERIES.map((query) => (
                    <button
                      key={query.id}
                      onClick={() => handleSendMessage(query.prompt)}
                      className="p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-sm text-gray-700 font-medium"
                    >
                      {query.labels[language]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center pb-6">
              <div className="max-w-2xl rounded-lg bg-gray-100 px-5 py-4 text-sm text-gray-700 shadow-sm">
                {uiCopy.welcomeMessage}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <MessageBubble message={msg} />
            {msg.data && msg.type === 'assistant' && (
              <div className="mt-3 ml-0">
                <ResultsDisplay data={msg.data} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Processing your query...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleSendMessage(input);
              }
            }}
            placeholder={
              isListening
                ? uiCopy.listeningPlaceholder
                : uiCopy.inputPlaceholder
            }
            className="flex-1"
            disabled={loading}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleVoiceInput}
            disabled={loading || !isSpeechSupported}
            aria-label={
              isListening ? uiCopy.voiceStopLabel : uiCopy.voiceStartLabel
            }
            title={
              isSpeechSupported
                ? isListening
                  ? uiCopy.voiceStopLabel
                  : uiCopy.voiceStartLabel
                : uiCopy.voiceUnsupportedHint
            }
            className={
              isListening
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                : ''
            }
          >
            {isListening ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={() => handleSendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
            aria-label={uiCopy.sendLabel}
            title={uiCopy.sendLabel}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto mt-2 min-h-5 text-sm">
          {speechError ? (
            <p className="text-red-600">{speechError}</p>
          ) : isListening ? (
            <p className="text-blue-600">{uiCopy.voiceListeningHint}</p>
          ) : isSpeechSupported ? (
            <p className="text-gray-500">{uiCopy.voiceReadyHint}</p>
          ) : (
            <p className="text-amber-600">{uiCopy.voiceUnsupportedHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
