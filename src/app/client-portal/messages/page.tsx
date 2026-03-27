"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileImage,
  File,
  Paperclip,
  Send,
  X,
  Brain,
  ChevronDown,
  Mic,
  MicOff,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type MessageAttachment = {
  filename: string;
  originalName: string;
  size: number;
};

type PortalMessage = {
  id: string;
  author: "client" | "pm" | "system" | "agent";
  body: string;
  reasoning?: string;
  createdAt: string;
  readByClient: boolean;
  attachment?: MessageAttachment;
  optimistic?: boolean;
  sendState?: "sending" | "failed";
  sendError?: string;
  retryFile?: File;
};

type ContractorDoc = {
  id: string;
  name: string;
  filename: string;
  size: number;
  uploadedAt: string;
  url: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <FileImage className="w-4 h-4 text-chimera-gold shrink-0" />;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext))
    return <FileText className="w-4 h-4 text-chimera-gold shrink-0" />;
  return <File className="w-4 h-4 text-chimera-gold shrink-0" />;
}

async function uploadClientAttachment(
  file: File,
  onProgress: (percent: number) => void,
): Promise<MessageAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", "client");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/client-portal/documents/upload");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          data: { filename: string; name: string; size: number } | null;
          error: { message: string } | null;
        };
        if (xhr.status < 200 || xhr.status >= 300 || !payload.data) {
          reject(new Error(payload.error?.message ?? "Upload failed"));
          return;
        }
        resolve({
          filename: payload.data.filename,
          originalName: payload.data.name ?? file.name,
          size: payload.data.size ?? file.size,
        });
      } catch {
        reject(new Error("Upload failed"));
      }
    };

    xhr.send(formData);
  });
}

// ── Reasoning block (collapsible) ────────────────────────────────────────────

