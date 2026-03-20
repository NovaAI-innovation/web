import Image from 'next/image';

const projects = [
  {
    id: 'proj-kitchen',
    image:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1600&q=80',
    title: 'Modern Kitchen Renovation - Edmonton',
    summary: 'Complete layout rework, custom millwork, stone tops, and upgraded lighting plan.',
  },
  {
    id: 'proj-bath',
    image:
      'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=1600&q=80',
    title: 'Luxury Bathroom Upgrade - St. Albert',
    summary: 'Walk-in shower conversion, slab tile package, and custom vanity installation.',
  },
  {
    id: 'proj-full-home',
    image:
      'https://images.unsplash.com/photo-1616594039964-3f8f4b5b2f5c?auto=format&fit=crop&w=1600&q=80',
    title: 'Whole Home Transformation - Glenora',
    summary: 'Full main-floor modernization, structural reconfiguration, and premium finishing.',
  },
];

export default function ProjectsPage() {
  return (
    <main className="bg-chimera-black min-h-screen">
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <div className="text-chimera-gold text-sm tracking-[3px] uppercase mb-3">Portfolio</div>
          <h1 className="font-display text-6xl mb-4">Featured Projects</h1>
          <p className="text-chimera-text-muted max-w-3xl">
            Recent renovation work across Edmonton and surrounding communities.
          </p>
        </div>

        <div className="space-y-10">
          {projects.map((project) => (
            <article key={project.id} id={project.id} className="border border-chimera-border bg-chimera-surface rounded-xl overflow-hidden">
              <div className="aspect-[16/7] relative">
                <Image src={project.image} alt={project.title} fill className="object-cover" sizes="100vw" />
              </div>
              <div className="p-8">
                <h2 className="font-display text-4xl mb-3">{project.title}</h2>
                <p className="text-chimera-text-muted">{project.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
