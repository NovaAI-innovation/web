import { getDashboardData } from '@/lib/project-store';
import { cookies } from 'next/headers';
import { parseToken, findClientById } from '@/lib/client-store';

export default async function DashboardPage() {
  // Resolve authenticated client from cookie
  let clientId = '';
  let userName = '';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('portalToken')?.value;
    if (token) {
      const parsed = parseToken(token);
      if (parsed) {
        const client = await findClientById(parsed.clientId);
        if (client) {
          clientId = client.id;
          userName = client.name.split(' ')[0];
        }
      }
    }
  } catch { /* fallback to empty */ }

  const data = await getDashboardData(clientId);
  const current = data.currentProject;

  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <div className="text-chimera-gold text-sm tracking-widest">
              {userName ? `WELCOME BACK, ${userName.toUpperCase()}` : 'WELCOME BACK'}
            </div>
            <h1 className="font-display text-6xl tracking-tighter">Project Dashboard</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-chimera-text-muted">CURRENT PROJECT</div>
            <div className="font-medium text-xl">{current?.name || 'No Active Projects'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass rounded-xl p-8">
            <div className="text-sm text-chimera-text-muted mb-2">PROJECT STATUS</div>
            <div className="text-5xl font-display text-chimera-gold tabular-nums">{current?.progress || 0}<span className="text-4xl">%</span></div>
            <div className="h-2 bg-chimera-border rounded mt-8">
              <div
                className="h-2 bg-chimera-gold rounded transition-all"
                style={{ width: `${current?.progress || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="glass rounded-xl p-8">
            <div className="text-sm text-chimera-text-muted mb-4">NEXT MILESTONE</div>
            <div className="font-medium text-lg">
              {current?.milestones.find(m => !m.completed)?.title || 'All milestones complete'}
            </div>
            <div className="text-xs text-chimera-text-muted mt-8">
              Due {current?.milestones.find(m => !m.completed)?.dueDate || 'N/A'}
            </div>
          </div>

          <div className="glass rounded-xl p-8 flex flex-col justify-center">
            <div className="text-sm text-chimera-text-muted">PROJECT MANAGER</div>
            <div className="text-xl font-medium mt-2">Chimera Enterprise</div>
            <a href="tel:+17809348696" className="text-chimera-gold text-sm mt-6 inline-block hover:underline">
              Contact PM →
            </a>
          </div>
        </div>

        <div className="mt-16 pt-12 border-t border-chimera-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-8">
              <div className="uppercase text-xs tracking-widest text-chimera-gold mb-6">BUDGET OVERVIEW</div>
              <div className="flex justify-between items-end mb-2">
                <div className="text-4xl font-display text-chimera-gold tabular-nums">
                  ${(current?.budget.spent || 0).toLocaleString()}
                </div>
                <div className="text-sm text-chimera-text-muted">of ${(current?.budget.allocated || 0).toLocaleString()}</div>
              </div>
              <div className="h-1.5 bg-chimera-border rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-chimera-gold rounded-full"
                  style={{ width: `${Math.round(((current?.budget.spent || 0) / (current?.budget.allocated || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="glass rounded-xl p-8">
              <div className="uppercase text-xs tracking-widest text-chimera-gold mb-6">SCHEDULE</div>
              <div className="text-sm text-chimera-text-muted">Baseline</div>
              <div className="font-medium">{current?.schedule.baselineEnd}</div>
              <div className="mt-6 text-sm text-chimera-text-muted">Current</div>
              <div className={`font-medium ${current?.schedule.daysVariance && current.schedule.daysVariance > 0 ? 'text-red-400' : ''}`}>
                {current?.schedule.currentEnd} {current?.schedule.daysVariance ? `(+${current.schedule.daysVariance} days)` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        {current && current.activity.length > 0 && (
          <div className="mt-16 pt-12 border-t border-chimera-border">
            <div className="uppercase text-xs tracking-widest text-chimera-gold mb-8">RECENT ACTIVITY</div>
            <div className="space-y-1">
              {current.activity
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((item) => {
                  const iconMap = { milestone: 'M', document: 'D', budget: '$', note: 'N' } as const;
                  const colorMap = {
                    milestone: 'bg-green-500/10 text-green-400',
                    document: 'bg-blue-500/10 text-blue-400',
                    budget: 'bg-chimera-gold/10 text-chimera-gold',
                    note: 'bg-chimera-surface text-chimera-text-muted',
                  } as const;

                  return (
                    <div key={item.id} className="flex items-center gap-4 py-4 border-b border-chimera-border last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${colorMap[item.type]}`}>
                        {iconMap[item.type]}
                      </div>
                      <div className="flex-1 text-sm">{item.message}</div>
                      <div className="text-xs text-chimera-text-muted whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {!current && (
          <div className="mt-16 text-center py-20 text-chimera-text-muted">
            No projects have been assigned to your account yet.
          </div>
        )}
      </div>
    </div>
  );
}
