'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowUp,
  ChevronLeft,
  Bot,
} from 'lucide-react';
import { EmailThread } from '@/types';
import { drawerBackdropVariants, drawerRightVariants } from '@/lib/animations';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { formatRelativeTime, formatMessageTime } from '@/lib/temporal';

interface OutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  threads: EmailThread[];
  onSendMessage: (threadId: string, text: string) => void;
}

const QUICK_PROMPTS = [
  'Door tickets policy (cash or card)?',
  'What time do doors open for walk-ups?',
  'Thanks, see you there!',
];

export function OutboxDrawer({
  isOpen,
  onClose,
  threads,
  onSendMessage,
}: OutboxDrawerProps) {
  useLockBodyScroll(isOpen);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const handleClose = useCallback(() => {
    setSelectedThreadId(null);
    setReplyText('');
    onClose();
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedThreadId) {
          setSelectedThreadId(null);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedThreadId, handleClose]);

  // Smooth scroll to latest message
  useEffect(() => {
    if (selectedThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread]);

  const handleSend = () => {
    if (!selectedThread || !replyText.trim()) return;
    onSendMessage(selectedThread.id, replyText.trim());
    setReplyText('');
  };

  const respondedCount = threads.filter(
    (t) => t.status === 'responded' || t.status === 'confirmed'
  ).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="outbox-backdrop"
            variants={drawerBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 transition-opacity"
          />

          {/* Minimalist Slide-out Panel */}
          <motion.aside
            key="outbox-panel"
            variants={drawerRightVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-[var(--theme-bg-surface)] border-l border-[var(--theme-border-subtle)] z-50 flex flex-col overflow-hidden text-[var(--theme-text-primary)]"
          >
            {/* Header */}
            <div className="h-14 px-5 border-b border-[var(--theme-border-subtle)] flex items-center justify-between shrink-0">
              {selectedThread ? (
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(null)}
                    className="p-1 -ml-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors rounded-md"
                    title="Back to threads"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium truncate">
                    {selectedThread.organizerName}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-medium tracking-tight">Outbox</span>
                  {respondedCount > 0 && (
                    <span className="text-[11px] font-mono text-[var(--theme-text-muted)]">
                      {respondedCount} active
                    </span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="p-1.5 -mr-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            {!selectedThread ? (
              /* THREAD LIST */
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--theme-border-subtle)]">
                {threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                    <p className="text-xs font-medium">No inquiries</p>
                    <p className="text-xs text-[var(--theme-text-muted)] mt-1">
                      Inquiries dispatched by your scout will appear here.
                    </p>
                  </div>
                ) : (
                  threads.map((thread) => {
                    const lastMsg = thread.messages[thread.messages.length - 1];
                    const isResponded =
                      thread.status === 'responded' || thread.status === 'confirmed';

                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => setSelectedThreadId(thread.id)}
                        className="w-full text-left px-5 py-3.5 hover:bg-[var(--theme-bg-base)] transition-colors flex flex-col gap-1 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium truncate pr-2">
                            {thread.organizerName}
                          </span>
                          <span className="text-[11px] text-[var(--theme-text-muted)] shrink-0 font-mono">
                            {formatRelativeTime(thread.lastMessageAt)}
                          </span>
                        </div>

                        <p className="text-xs text-[var(--theme-text-secondary)] truncate">
                          {thread.eventTitle}
                        </p>

                        <div className="flex items-center justify-between gap-3 mt-0.5">
                          <p className="text-[11px] text-[var(--theme-text-muted)] truncate flex-1">
                            {lastMsg?.body || 'No messages'}
                          </p>
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isResponded ? 'bg-emerald-500' : 'bg-amber-400/80'
                              }`}
                            title={isResponded ? 'Confirmed' : 'Dispatched'}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* CONVERSATION VIEW */
              <div className="flex-1 flex flex-col min-h-0">
                {/* Minimal Event Context */}
                <div className="px-5 py-2.5 border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-base)] flex items-center justify-between gap-4 shrink-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {selectedThread.eventTitle}
                    </p>
                    <p className="text-[11px] text-[var(--theme-text-muted)] truncate mt-0.5">
                      via {selectedThread.agentEmail}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${selectedThread.status === 'responded' || selectedThread.status === 'confirmed'
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                      }`}
                  >
                    {selectedThread.status === 'responded' || selectedThread.status === 'confirmed'
                      ? 'Confirmed'
                      : 'Pending'}
                  </span>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {selectedThread.messages.map((message) => {
                    const isAgent = message.sender === 'agent';

                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[var(--theme-text-muted)]">
                          {isAgent && <Bot className="w-3 h-3" />}
                          <span>{message.senderName || (isAgent ? 'Agent' : 'Organizer')}</span>
                          <span>·</span>
                          <span>{formatMessageTime(message.sentAt)}</span>
                        </div>

                        <div
                          className={`max-w-[88%] text-xs leading-relaxed rounded-xl px-3.5 py-2.5 whitespace-pre-wrap ${isAgent
                              ? 'bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)]'
                              : 'bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)]'
                            }`}
                        >
                          {message.body}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts */}
                <div className="px-5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-[var(--theme-border-subtle)] shrink-0">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setReplyText(prompt)}
                      className="text-[11px] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Clean Input Composer */}
                <div className="p-4 pt-2 shrink-0">
                  <div className="relative flex items-center bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] focus-within:border-[var(--theme-text-primary)]/40 rounded-xl transition-colors">
                    <input
                      type="text"
                      placeholder="Type a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="w-full text-xs bg-transparent py-2.5 pl-3.5 pr-10 focus:outline-none placeholder:text-[var(--theme-text-muted)]"
                    />

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!replyText.trim()}
                      aria-label="Send"
                      className="absolute right-1.5 p-1.5 rounded-lg bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}