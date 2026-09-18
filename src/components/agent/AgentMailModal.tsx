import { useState } from 'react';
import { EmailThread } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Mail, Send, User, Bot } from 'lucide-react';

interface AgentMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  threads: EmailThread[];
  selectedThread: EmailThread | null;
  onSelectThread: (threadId: string) => void;
  onSendMessage: (threadId: string, text: string) => void;
}

export function AgentMailModal({
  isOpen,
  onClose,
  threads,
  selectedThread,
  onSelectThread,
  onSendMessage,
}: AgentMailModalProps) {
  const [replyText, setReplyText] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (!replyText.trim() || !selectedThread) return;
    onSendMessage(selectedThread.id, replyText);
    setReplyText('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={<span className="font-serif text-lg font-medium">Correspondence & Inquiries</span>}
      subtitle={
        <span className="text-xs text-stone-500 font-mono">
          Mailbox: scout-alpha@sidedoor.agentmail.to • Verified via AgentMail
        </span>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[520px]">
        {/* Left: Threads List */}
        <div className="md:col-span-5 border border-stone-200 rounded-lg bg-stone-50/50 p-2 overflow-y-auto space-y-1.5 flex flex-col">
          <div className="px-2 py-1 text-[11px] font-mono uppercase text-stone-400">
            Dispatches ({threads.length})
          </div>

          {threads.map((thread) => {
            const isSelected = selectedThread?.id === thread.id;
            return (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-stone-900 shadow-xs ring-1 ring-stone-900'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-xs text-stone-900 truncate">
                    {thread.organizerName}
                  </span>
                  {thread.status === 'responded' ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-white font-medium">
                      Replied
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                      Dispatched
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-700 font-serif italic line-clamp-1">
                  {thread.eventTitle}
                </p>

                <p className="text-[11px] text-stone-500 line-clamp-1 mt-1 font-sans">
                  {thread.messages[thread.messages.length - 1]?.body}
                </p>

                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mt-2 pt-1 border-t border-stone-100">
                  <span>{thread.organizerEmail}</span>
                  <span>{thread.lastMessageAt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Message Reader */}
        <div className="md:col-span-7 border border-stone-200 rounded-lg bg-white flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                <h4 className="text-sm font-serif font-medium text-stone-900">
                  {selectedThread.subject}
                </h4>
                <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                  Organizer: {selectedThread.organizerName} &lt;{selectedThread.organizerEmail}&gt;
                </p>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {selectedThread.messages.map((msg) => {
                  const isAgent = msg.sender === 'agent';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-stone-500 font-mono">
                        {isAgent ? (
                          <>
                            <span className="text-stone-800 font-medium">SideDoor Scout</span>
                            <Bot className="w-3.5 h-3.5 text-stone-600" />
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-stone-600" />
                            <span className="text-stone-800 font-medium">{msg.senderName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{msg.sentAt}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed font-sans ${
                          isAgent
                            ? 'bg-stone-100 text-stone-900 border border-stone-200'
                            : 'bg-white text-stone-900 border border-stone-300 shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input */}
              <div className="p-3 border-t border-stone-100 bg-stone-50/50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Write a follow-up reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 font-sans"
                  />
                  <Button variant="primary" size="sm" onClick={handleSend} rightIcon={<Send className="w-3 h-3" />}>
                    Reply
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 text-xs p-6 text-center">
              <Mail className="w-8 h-8 mb-2 opacity-30" />
              <p>Select a correspondence thread to inspect.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
