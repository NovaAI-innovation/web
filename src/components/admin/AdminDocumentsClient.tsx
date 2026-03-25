'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, File, Trash2, Download } from 'lucide-react';

type Doc = {
  filename: string;
  source: string;
  size: number;
  uploadedAt: string;
  originalName: string;
  projectId?: string;
};

type Client = { id: string; name: string };
type Project = { id: string; name: string; clientId?: string };

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocumentsClient({
  initialDocs,
  clients,
  projects,
}: {
  initialDocs: Doc[];
  clients: Client[];
  projects: Project[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState(initialDocs);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const clientProjects = projects.filter(
    (p) => !selectedClientId || p.clientId === selectedClientId,
  );

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId('');
  };

  const upload = async (file: File) => {
    setUploadError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    if (selectedClientId) fd.append('clientId', selectedClientId);
    if (selectedProjectId) fd.append('projectId', selectedProjectId);

    const res = await fetch('/api/admin/documents/upload', { method: 'POST', body: fd });
    const payload = await res.json() as {
      data: { filename: string; name: string; size: number; uploadedAt: string } | null;
      error: { message: string } | null;
    };

    if (!res.ok || payload.error) {
      setUploadError(payload.error?.message ?? 'Upload failed');
    } else if (payload.data) {
      setDocs((prev) => [
        {
          filename: payload.data!.filename,
          source: 'contractor',
          size: payload.data!.size,
          uploadedAt: payload.data!.uploadedAt,
          originalName: payload.data!.name,
          projectId: selectedProjectId || undefined,
        },
        ...prev,
      ]);
    }
    setUploading(false);
    router.refresh();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.[0]) return;
    void upload(files[0]);
  };

  const deleteDoc = async (filename: string) => {
    if (!confirm(`Delete "${filename.replace(/^\d+-/, '')}"?`)) return;
    await fetch(`/api/client-portal/documents/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    setDocs((prev) => prev.filter((d) => d.filename !== filename));
    router.refresh();
  };

  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId)?.name ?? null;
  };

  return (
    <>
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition cursor-pointer ${
          dragOver ? 'border-chimera-gold bg-chimera-gold/5' : 'border-chimera-border hover:border-chimera-gold/50'
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-chimera-text-muted mx-auto mb-3" />
        <div className="text-sm text-chimera-text-secondary mb-1">
          {uploading ? 'Uploading…' : 'Drop a contractor document here, or click to browse'}
        </div>
        <div className="text-xs text-chimera-text-muted">PDF, DOC, DOCX, TXT, CSV, MD, JPG, PNG · max 50MB</div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.csv,.md,.jpg,.jpeg,.png"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-xs text-chimera-text-muted shrink-0">Scope to client (optional):</label>
        <select
          value={selectedClientId}
          onChange={(e) => handleClientChange(e.target.value)}
          className="bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-chimera-gold transition"
        >
          <option value="">All clients (shared)</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {selectedClientId && (
          <>
            <label className="text-xs text-chimera-text-muted shrink-0">Scope to project (optional):</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-chimera-gold transition"
            >
              <option value="">All projects (client-wide)</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </>
        )}
      </div>

      {uploadError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {uploadError}
        </div>
      )}

      {/* Doc list */}
      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
        {docs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-chimera-text-muted">
            No contractor documents uploaded yet.
          </div>
        ) : (
          <div className="divide-y divide-chimera-border">
            {docs.map((d) => {
              const projectName = getProjectName(d.projectId);
              return (
                <div key={d.filename} className="flex items-center gap-4 px-6 py-4 group">
                  <File className="w-4 h-4 text-chimera-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.originalName}</div>
                    <div className="text-xs text-chimera-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{fmtSize(d.size)} · {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-CA') : ''}</span>
                      {projectName && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-chimera-gold/10 text-chimera-gold border border-chimera-gold/20">
                          {projectName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <a
                      href={`/api/client-portal/documents/download/${encodeURIComponent(d.filename)}`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs text-chimera-text-muted hover:text-white px-2 py-1 rounded border border-chimera-border hover:border-white/30 transition"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                    <button
                      onClick={() => deleteDoc(d.filename)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
