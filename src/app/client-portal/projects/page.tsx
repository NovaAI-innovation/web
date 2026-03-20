import { getAllProjects } from '@/lib/project-store';

type ProjectCard = {
  id: string;
  title: string;
  status: string;
  progress: number;
  due: string;
  phase: string;
  milestones: Array<{ title: string; completed: boolean; dueDate: string }>;
};

export default async function ProjectsPage() {
  const projects = await getAllProjects();

  const mappedProjects: ProjectCard[] = projects.map(p => ({
    id: p.id,
    title: p.name,
    status: p.status === 'active' ? 'In Progress' : p.status === 'planning' ? 'Planning' : 'Completed',
    progress: p.progress,
    due: new Date(p.schedule.currentEnd).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    phase: p.milestones.findLast(m => !m.completed)?.title || p.milestones[0]?.title || 'Project Complete',
    milestones: p.milestones
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
            <div key={project.id} className="glass rounded-3xl p-10">
              <div className="flex flex-col md:flex-row gap-10 mb-10">
                <div className="flex-1">
                  <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-3">{project.status}</div>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
