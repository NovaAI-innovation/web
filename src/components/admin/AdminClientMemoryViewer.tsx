'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentMemoryEntry } from '@/lib/portal-agent-memory';
import { Brain, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminClientMemoryViewer({
  clientId,
  initialEntries,
}: {
  clientId: string;
  initialEntries: AgentMemoryEntry[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const clearAll = async () => {
    if (!confirm(`Clear all ${entries.length} memory entries for this client? The agent will lose context of past conversations.`)) return;
    setClearing(true);
    await fetch(`/api/admin/clients/${clientId}/memory`, { method: 'DELETE' });
    setEntries([]);
    setClearing(false);
    router.refresh();
  };

  if (entries.length === 0) {
    return (
      <div className="bg-chimera-dark border border-chimera-border rounded-xl px-6 py-10 text-center">
        <Brain className="w-8 h-8 text-chimera-text-muted mx-auto mb-3" />
        <p className="text-sm text-chimera-text-muted">No agent memory entries yet for this client.</p>
      </div>
    );
  }

  return (
    <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-chimera-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">Agent Memory</h2>
          <span className="text-xs text-chimera-text-muted">({entries.length} entries)</span>
        </div>
        <button
          onClick={clearAll}
          disabled={clearing}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          {clearing ? 'Clearing…' : 'Clear All'}
        </button>
      </div>

      <div className="divide-y divide-chimera-border">
        {entries.map((entry) => (
          <div key={entry.id} className="px-6 py-4">
            <button
              className="w-full text-left flex items-start justify-between gap-3"
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{entry.query}</div>
                <div className="text-xs text-chimera-text-muted mt-0.5">
                  {new Date(entry.createdAt).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}
                  {entry.artifactRefs.length > 0 && (
                    <span className="ml-2 text-chimera-gold">
                      {entry.artifactRefs.length} ref{entry.artifactRefs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {expanded === entry.id
                ? <ChevronUp className="w-4 h-4 text-chimera-text-muted shrink-0 mt-0.5" />
                : <ChevronDown className="w-4 h-4 text-chimera-text-muted shrink-0 mt-0.5" />
              }
            </button>

            {expanded === entry.id && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-chimera-text-muted bg-chimera-surface rounded-lg px-3 py-2.5 whitespace-pre-wrap">
                  {entry.responseSummary}
                </div>
                {entry.artifactRefs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.artifactRefs.map((ref) => (
                      <span key={ref} className="text-xs px-2 py-0.5 rounded bg-chimera-surface border border-chimera-border text-chimera-text-muted">
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
