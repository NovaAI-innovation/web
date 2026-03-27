import { cookies } from 'next/headers';
import { parseToken, findClientById } from '@/lib/client-store';
import { getProjectsByClient } from '@/lib/project-store';
import { getInvoicesByClient } from '@/lib/invoice-store';

type ProjectCard = {
  id: string;
  title: string;
  status: string;
  progress: number;
  due: string;
  phase: string;
  milestones: Array<{ title: string; completed: boolean; dueDate: string }>;
  hasUnpaidBalance: boolean;
};

export default async function ProjectsPage() {
  let clientId = '';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('portalToken')?.value;
    if (token) {
      const parsed = parseToken(token);
      if (parsed) {
        const client = await findClientById(parsed.clientId);
        if (client) clientId = client.id;
      }
    }
  } catch { /* fallback to empty */ }

  const projects = await getProjectsByClient(clientId);
  const clientInvoices = clientId ? await getInvoicesByClient(clientId) : [];
  const unpaidProjectIds = new Set(
    clientInvoices
      .filter((invoice) => invoice.status !== 'paid')
      .map((invoice) => invoice.projectId),
  );

  const mappedProjects: ProjectCard[] = projects.map((p) => ({
    id: p.id,
    title: p.name,
    status: p.status === 'active' ? 'In Progress' : p.status === 'planning' ? 'Planning' : 'Completed',
    progress: p.progress,
    due: new Date(p.schedule.currentEnd).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    phase: p.milestones.findLast((m) => !m.completed)?.title || p.milestones[0]?.title || 'Project Complete',
    milestones: p.milestones,
    hasUnpaidBalance: unpaidProjectIds.has(p.id),
  }));

  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <div className="text-chimera-gold text-sm tracking-widest mb-2">ACTIVE PROJECTS</div>
          <h1 className="font-display text-6xl tracking-tighter">Projects</h1>
        </div>

        <div className="grid gap-6">
          {mappedProjects.map(project => (
            <a key={project.id} href={`/client-portal/projects/${project.id}`} className="glass rounded-xl p-10 block hover:border-chimera-gold/30 border border-transparent transition-all">
              <div className="flex flex-col md:flex-row gap-10 mb-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="uppercase text-xs tracking-[2px] text-chimera-gold">{project.status}</div>
                    {project.hasUnpaidBalance && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-chimera-gold/10 text-chimera-gold border border-chimera-gold/40">
                        Balance Outstanding
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-4xl mb-4">{project.title}</h3>
                  <div className="text-chimera-text-muted">Current Phase: {project.phase}</div>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <div>
                    <div className="text-right text-sm text-chimera-text-muted mb-1">PROGRESS</div>
                    <div className="text-7xl font-display text-chimera-gold tabular-nums">{project.progress}<span className="text-4xl">%</span></div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-chimera-text-muted">TARGET COMPLETION</div>
                    <div className="font-medium">{project.due}</div>
                  </div>
                </div>
              </div>

              {/* Timeline Visualization */}
              <div className="border-t border-chimera-border pt-8">
                <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-6">PROJECT TIMELINE</div>
                <div className="space-y-6">
                  {project.milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-6">
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${milestone.completed ? 'bg-chimera-gold border-chimera-gold' : 'border-chimera-border'}`}>
                        {milestone.completed && <div className="w-2 h-2 bg-chimera-black rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${milestone.completed ? 'line-through text-chimera-text-muted' : ''}`}>
                          {milestone.title}
                        </div>
                        <div className="text-xs text-chimera-text-muted">{milestone.dueDate}</div>
                      </div>
                      <div className="text-right text-xs text-chimera-text-muted whitespace-nowrap">
                        {milestone.completed ? 'COMPLETE' : 'PENDING'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>

        {mappedProjects.length === 0 && (
          <div className="text-center py-20 text-chimera-text-muted">
            No projects have been assigned to your account yet.
          </div>
        )}
      </div>
    </div>
  );
}
