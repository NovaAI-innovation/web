import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjectById, getAllProjects } from '@/lib/project-store';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((p) => ({ id: p.id }));
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const budgetPercent = Math.round((project.budget.spent / project.budget.allocated) * 100);
  const completedMilestones = project.milestones.filter((m) => m.completed).length;
  const statusLabel =
    project.status === 'active' ? 'In Progress' : project.status === 'planning' ? 'Planning' : 'Completed';

  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <Link
          href="/client-portal/projects"
          className="inline-flex items-center gap-2 text-sm text-chimera-text-muted hover:text-chimera-gold transition mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-3">{statusLabel}</div>
            <h1 className="font-display text-5xl md:text-6xl tracking-tighter">{project.name}</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-chimera-text-muted mb-1">OVERALL PROGRESS</div>
            <div className="text-7xl font-display text-chimera-gold tabular-nums">
              {project.progress}
              <span className="text-4xl">%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-chimera-border rounded-full overflow-hidden mb-16">
          <div
            className="h-2 bg-chimera-gold rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="glass rounded-3xl p-8">
            <div className="uppercase text-xs tracking-widest text-chimera-gold mb-6">BUDGET</div>
            <div className="flex justify-between items-end mb-3">
              <div className="text-3xl font-display text-chimera-gold tabular-nums">
                ${project.budget.spent.toLocaleString()}
              </div>
              <div className="text-sm text-chimera-text-muted">of ${project.budget.allocated.toLocaleString()}</div>
            </div>
            <div className="h-1.5 bg-chimera-border rounded-full overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${budgetPercent > 90 ? 'bg-red-400' : 'bg-chimera-gold'}`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-chimera-text-muted mt-3">{budgetPercent}% utilized</div>
          </div>

          <div className="glass rounded-3xl p-8">
            <div className="uppercase text-xs tracking-widest text-chimera-gold mb-6">SCHEDULE</div>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-chimera-text-muted">Baseline End</div>
                <div className="font-medium">{project.schedule.baselineEnd}</div>
              </div>
              <div>
                <div className="text-xs text-chimera-text-muted">Current End</div>
                <div className={`font-medium ${project.schedule.daysVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {project.schedule.currentEnd}
                  {project.schedule.daysVariance > 0 && ` (+${project.schedule.daysVariance} days)`}
                  {project.schedule.daysVariance === 0 && ' (on track)'}
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-8">
            <div className="uppercase text-xs tracking-widest text-chimera-gold mb-6">MILESTONES</div>
            <div className="text-5xl font-display text-chimera-gold tabular-nums">
              {completedMilestones}
              <span className="text-2xl text-chimera-text-muted">/{project.milestones.length}</span>
            </div>
            <div className="text-sm text-chimera-text-muted mt-4">milestones completed</div>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="glass rounded-3xl p-10 mb-16">
          <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-8">PROJECT TIMELINE</div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-chimera-border" />

            <div className="space-y-8">
              {project.milestones.map((milestone) => (
                <div key={milestone.id} className="flex gap-6 relative">
                  <div
                    className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 z-10 ${
                      milestone.completed
                        ? 'bg-chimera-gold border-chimera-gold'
                        : 'border-chimera-border bg-chimera-black'
                    }`}
                  >
                    {milestone.completed && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className={`font-medium text-lg ${milestone.completed ? 'text-chimera-text-muted' : 'text-white'}`}>
                      {milestone.title}
                    </div>
                    <div className="text-xs text-chimera-text-muted mt-1">
                      Due {milestone.dueDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        milestone.completed
                          ? 'bg-chimera-gold/10 text-chimera-gold'
                          : 'bg-chimera-surface text-chimera-text-muted'
                      }`}
                    >
                      {milestone.completed ? 'COMPLETE' : 'PENDING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        {project.activity.length > 0 && (
          <div className="glass rounded-3xl p-10">
            <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-8">RECENT ACTIVITY</div>
            <div className="space-y-4">
              {project.activity
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((item) => {
                  const icon =
                    item.type === 'milestone'
                      ? 'M'
                      : item.type === 'document'
                        ? 'D'
                        : item.type === 'budget'
                          ? '$'
                          : 'N';

                  const iconColor =
                    item.type === 'milestone'
                      ? 'bg-green-500/10 text-green-400'
                      : item.type === 'document'
                        ? 'bg-blue-500/10 text-blue-400'
                        : item.type === 'budget'
                          ? 'bg-chimera-gold/10 text-chimera-gold'
                          : 'bg-chimera-surface text-chimera-text-muted';

                  return (
                    <div key={item.id} className="flex items-center gap-4 py-3 border-b border-chimera-border last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${iconColor}`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white">{item.message}</div>
                      </div>
                      <div className="text-xs text-chimera-text-muted whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