function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-white/8 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-chimera-text-muted hover:text-chimera-text-secondary transition select-none"
      >
        <Brain className="w-3 h-3" />
        <span>Thinking</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-2 text-[11px] text-chimera-text-muted italic leading-relaxed whitespace-pre-wrap overflow-hidden"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex justify-start"
    >
      <motion.div
        animate={{ boxShadow: ["0 0 0px rgba(212,175,55,0)", "0 0 8px rgba(212,175,55,0.4)", "0 0 0px rgba(212,175,55,0)"] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-7 h-7 rounded-lg bg-chimera-gold/15 border border-chimera-gold/40 flex items-center justify-center text-[10px] font-bold text-chimera-gold shrink-0 mt-1 mr-2.5"
      >
        CE
      </motion.div>

      <div className="max-w-[72%]">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[11px] font-medium text-chimera-text-secondary">
            Chimera Guide
          </span>
        </div>
        <div className="bg-chimera-surface border border-chimera-border rounded-2xl rounded-tl-sm px-4 py-3.5">
          <div className="flex items-center gap-2">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-chimera-gold"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-chimera-gold"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-chimera-gold"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: 0.4 }}
            />
            <span className="ml-1 text-[11px] text-chimera-text-muted">composing…</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Left panel: contractor documents ─────────────────────────────────────────

function DocumentsPanel() {
  const [docs, setDocs] = useState<ContractorDoc[]>([]);

  useEffect(() => {
    fetch("/api/client-portal/documents", { cache: "no-store" })
      .then((r) => r.json())
      .then((p: { data: ContractorDoc[] | null }) => {
        if (p.data) setDocs(p.data);
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col h-full border-r border-chimera-border bg-chimera-dark/60">
      <div className="px-5 py-4 border-b border-chimera-border">
        <div className="text-[10px] tracking-[3px] text-chimera-gold uppercase">
          Project Documents
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {docs.length === 0 ? (
          <p className="text-xs text-chimera-text-muted px-2 py-3">
            No contractor documents on file.
          </p>
        ) : (
          docs.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              download
              className="flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-white/5 transition group"
            >
              <DocIcon filename={doc.filename} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white truncate leading-snug group-hover:text-chimera-gold transition">
                  {doc.name}
                </p>
                <p className="text-[10px] text-chimera-text-muted mt-0.5">
                  {formatBytes(doc.size)}
                </p>
              </div>
            </a>
          ))
        )}
      </div>
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const [recentActivityUntil, setRecentActivityUntil] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const isDev = process.env.NODE_ENV === "development";

  // Check mic support
  useEffect(() => {
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    setIsMicSupported(!!SR);
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/client-portal/messages", { cache: "no-store" });
      const payload = (await res.json()) as {
        data: { messages: PortalMessage[]; unreadCount: number } | null;
        error: { message: string } | null;
      };
      if (!res.ok || !payload.data)
        throw new Error(payload.error?.message ?? "Failed to load");
      const serverMessages = [...payload.data.messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages((prev) => {
        const localTransient = prev.filter(
          (m) => m.sendState === "sending" || m.sendState === "failed",
        );
        const merged = [...serverMessages];
        for (const local of localTransient) {
          if (!merged.some((m) => m.id === local.id)) merged.push(local);
        }
        return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
      setUnreadCount(payload.data.unreadCount);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(async () => {
    try {
      const res = await fetch("/api/client-portal/messages/read", { method: "POST" });
      if (res.ok) setUnreadCount(0);
    } catch { /* resilient */ }
  }, []);

  const clearConversation = useCallback(async () => {
    if (!confirm("[DEV] Clear all messages and memory for this client?")) return;
    setIsClearing(true);
    try {
      await fetch("/api/client-portal/dev/clear-conversation", { method: "POST" });
      await loadMessages();
    } finally {
      setIsClearing(false);
    }
  }, [loadMessages]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      await loadMessages();
      if (cancelled) return;
      const now = Date.now();
      const delayMs = isSending
        ? 1500
        : now < recentActivityUntil
          ? 2500
          : 10000;
      timer = setTimeout(() => void tick(), delayMs);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isSending, loadMessages, recentActivityUntil]);

  useEffect(() => {
    if (unreadCount > 0) void markRead();
  }, [markRead, unreadCount]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  // ── Send ───────────────────────────────────────────────────────────────────

  const sendClientMessage = useCallback(async (input: {
    body: string;
    file?: File | null;
    existingMessageId?: string;
    attachment?: MessageAttachment;
  }): Promise<boolean> => {
    const optimisticId = input.existingMessageId ?? `temp-${Date.now()}`;
    const displayText = input.body;

    if (input.existingMessageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { ...m, body: displayText, sendState: "sending", sendError: undefined, optimistic: true }
            : m,
        ),
      );
    } else {
      const optimisticMessage: PortalMessage = {
        id: optimisticId,
        author: "client",
        body: displayText,
        createdAt: new Date().toISOString(),
        readByClient: true,
        ...(input.file
          ? {
              attachment: {
                filename: input.file.name,
                originalName: input.file.name,
                size: input.file.size,
              },
            }
          : input.attachment
            ? { attachment: input.attachment }
            : {}),
        optimistic: true,
        sendState: "sending",
        ...(input.file ? { retryFile: input.file } : {}),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    setIsSending(true);
    setError(null);
    setRecentActivityUntil(Date.now() + 30_000);

    try {
      let attachmentData: MessageAttachment | undefined = input.attachment;

      if (input.file) {
        setUploadProgress(0);
        attachmentData = await uploadClientAttachment(input.file, setUploadProgress);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId ? { ...m, attachment: attachmentData, retryFile: undefined } : m,
          ),
        );
      }

      const res = await fetch("/api/client-portal/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: displayText,
          attachment: attachmentData,
        }),
      });
      const payload = (await res.json()) as {
        data: { message: PortalMessage } | null;
        error: { message: string } | null;
      };
      if (!res.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to send");
      }
      const confirmedMessage = payload.data.message;

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === optimisticId);
        if (idx === -1) return [...prev, confirmedMessage];
        const next = [...prev];
        next[idx] = confirmedMessage;
        return next;
      });
      void loadMessages();
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to send message";
      setError(errorMessage);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { ...m, optimistic: false, sendState: "failed", sendError: errorMessage }
            : m,
        ),
      );
      return false;
    } finally {
      setUploadProgress(null);
      setIsSending(false);
    }
  }, [loadMessages]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body && !attachedFile) return;

    const fileForSend = attachedFile;
    const displayText = body || `Shared a file: ${fileForSend?.name ?? "attachment"}`;

    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const sent = await sendClientMessage({
      body: displayText,
      file: fileForSend,
    });

    if (sent) {
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRetryMessage(messageId: string) {
    const failed = messages.find((m) => m.id === messageId && m.author === "client");
    if (!failed) return;
    await sendClientMessage({
      body: failed.body,
      file: failed.retryFile,
      existingMessageId: failed.id,
      attachment: failed.retryFile ? undefined : failed.attachment,
    });
  }

  function handleEditFailedMessage(messageId: string) {
    const failed = messages.find((m) => m.id === messageId && m.author === "client");
    if (!failed) return;
    setDraft(failed.body);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  // ── Voice input ────────────────────────────────────────────────────────────

  function toggleRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
          }
        }, 0);
      }
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  // ── Auto-resize textarea ───────────────────────────────────────────────────

  function handleDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-chimera-black overflow-hidden">
      {/* Page header */}
      <div className="px-6 lg:px-8 pt-6 pb-4 border-b border-chimera-border flex items-center justify-between shrink-0">
        <div>
          <div className="text-[10px] tracking-[3px] text-chimera-gold uppercase mb-1">
            Communication
          </div>
          <h1 className="font-display text-4xl tracking-tighter text-white">Messages</h1>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="text-xs bg-chimera-gold text-black px-2.5 py-1 rounded-full font-semibold">
              {unreadCount} new
            </span>
          )}
          <button
            type="button"
            onClick={() => void markRead()}
            className="text-xs text-chimera-text-muted hover:text-white border border-chimera-border hover:border-white/30 px-4 py-1.5 rounded-full transition"
          >
            Mark Read
          </button>
          {isDev && (
            <button
              type="button"
              onClick={() => void clearConversation()}
              disabled={isClearing}
              className="text-xs text-orange-400 hover:text-orange-300 border border-orange-400/30 hover:border-orange-300/50 px-4 py-1.5 rounded-full transition disabled:opacity-50 font-mono"
              title="DEV ONLY — clears messages + memory"
            >
              {isClearing ? "clearing…" : "⟳ new convo"}
            </button>
          )}
        </div>
      </div>

      {/* Main layout: docs panel left + conversation right */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: contractor documents */}
        <div className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col">
          <DocumentsPanel />
        </div>

        {/* Right: conversation */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-4">
            {isLoading && (
              <p className="text-sm text-chimera-text-muted">Loading…</p>
            )}
            {!isLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-chimera-surface border border-chimera-border flex items-center justify-center">
                  <span className="font-display text-chimera-gold text-lg">CE</span>
                </div>
                <p className="text-chimera-text-muted text-sm max-w-xs">
                  Your Chimera project manager is here. Ask about your project, schedule, or budget.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isClient = msg.author === "client";
                const authorLabel =
                  msg.author === "client"
                    ? "You"
                    : msg.author === "pm"
                    ? "Project Manager"
                    : msg.author === "agent"
                    ? "Chimera Guide"
                    : "System";

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                  >
                    {/* Agent avatar */}
                    {!isClient && (
                      <div className="w-7 h-7 rounded-lg bg-chimera-gold/15 border border-chimera-gold/30 flex items-center justify-center text-[10px] font-bold text-chimera-gold shrink-0 mt-1 mr-2.5">
                        CE
                      </div>
                    )}

                    <div className={`max-w-[72%] ${isClient ? "" : "min-w-0"}`}>
                      {/* Meta */}
                      <div
                        className={`flex items-baseline gap-2 mb-1.5 ${
                          isClient ? "justify-end" : ""
                        }`}
                      >
                        <span className="text-[11px] font-medium text-chimera-text-secondary">
                          {authorLabel}
                        </span>
                        <span className="text-[10px] text-chimera-text-muted">
                          {msg.sendState === "sending"
                            ? "sending..."
                            : msg.sendState === "failed"
                              ? "failed"
                              : formatTime(msg.createdAt)}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isClient
                            ? msg.sendState === "failed"
                              ? "bg-red-500/10 text-red-200 border border-red-500/30 rounded-tr-sm"
                              : "bg-chimera-gold text-black rounded-tr-sm"
                            : "bg-chimera-surface border border-chimera-border text-white rounded-tl-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.body}
                        </p>

                        {msg.attachment && (
                          <a
                            href={`/api/client-portal/documents/download/${msg.attachment.filename}`}
                            download
                            className={`mt-2.5 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg transition ${
                              isClient
                                ? "bg-black/10 text-black/80 hover:bg-black/20"
                                : "bg-chimera-gold/10 text-chimera-gold hover:bg-chimera-gold/20"
                            }`}
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">
                              {msg.attachment.originalName}
                            </span>
                            <span className="opacity-60">
                              {formatBytes(msg.attachment.size)}
                            </span>
                          </a>
                        )}

                        {!isClient && msg.reasoning && (
                          <ReasoningBlock text={msg.reasoning} />
                        )}

                        {isClient && msg.sendState === "failed" && (
                          <div className="mt-2.5 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void handleRetryMessage(msg.id)}
                              className="text-[11px] px-2.5 py-1 rounded-md border border-red-300/40 text-red-100 hover:bg-red-500/15 transition"
                            >
                              Retry
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditFailedMessage(msg.id)}
                              className="text-[11px] px-2.5 py-1 rounded-md border border-white/30 text-white/90 hover:bg-white/10 transition"
                            >
                              Edit
                            </button>
                          </div>
                        )}

                        {isClient && msg.sendState === "failed" && msg.sendError && (
                          <p className="mt-2 text-[11px] text-red-200/90">{msg.sendError}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isSending && <TypingIndicator key="typing" />}
            </AnimatePresence>

            <div ref={endRef} />
          </div>

          {/* Error */}
          {error && (
            <p className="px-4 lg:px-6 pb-2 text-xs text-red-400" aria-live="polite">
              {error}
            </p>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t border-chimera-border bg-chimera-dark/40 px-4 lg:px-6 py-3">

            {/* File chip */}
            <AnimatePresence>
              {attachedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 2, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mb-2 overflow-hidden"
                >
                  <div className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 bg-chimera-surface border border-chimera-gold/30 rounded-full text-xs text-white">
                    <Paperclip className="w-3 h-3 text-chimera-gold shrink-0" />
                    <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                    <span className="text-chimera-text-muted">
                      {formatBytes(attachedFile.size)}
                    </span>
                    {uploadProgress !== null && (
                      <span className="text-chimera-gold tabular-nums">{uploadProgress}%</span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove attachment"
                      onClick={() => {
                        setAttachedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="p-0.5 rounded-full text-chimera-text-muted hover:text-white hover:bg-white/10 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {uploadProgress !== null && (
                    <div className="mt-1 h-1.5 w-full max-w-[320px] bg-chimera-surface rounded-full overflow-hidden border border-chimera-border">
                      <div
                        className="h-full bg-chimera-gold transition-[width] duration-100"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              {/* Unified input container */}
              <div className="flex flex-col bg-chimera-surface/80 border border-chimera-border rounded-2xl focus-within:border-chimera-gold/50 transition-colors duration-200 overflow-hidden backdrop-blur-sm">

                <label htmlFor="message-draft" className="sr-only">
                  Send a message
                </label>
                <textarea
                  id="message-draft"
                  ref={textareaRef}
                  value={draft}
                  onChange={handleDraftChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Ask about your project, schedule, or budget…"
                  disabled={isSending}
                  className="resize-none bg-transparent border-0 outline-none ring-0 px-4 pt-3 pb-2 text-sm text-white placeholder:text-chimera-text-muted min-h-[44px] max-h-[160px] overflow-y-auto disabled:opacity-60"
                />

                {/* Action bar */}
                <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                  <div className="flex items-center gap-0.5">
                    {/* Paperclip */}
                    <button
                      type="button"
                      aria-label="Attach file"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                      className="p-2 rounded-lg text-chimera-text-muted hover:text-chimera-gold hover:bg-white/5 transition disabled:opacity-40"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Mic */}
                    {isMicSupported && (
                      <button
                        type="button"
                        aria-label={isRecording ? "Stop recording" : "Voice input"}
                        onClick={toggleRecording}
                        disabled={isSending}
                        className={`p-2 rounded-lg transition disabled:opacity-40 ${
                          isRecording
                            ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 animate-pulse"
                            : "text-chimera-text-muted hover:text-chimera-gold hover:bg-white/5"
                        }`}
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-chimera-text-muted hidden sm:block">
                      ↵ send · ⇧↵ newline
                    </span>

                    {/* Divider */}
                    <div className="w-px h-4 bg-chimera-border" />

                    {/* Send */}
                    <button
                      type="submit"
                      disabled={isSending || (!draft.trim() && !attachedFile)}
                      aria-label="Send message"
                      className="flex items-center justify-center w-8 h-8 rounded-xl bg-chimera-gold text-black hover:bg-white transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-chimera-gold"
                    >
                      {isSending ? (
                        <span className="w-3.5 h-3.5 block rounded-full border-2 border-black/40 border-t-black animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.md,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAttachedFile(file);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

