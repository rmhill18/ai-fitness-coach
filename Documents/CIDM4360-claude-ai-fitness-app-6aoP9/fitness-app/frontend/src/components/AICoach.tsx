import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RotateCcw, Zap, Dumbbell, Utensils, TrendingUp, Lock } from 'lucide-react';
import { chatWithCoach } from '../api/client';
import type { UserProfile } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  user: UserProfile;
  isPro: boolean;
  onUpgrade: () => void;
}

const SUGGESTED_PROMPTS = [
  { icon: Dumbbell, text: "Create a workout for me today", color: "text-purple-400" },
  { icon: Utensils, text: "What should I eat to hit my protein goal?", color: "text-orange-400" },
  { icon: TrendingUp, text: "Why am I not losing weight?", color: "text-green-400" },
  { icon: Zap, text: "Give me a 10-minute morning routine", color: "text-yellow-400" },
];

const FREE_MESSAGE_LIMIT = 5;

export default function AICoach({ user, isPro, onUpgrade }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hey ${user.name.split(' ')[0]}! 👋 I'm Coach, your personal AI fitness coach. I know your goal is **${user.goal.replace('_', ' ')}** and I'm here to help you crush it. What can I help you with today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const remaining = FREE_MESSAGE_LIMIT - messageCount;
  const hitLimit = !isPro && messageCount >= FREE_MESSAGE_LIMIT;

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || hitLimit) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setMessageCount(c => c + 1);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const { response } = await chatWithCoach(user.id, text, history);
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I had trouble connecting. Check that the backend is running and try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Hey ${user.name.split(' ')[0]}! Fresh start — what's on your mind?`,
      timestamp: new Date(),
    }]);
    setMessageCount(0);
  };

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base">AI Coach</h1>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
              Online · Powered by Claude
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPro && (
            <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">
              {Math.max(0, remaining)} free left
            </span>
          )}
          <button onClick={clearChat} className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-primary-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[78%] ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-coach'}`}>
              <p
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/50 text-right' : 'text-gray-500'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="chat-bubble-coach">
              <div className="flex gap-1 items-center py-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggested prompts — show when only the welcome message is visible */}
        {messages.length === 1 && !loading && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-gray-500 text-center">Tap a prompt to get started</p>
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p.text)}
                className="w-full text-left bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
              >
                <p.icon className={`w-4 h-4 ${p.color} flex-shrink-0`} />
                <span className="text-sm text-gray-300">{p.text}</span>
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Paywall banner */}
      {hitLimit && (
        <div className="mx-4 mb-3 bg-gradient-to-r from-primary-500/20 to-emerald-500/20 border border-primary-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Free limit reached</p>
              <p className="text-xs text-gray-400">Upgrade to Pro for unlimited AI coaching</p>
            </div>
            <button onClick={onUpgrade} className="btn-primary text-sm py-2 px-3 flex-shrink-0">
              Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="input flex-1 text-sm"
            placeholder={hitLimit ? "Upgrade to continue chatting…" : "Ask your coach anything…"}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={hitLimit || loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || hitLimit}
            className="w-11 h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}
