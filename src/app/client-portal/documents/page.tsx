'use client';

import { useState, useRef, useEffect } from 'react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'uploading' | 'success' | 'error';
  filename?: string;
}

export default function DocumentsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    void handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    void handleFiles(selectedFiles);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFiles = async (newFiles: File[]) => {
    for (const file of newFiles) {
      const tempId = 'upload-' + Date.now() + Math.random().toString(36).substr(2, 9);
      
      const tempFile: UploadedFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString().split('T')[0],
        status: 'uploading'
      };

      setFiles(prev => [tempFile, ...prev]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/client-portal/documents/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await res.json();

        if (res.ok && result.data) {
          setFiles(prev => 
            prev.map(f => 
              f.id === tempId 
                ? {
                    ...f,
                    id: result.data.id,
                    filename: result.data.filename,
                    status: 'success' as const,
                    uploadedAt: result.data.uploadedAt || f.uploadedAt
                  }
                : f
            )
          );
        } else {
          setFiles(prev => prev.filter(f => f.id !== tempId));
        }
      } catch {
        setFiles(prev => prev.filter(f => f.id !== tempId));
      }
    }
  };

  const deleteFile = async (id: string, filename?: string) => {
    const target = filename || id;
    setFiles(prev => prev.filter(f => f.id !== id));
    try {
      await fetch(`/api/client-portal/documents/${encodeURIComponent(target)}`, {
        method: 'DELETE',
      });
    } catch {
      // File already removed from UI; if API fails, it will be cleaned up later
    }
  };

  // Load documents on mount
  useEffect(() => {
    let active = true;

    void fetch('/api/client-portal/documents')
      .then((res) => res.json())
      .then((result: { data?: Array<{ id: string; name: string; filename: string; size: number; uploadedAt: string }> }) => {
        if (!active || !result.data) return;
        const mapped = result.data.map((f) => ({
          id: f.id,
          name: f.name,
          filename: f.filename,
          size: f.size,
          type: f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          uploadedAt: f.uploadedAt.split('T')[0],
          status: 'success' as const,
        }));
        setFiles(mapped);
      })
      .catch(() => {
        // Leave UI empty if initial load fails.
      });

    return () => {
      active = false;
    };
  }, []);


  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="text-chimera-gold text-sm tracking-widest mb-2">CLIENT PORTAL</div>
            <h1 className="font-display text-6xl tracking-tighter">Documents</h1>
            <p className="text-chimera-text-muted mt-3 max-w-md">Share files securely with your project team. All uploads are encrypted.</p>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 bg-chimera-gold hover:bg-white text-black px-8 py-4 rounded-2xl font-semibold transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            UPLOAD FILES
          </button>
        </div>

        {/* Upload Zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`glass-elevated border-2 border-dashed rounded-3xl p-16 mb-12 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-chimera-gold bg-chimera-gold/5 scale-[1.01]' 
              : 'border-chimera-border hover:border-chimera-gold/60'
          }`}
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-chimera-gold/10 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-chimera-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903 5 5 0 0110.025 1.38L20 14.5a4 4 0 01-8 8V17" />
            </svg>
          </div>
          
          <div className="text-xl font-medium mb-2">Drop files here or click to upload</div>
          <div className="text-chimera-text-muted">PDF, JPG, PNG, DOCX • Max 25MB per file</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Files List */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-chimera-text-muted font-medium">YOUR DOCUMENTS ({files.length})</div>
          <div className="text-xs text-chimera-text-muted">LAST UPDATED JUST NOW</div>
        </div>

        <div className="space-y-3">
          {files.map(file => (
            <div key={file.id} className="glass rounded-2xl p-6 flex items-center justify-between group">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 rounded-xl bg-chimera-surface flex items-center justify-center text-chimera-gold">
                  {file.type.includes('pdf') ? '📕' : file.type.includes('image') ? '🖼️' : '📄'}
                </div>
                
                <div>
                  <div className="font-medium text-white">{file.name}</div>
                  <div className="text-xs text-chimera-text-muted flex items-center gap-3">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>Uploaded {file.uploadedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {file.status === 'uploading' && (
                  <div className="text-chimera-gold text-sm flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-chimera-gold border-t-transparent animate-spin rounded-full"></div>
                    UPLOADING...
                  </div>
                )}
                
                {file.status === 'success' && (
                  <a
                    href={`/api/client-portal/documents/download/${file.filename || file.id}`}
                    download
                    className="text-xs px-5 py-2 border border-chimera-border rounded-full hover:bg-white/5 transition inline-block"
                  >
                    DOWNLOAD
                  </a>
                )}

                <button 
                  onClick={() => void deleteFile(file.id, file.filename)}
                  className="opacity-40 hover:opacity-100 text-red-400 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6h12v12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center py-20 text-chimera-text-muted">
            No documents yet. Upload your first file above.
          </div>
        )}

        <div className="mt-16 text-xs text-center text-chimera-text-muted">
          All files are encrypted in transit and at rest • Visible only to you and your project manager
        </div>
      </div>
    </div>
  );
}
