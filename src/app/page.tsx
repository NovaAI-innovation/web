import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ClipboardList, Home, MoveRight, ShieldCheck, Star } from 'lucide-react';
import HeroFlourish from '@/components/HeroFlourish';
import AnimatedStat from '@/components/AnimatedStat';

const heroPhoto =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=2200&q=80';

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  name: 'Chimera Enterprise',
  image: '/favicon.ico',
  url: 'https://chimeraenterprise.ca',
  telephone: '+1-780-934-8696',
  email: 'info@chimeraenterprise.ca',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Edmonton',
    addressRegion: 'AB',
    addressCountry: 'CA',
  },
  areaServed: ['Edmonton', 'Sherwood Park', 'St. Albert', 'Spruce Grove'],
  serviceType: ['Home renovation', 'Kitchen and bath renovation', 'Project planning'],
};

const featuredProjects = [
  {
    id: 'proj-kitchen',
    image:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=80',
    alt: 'Modern kitchen renovation with wood cabinetry and stone countertops',
    title: 'Modern Kitchen Renovation - Edmonton',
    meta: '2025 - Full Gut Reno',
  },
  {
    id: 'proj-bath',
    image:
      'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=1400&q=80',
    alt: 'Luxury bathroom renovation with glass shower and tile walls',
    title: 'Luxury Bathroom Upgrade - St. Albert',
    meta: '2025 - Ensuite Remodel',
  },
  {
    id: 'proj-full-home',
    image:
      'https://images.unsplash.com/photo-1616594039964-3f8f4b5b2f5c?auto=format&fit=crop&w=1400&q=80',
    alt: 'Open concept living room renovation with modern finishes',
    title: 'Whole Home Transformation - Glenora',
    meta: '2025 - Full Home Modernization',
  },
];

