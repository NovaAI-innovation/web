import { getDashboardData } from '@/lib/project-store';

export default async function DashboardPage() {
  const data = await getDashboardData();
  const current = data.currentProject;

  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <div className="text-chimera-gold text-sm tracking-widest">WELCOME BACK</div>
            <h1 className="font-display text-6xl tracking-tighter">Project Dashboard</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-chimera-text-muted">CURRENT PROJECT</div>
            <div className="font-medium text-xl">{current?.name || 'No Active Projects'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass rounded-3xl p-8">
            <div className="text-sm text-chimera-text-muted mb-2">PROJECT STATUS</div>
            <div className="text-5xl font-display text-chimera-gold tabular-nums">{current?.progress || 0}<span className="text-4xl">%</span></div>
            <div className="h-2 bg-chimera-border rounded mt-8">
              <div 
                className="h-2 bg-chimera-gold rounded transition-all" 
                style={{ width: `${current?.progress || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="glass rounded-3xl p-8">
            <div className="text-sm text-chimera-text-muted mb-4">NEXT MILESTONE</div>
            <div className="font-medium text-lg">
              {current?.milestones.find(m => !m.completed)?.title || 'All milestones complete'}
            </div>
            <div className="text-xs text-chimera-text-muted mt-8">
              Due {current?.milestones.find(m => !m.completed)?.dueDate || 'N/A'}
            </div>
          </div>

          <div className="glass rounded-3xl p-8 flex flex-col justify-center">
            <div className="text-sm text-chimera-text-muted">PROJECT MANAGER</div>
            <div className="text-xl font-medium mt-2">Casey Thompson</div>
            <a href="tel:+17809348696" className="text-chimera-gold text-sm mt-6 inline-block hover:underline">
              Contact PM →
            </a>
          </div>
        </div>

        <div className="mt-16 pt-12 border-t border-chimera-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-3xl p-8">
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

            <div className="glass rounded-3xl p-8">
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

        <div className="mt-16 pt-12 border-t border-chimera-border text-center">
          <div className="inline-flex items-center gap-2 text-xs px-6 py-2.5 bg-chimera-surface rounded-3xl text-chimera-text-muted">
            Sprint 5 • Real data from project-store
          </div>
        </div>
      </div>
    </div>
  );
}
