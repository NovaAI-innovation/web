'use client';

import { useState, useRef, useEffect } from 'react';
import type { PortalMessage } from '@/lib/portal-messages';
import { Send, Bot, User, Hammer } from 'lucide-react';

const authorMeta = {
  client:  { label: 'Client',  bg: 'bg-chimera-surface',  icon: User,   align: 'items-start' },
  pm:      { label: 'PM',      bg: 'bg-chimera-gold/10',  icon: Hammer, align: 'items-start' },
  agent:   { label: 'Agent',   bg: 'bg-chimera-surface',  icon: Bot,    align: 'items-start' },
  system:  { label: 'System',  bg: 'bg-transparent',      icon: Bot,    align: 'items-center' },
} satisfies Record<PortalMessage['author'], { label: string; bg: string; icon: typeof User; align: string }>;

export default function AdminMessageThread({
  clientId,
  initialMessages,
}: {
  clientId: string;
  initialMessages: PortalMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);

    const res = await fetch(`/api/admin/messages/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply }),
    });

    const payload = await res.json() as { data: PortalMessage | null };
    if (payload.data) {
      setMessages((prev) => [...prev, payload.data!]);
      setReply('');
    }
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-chimera-text-muted py-8">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const meta = authorMeta[m.author];
            const Icon = meta.icon;
            return (
              <div key={m.id} className={`flex gap-3 ${meta.align}`}>
                <div className="w-7 h-7 rounded-full bg-chimera-surface border border-chimera-border flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-chimera-text-muted" />
                </div>
                <div className={`flex-1 rounded-xl px-4 py-3 ${meta.bg} border border-chimera-border`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-chimera-gold">{meta.label}</span>
                    <span className="text-xs text-chimera-text-muted">
                      {new Date(m.createdAt).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply form */}
      <form onSubmit={send} className="border-t border-chimera-border p-4 flex gap-3">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e); }
          }}
          placeholder="Reply as Project Manager… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-chimera-gold transition placeholder:text-chimera-text-muted"
        />
        <button
          type="submit"
          disabled={sending || !reply.trim()}
          className="self-end flex items-center gap-2 px-4 py-2.5 bg-chimera-gold text-black text-sm font-medium rounded-lg hover:bg-white transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