const testimonials = [
  {
    quote:
      'Chimera transformed our outdated 1970s home into a modern sanctuary. Their planning and execution were first class.',
    name: 'Sarah & Michael Thompson',
    context: 'Glenora - Full Home Renovation',
  },
  {
    quote:
      'Every trade arrived on schedule and the workmanship was consistent from demolition through finishing.',
    name: 'Rebecca L.',
    context: 'Sherwood Park - Kitchen & Main Floor',
  },
  {
    quote:
      'The project plan was detailed, realistic, and transparent. No surprises and no missed milestones.',
    name: 'Daniel K.',
    context: 'St. Albert - Project Planning + Build',
  },
];

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      <section className="min-h-screen flex items-center relative overflow-hidden">
        <Image
          src={heroPhoto}
          alt="High-end home renovation interior showcase"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60" />
        <HeroFlourish />

        <div className="max-w-6xl mx-auto px-6 pt-24 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-black/50 border border-chimera-gold/40 text-chimera-gold px-4 py-1.5 rounded-sm text-sm mb-6 hero-badge-in">
              EST. 2018 - EDMONTON
            </div>

            <h1 className="font-display text-5xl md:text-7xl xl:text-[92px] leading-[0.92] tracking-tight text-white mb-8">
              CRAFT THAT
              <br />
              LASTS
            </h1>

            <p className="text-lg md:text-xl text-chimera-text-secondary max-w-lg">
              Premium renovation and project planning. We turn houses into homes built to endure.
            </p>

            <div className="flex flex-wrap gap-4 mt-12">
              <Link
                href="/project-planning"
                className="inline-flex items-center gap-2 px-12 py-4 bg-chimera-gold text-black font-semibold rounded-md shadow-[0_10px_26px_-12px_rgba(199,154,44,0.85)] hover:bg-white transition-colors"
              >
                Start Your Project
                <MoveRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center px-8 py-4 border border-white/40 text-white font-medium rounded-md hover:bg-white/10 transition-colors"
              >
                Speak With Us
              </Link>
            </div>
          </div>
        </div>

        <a
          href="#where-to-begin"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 inline-flex flex-col items-center text-xs tracking-wider text-white/80 hover:text-white transition-colors"
          aria-label="Scroll to where to begin section"
        >
          Scroll
          <ArrowDown className="w-4 h-4 mt-1" />
        </a>
      </section>

      <section id="where-to-begin" className="py-24 border-b border-chimera-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-chimera-gold text-sm tracking-[3px] uppercase mb-3">WHERE TO BEGIN</div>
            <h2 className="font-display text-5xl">Choose your path</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/services"
              className="group bg-chimera-surface border border-chimera-border p-10 rounded-xl hover:border-chimera-gold transition-colors card-hover"
            >
              <Home className="w-12 h-12 text-chimera-gold mb-8" aria-hidden="true" />
              <h3 className="font-display text-4xl mb-4">Home Renovation</h3>
              <p className="text-chimera-text-muted text-lg">
                Full home transformations, kitchens, bathrooms, and custom builds.
              </p>
              <div className="mt-8 text-chimera-gold text-sm font-medium inline-flex items-center gap-2">
                Learn more
                <MoveRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="/project-planning"
              className="group bg-chimera-surface border border-chimera-border p-10 rounded-xl hover:border-chimera-gold transition-colors card-hover"
            >
              <ClipboardList className="w-12 h-12 text-chimera-gold mb-8" aria-hidden="true" />
              <h3 className="font-display text-4xl mb-4">Project Planning</h3>
              <p className="text-chimera-text-muted text-lg">
                Detailed planning, budgeting, and sequencing before you build.
              </p>
              <div className="mt-8 text-chimera-gold text-sm font-medium inline-flex items-center gap-2">
                Start planning
                <MoveRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-chimera-surface border-y border-chimera-border" aria-label="Company performance metrics">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <div className="font-display text-7xl text-chimera-gold mb-2">
                <AnimatedStat value={250} suffix="+" />
              </div>
              <div className="text-sm tracking-widest text-chimera-text-muted">PROJECTS COMPLETED</div>
            </div>
            <div>
              <div className="font-display text-7xl text-chimera-gold mb-2">
                <AnimatedStat value={18} />
              </div>
              <div className="text-sm tracking-widest text-chimera-text-muted">YEARS EXPERIENCE</div>
            </div>
            <div>
              <div className="font-display text-7xl text-chimera-gold mb-2">
                <AnimatedStat value={98} suffix="%" />
              </div>
              <div className="text-sm tracking-widest text-chimera-text-muted">CLIENT RETENTION</div>
            </div>
            <div>
              <div className="font-display text-7xl text-chimera-gold mb-2">
                <AnimatedStat value={5} />
                <span className="text-4xl">.0</span>
              </div>
              <div className="text-sm tracking-widest text-chimera-text-muted">AVERAGE GOOGLE RATING</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-chimera-gold text-sm tracking-[3px] uppercase">WHAT WE DO BEST</div>
            <h2 className="font-display text-5xl mt-3">Signature Services</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Full Home Renovations', desc: 'End-to-end transformations with meticulous attention to detail.' },
              { title: 'Kitchen & Bath', desc: 'Functional luxury spaces that improve daily living.' },
              { title: 'Project Planning', desc: 'Comprehensive scoping, budgeting, and sequencing.' },
            ].map((service) => (
              <Link
                key={service.title}
                href="/services"
                className="group bg-chimera-surface border border-chimera-border p-10 rounded-xl hover:border-chimera-gold transition-colors card-hover"
              >
                <div className="h-1.5 w-14 bg-chimera-gold mb-8 group-hover:w-28 group-hover:bg-chimera-gold-light transition-all" />
                <h3 className="font-display text-3xl mb-4">{service.title}</h3>
                <p className="text-chimera-text-muted">{service.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-chimera-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="text-chimera-gold text-sm tracking-widest">RECENT WORK</div>
              <h2 className="font-display text-5xl">Featured Projects</h2>
            </div>
            <Link href="/projects" className="text-chimera-gold hover:underline text-sm">
              View all projects -&gt;
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredProjects.map((project) => (
              <Link key={project.id} href={`/projects#${project.id}`} className="group card-hover">
                <div className="aspect-[4/3] bg-chimera-dark rounded-xl mb-6 overflow-hidden border border-chimera-border">
                  <Image
                    src={project.image}
                    alt={project.alt}
                    width={960}
                    height={720}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="font-medium">{project.title}</div>
                <div className="text-sm text-chimera-text-muted">{project.meta}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-chimera-gold text-sm tracking-widest mb-3">TRUSTED BY HOMEOWNERS</div>
            <h2 className="font-display text-5xl">Verified Client Feedback</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="bg-chimera-surface border border-chimera-border rounded-xl p-8">
                <div className="flex items-center gap-1 text-chimera-gold mb-5" aria-label="5 out of 5 stars">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>

                <p className="text-chimera-text-secondary mb-7">&quot;{testimonial.quote}&quot;</p>

                <div className="pt-5 border-t border-chimera-border">
                  <div className="font-medium mb-1">{testimonial.name}</div>
                  <div className="text-sm text-chimera-text-muted mb-3">{testimonial.context}</div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-chimera-gold">
                    <ShieldCheck className="w-4 h-4" />
                    Verified Client
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="h-24 bg-gradient-to-b from-transparent to-chimera-black" />
    </main>
  );
}
