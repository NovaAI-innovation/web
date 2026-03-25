'use client';

import { useState, useRef, useCallback } from 'react';
import { PenTool, Upload, Download, Send, Loader2 } from 'lucide-react';
import Image from 'next/image';

type Client = { id: string; name: string };
type Project = { id: string; name: string; clientId?: string };

const STATUS_MESSAGES = [
  'Analyzing drawing…',
  'Recognizing dimensions…',
  'Rendering clean schematic…',
];

export default function SchematicGenerator({
  clients,
  projects,
}: {
  clients: Client[];
  projects: Project[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [statusTimerId, setStatusTimerId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [svgTitle, setSvgTitle] = useState('');
  const [analysisOverview, setAnalysisOverview] = useState('');
  const [error, setError] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  const clientProjects = projects.filter(
    (p) => !selectedClientId || p.clientId === selectedClientId,
  );

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId('');
  };

  const pickFile = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSvg(null);
    setError('');
    setPushSuccess(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) pickFile(file);
  }, []);

  const startStatusCycle = () => {
    setStatusIdx(0);
    const id = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);
    setStatusTimerId(id);
    return id;
  };

  const stopStatusCycle = (id: ReturnType<typeof setInterval> | null) => {
    if (id) clearInterval(id);
    setStatusTimerId(null);
  };

  const generate = async () => {
    if (!selectedFile || loading) return;
    setError('');
    setSvg(null);
    setPushSuccess(false);
    setLoading(true);
    const timerId = startStatusCycle();

    try {
      const fd = new FormData();
      fd.append('image', selectedFile);
      if (selectedClientId) fd.append('clientId', selectedClientId);
      if (selectedProjectId) fd.append('projectId', selectedProjectId);
      if (notes.trim()) fd.append('notes', notes.trim());

      const res = await fetch('/api/admin/schematics/generate', { method: 'POST', body: fd });
      const payload = await res.json() as {
        data: { svg: string; title: string; analysisJson: string } | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setError(payload.error?.message ?? 'Generation failed');
      } else if (payload.data) {
        setSvg(payload.data.svg);
        setSvgTitle(payload.data.title);
        try {
          const analysis = JSON.parse(payload.data.analysisJson) as { overview?: string };
          setAnalysisOverview(analysis.overview ?? '');
        } catch {
          setAnalysisOverview('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      stopStatusCycle(timerId);
      setLoading(false);
    }
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${svgTitle.replace(/[^a-z0-9]/gi, '_') || 'schematic'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pushToProject = async () => {
    if (!svg || pushing) return;
    setPushing(true);
    setPushSuccess(false);
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const svgFile = new File(
        [blob],
        `${svgTitle.replace(/[^a-z0-9]/gi, '_') || 'schematic'}.svg`,
        { type: 'image/svg+xml' },
      );

      const fd = new FormData();
      fd.append('file', svgFile);
      if (selectedClientId) fd.append('clientId', selectedClientId);
      if (selectedProjectId) fd.append('projectId', selectedProjectId);

      const res = await fetch('/api/admin/documents/upload', { method: 'POST', body: fd });
      if (res.ok) {
        setPushSuccess(true);
      } else {
        const payload = await res.json() as { error?: { message?: string } };
        setError(payload.error?.message ?? 'Push to project failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPushing(false);
    }
  };

  // Clean up timer on unmount
  if (statusTimerId && !loading) {
    stopStatusCycle(statusTimerId);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left panel — controls */}
      <div className="space-y-6">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl cursor-pointer transition overflow-hidden ${
            dragOver
              ? 'border-chimera-gold bg-chimera-gold/5'
              : 'border-chimera-border hover:border-chimera-gold/50'
          }`}
        >
          {previewUrl ? (
            <div className="relative w-full h-48">
              <Image
                src={previewUrl}
                alt="Selected drawing"
                fill
                className="object-contain p-2"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                <span className="text-sm text-white">Click to replace</span>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center">
              <Upload className="w-8 h-8 text-chimera-text-muted mx-auto mb-3" />
              <div className="text-sm text-chimera-text-secondary mb-1">
                Drop a drawing here, or click to browse
              </div>
              <div className="text-xs text-chimera-text-muted">JPEG, PNG, WebP · max 20MB</div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={(e) => { if (e.target.files?.[0]) pickFile(e.target.files[0]); }}
          />
        </div>

        {/* Scope selectors */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-chimera-text-muted w-28 shrink-0">Client (optional):</label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="flex-1 bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-chimera-gold transition"
            >
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedClientId && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-chimera-text-muted w-28 shrink-0">Project (optional):</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex-1 bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-chimera-gold transition"
              >
                <option value="">No project</option>
                {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-chimera-text-muted block mb-1.5">
            Notes / context (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. master bedroom addition, second floor plan, scale 1:50…"
            className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-chimera-gold transition resize-none text-chimera-text-secondary placeholder:text-chimera-text-muted"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={() => void generate()}
          disabled={!selectedFile || loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-chimera-gold text-chimera-black text-sm font-medium transition hover:bg-chimera-gold/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {STATUS_MESSAGES[statusIdx]}
            </>
          ) : (
            <>
              <PenTool className="w-4 h-4" />
              Generate Schematic
            </>
          )}
        </button>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Right panel — output */}
      <div className="space-y-4">
        {svg ? (
          <>
            {/* SVG preview */}
            <div className="bg-white rounded-xl overflow-auto max-h-[500px] border border-chimera-border">
              <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full" />
            </div>

            {/* Title + overview */}
            {(svgTitle || analysisOverview) && (
              <div className="bg-chimera-dark border border-chimera-border rounded-xl p-4 space-y-1">
                {svgTitle && <div className="font-medium text-sm">{svgTitle}</div>}
                {analysisOverview && (
                  <div className="text-xs text-chimera-text-muted">{analysisOverview}</div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={downloadSvg}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-chimera-border hover:border-white/30 text-chimera-text-secondary hover:text-white transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download SVG
              </button>

              <button
                onClick={() => void pushToProject()}
                disabled={pushing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-chimera-surface border border-chimera-border hover:border-chimera-gold/50 text-chimera-text-secondary hover:text-white transition disabled:opacity-40"
              >
                {pushing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Push to Project
              </button>

              {pushSuccess && (
                <span className="text-xs text-chimera-gold">Pushed to documents.</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 rounded-xl border border-dashed border-chimera-border text-chimera-text-muted space-y-3">
            <PenTool className="w-10 h-10 opacity-30" />
            <div className="text-sm text-center px-6">
              Upload a hand-drawn or drafted schematic and click Generate to produce a clean professional drawing.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
