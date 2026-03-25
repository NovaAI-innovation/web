import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const heroPhoto =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?fit=crop&w=2200&q=80';

const projects = [
  {
    id: 'proj-kitchen',
    image:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?fit=crop&w=1600&q=80',
    title: 'Modern Kitchen Renovation - Edmonton',
    summary: 'Complete layout rework, custom millwork, stone tops, and upgraded lighting plan.',
  },
  {
    id: 'proj-bath',
    image:
      'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?fit=crop&w=1600&q=80',
    title: 'Luxury Bathroom Upgrade - St. Albert',
    summary: 'Walk-in shower conversion, slab tile package, and custom vanity installation.',
  },
  {
    id: 'proj-full-home',
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?fit=crop&w=1600&q=80',
    title: 'Whole Home Transformation - Glenora',
    summary: 'Full main-floor modernization, structural reconfiguration, and premium finishing.',
  },
];

export default function ProjectsPage() {
  return (
    <main className="bg-chimera-black min-h-screen">
      <section className="min-h-[60vh] flex items-center relative overflow-hidden">
        <Image
          src={heroPhoto}
          alt="Beautifully renovated modern home interior by Chimera Enterprise"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="max-w-6xl mx-auto px-6 pt-20 relative z-10">
          <div className="text-chimera-gold text-sm tracking-[3px] uppercase mb-3">Portfolio</div>
          <h1 className="font-display text-7xl mb-4">Featured Projects</h1>
          <p className="text-chimera-text-secondary text-xl max-w-xl">
            Recent renovation work across Edmonton and surrounding communities.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
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

      <section className="border-t border-chimera-border py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-5xl mb-6">Your project could be next</h2>
          <p className="text-xl text-chimera-text-muted mb-12">
            Every project starts with a conversation. Tell us what you have in mind.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/project-planning"
              className="inline-flex items-center justify-center gap-2 px-12 py-4 bg-chimera-gold text-black font-semibold rounded-md hover:bg-white transition-colors"
            >
              Start Your Project
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 border border-white/40 text-white font-medium rounded-md hover:bg-white/10 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
