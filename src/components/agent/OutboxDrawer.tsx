'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mail } from 'lucide-react';
import { EmailThread } from '@/types';
import { drawerBackdropVariants, drawerRightVariants } from '@/lib/animations';

interface OutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  threads: EmailThread[];
  onSendMessage: (threadId: string, text: string) => void;
}

export function OutboxDrawer({
  isOpen,
  onClose,
  threads,
  onSendMessage,
}: OutboxDrawerProps) {
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = (threadId: string) => {
    if (!replyText.trim()) return;
    onSendMessage(threadId, replyText);
    setReplyText('');
    setActiveReplyId(null);
  };

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
            onClick={onClose}
            aria-label="Close outbox drawer backdrop"
            className="fixed inset-0 bg-[var(--theme-bg-overlay)] backdrop-blur-xs z-40 cursor-default"
          />

          {/* Slide-out Panel (Right) */}
          <motion.aside
            key="outbox-panel"
            variants={drawerRightVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-[var(--theme-bg-surface)] border-l border-[var(--theme-border-subtle)] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-[var(--theme-border-subtle)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-text-primary)]">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-[var(--text-xl)] text-[var(--theme-text-primary)] leading-tight truncate">
                    Outbox
                  </h3>
                  <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans mt-0.5">
                    Agent responses &amp; confirmations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] text-[var(--text-sm)] p-1.5 rounded-lg hover:bg-[var(--theme-bg-base)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-accent)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {threads.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-xs)] text-[var(--theme-text-muted)] font-sans">
                  No active outbox inquiries. Contact the organizer on any gathering to begin.
                </div>
              ) : (
                threads.map((thread) => {
                  const lastMessage = thread.messages[thread.messages.length - 1];
                  const isReplying = activeReplyId === thread.id;

                  return (
                    <div
                      key={thread.id}
                      className="bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] rounded-xl p-3.5 text-[var(--text-xs)] space-y-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[var(--theme-text-primary)] font-sans">
                          {thread.organizerName}
                        </span>
                        <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)]">
                          {thread.lastMessageAt}
                        </span>
                      </div>

                      <p className="text-[var(--text-2xs)] text-[var(--theme-text-secondary)] leading-[var(--leading-relaxed)] font-mono">
                        "{lastMessage?.body || 'Inquiry dispatched to venue organizer.'}"
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[var(--text-2xs)] text-[var(--theme-brand-accent)] font-semibold uppercase tracking-wider font-mono">
                          {thread.status === 'responded' ? '✓ Confirmed' : 'Dispatched'}
                        </span>

                        <button
                          type="button"
                          onClick={() => setActiveReplyId(isReplying ? null : thread.id)}
                          className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] underline cursor-pointer focus-visible:outline-none"
                        >
                          {isReplying ? 'Cancel' : 'Reply'}
                        </button>
                      </div>

                      {isReplying && (
                        <div className="pt-2 flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Write message..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSend(thread.id);
                            }}
                            className="flex-1 text-[var(--text-xs)] bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] rounded-lg px-2.5 py-1.5 text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-brand-accent)]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSend(thread.id)}
                            className="p-1.5 rounded-lg bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] hover:opacity-90 transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
