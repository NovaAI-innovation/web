"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

type MessageAttachment = {
  filename: string;
  originalName: string;
  size: number;
};

type PortalMessage = {
  id: string;
  author: "client" | "pm" | "system";
  body: string;
  createdAt: string;
  readByClient: boolean;
  attachment?: MessageAttachment;
};

type MessagesResult = {
  data: {
    messages: PortalMessage[];
    unreadCount: number;
  } | null;
  error: { code: string; message: string } | null;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/client-portal/messages", { cache: "no-store" });
      const payload = (await response.json()) as MessagesResult;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to load messages");
      }
      setMessages(payload.data.messages);
      setUnreadCount(payload.data.unreadCount);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(async () => {
    try {
      const response = await fetch("/api/client-portal/messages/read", { method: "POST" });
      if (response.ok) {
        setUnreadCount(0);
      }
    } catch {
      // Keep UX resilient if read marker request fails.
    }
  }, []);

  useEffect(() => {
    void loadMessages();
    const timer = setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    if (unreadCount > 0) {
      void markRead();
    }
  }, [markRead, unreadCount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body && !attachedFile) return;

    setIsSending(true);
    setError(null);
    try {
      let attachmentData: MessageAttachment | undefined;

      // Upload file first if attached
      if (attachedFile) {
        const formData = new FormData();
        formData.append("file", attachedFile);

        const uploadRes = await fetch("/api/client-portal/documents/upload", {
          method: "POST",
          body: formData,
        });
        const uploadPayload = (await uploadRes.json()) as {
          data: { filename: string; name: string; size: number } | null;
          error: { message: string } | null;
        };
        if (!uploadRes.ok || !uploadPayload.data) {
          throw new Error(uploadPayload.error?.message ?? "Failed to upload file");
        }
        attachmentData = {
          filename: uploadPayload.data.filename,
          originalName: uploadPayload.data.name ?? attachedFile.name,
          size: uploadPayload.data.size ?? attachedFile.size,
        };
      }

      const response = await fetch("/api/client-portal/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: body || `Shared a file: ${attachedFile?.name ?? "attachment"}`,
          attachment: attachmentData,
        }),
      });
      const payload = (await response.json()) as {
        data: { message: PortalMessage } | null;
        error: { message: string } | null;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to send message");
      }
      setDraft("");
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadMessages();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  const orderedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [messages],
  );

  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <div className="text-chimera-gold text-sm tracking-widest mb-2">COMMUNICATION</div>
          <h1 className="font-display text-6xl tracking-tighter">Messages</h1>
          <p className="text-chimera-text-muted mt-3">
            Automatic refresh every 5 seconds for near real-time updates.
          </p>
        </div>

        <div className="glass rounded-3xl p-8 mb-6 flex items-center justify-between">
          <div className="text-sm text-chimera-text-muted">
            Notifications:{" "}
            <span className="text-chimera-gold font-semibold tabular-nums">{unreadCount}</span>{" "}
            unread
          </div>
          <button
            type="button"
            onClick={() => void markRead()}
            className="text-xs px-5 py-2 border border-chimera-border rounded-full hover:bg-white/5 transition"
          >
            Mark Read
          </button>
        </div>

        <div className="glass rounded-3xl p-8">
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
            {isLoading ? <p className="text-chimera-text-muted">Loading messages...</p> : null}
            {!isLoading && orderedMessages.length === 0 ? (
              <p className="text-chimera-text-muted">No messages yet.</p>
            ) : null}

            {orderedMessages.map((message) => {
              const isClient = message.author === "client";
              const timestamp = new Date(message.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <article
                  key={message.id}
                  className={`rounded-2xl px-5 py-4 max-w-3xl ${
                    isClient
                      ? "ml-auto bg-chimera-gold text-black"
                      : "bg-chimera-surface border border-chimera-border"
                  }`}
                >
                  <div
                    className={`text-[11px] uppercase tracking-wider mb-2 ${
                      isClient ? "text-black/70" : "text-chimera-text-muted"
                    }`}
                  >
                    {isClient ? "You" : message.author === "pm" ? "Project Manager" : "System"} |{" "}
                    {timestamp}
                  </div>
                  <p className={isClient ? "text-black" : "text-white"}>{message.body}</p>
                  {message.attachment && (
                    <a
                      href={`/api/client-portal/documents/download/${message.attachment.filename}`}
                      download
                      className={`mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition ${
                        isClient
                          ? "bg-black/10 text-black hover:bg-black/20"
                          : "bg-chimera-gold/10 text-chimera-gold hover:bg-chimera-gold/20"
                      }`}
                    >
                      <Paperclip className="w-3 h-3" />
                      {message.attachment.originalName}
                    </a>
                  )}
                </article>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 border-t border-chimera-border pt-6">
            <label htmlFor="message-draft" className="block text-sm text-chimera-text-muted mb-2">
              Send a message
            </label>
            <textarea
              id="message-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
              placeholder="Share an update or ask a question..."
            />

            {attachedFile && (
              <div className="mt-3 flex items-center gap-3 px-4 py-2 bg-chimera-surface rounded-xl border border-chimera-border">
                <Paperclip className="w-4 h-4 text-chimera-gold flex-shrink-0" />
                <span className="text-sm text-white truncate">{attachedFile.name}</span>
                <span className="text-xs text-chimera-text-muted">
                  {(attachedFile.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="ml-auto text-chimera-text-muted hover:text-red-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAttachedFile(file);
              }}
            />

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-chimera-text-muted hover:text-chimera-gold transition"
                >
                  <Paperclip className="w-4 h-4" />
                  Attach File
                </button>
                <span className="text-xs text-chimera-text-muted">Messages sync automatically</span>
              </div>
              <button
                type="submit"
                disabled={isSending}
                className="bg-chimera-gold hover:bg-white text-black font-semibold rounded-xl px-6 py-3 transition disabled:opacity-60"
              >
                {isSending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>

          {error ? (
            <p className="mt-4 text-sm text-red-400" aria-live="polite">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
