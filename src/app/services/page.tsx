'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const heroPhoto =
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2200&q=80';

const tiers = [
  {
    name: 'Luxury',
    price: 'Premium',
    features: ['Full custom design', 'High-end materials', 'Project management', 'Extended warranty'],
    color: 'gold',
    href: '/project-planning',
  },
  {
    name: 'Quality',
    price: 'Standard',
    features: ['Detailed planning', 'Quality materials', 'On-time delivery', 'Standard warranty'],
    color: 'white',
    href: '/project-planning',
  },
  {
    name: 'Smart',
    price: 'Value',
    features: ['Budget optimization', 'Essential upgrades', 'Efficient timeline', 'Basic warranty'],
    color: 'muted',
    href: '/project-planning',
  },
];

const processSteps = [
  {
    step: 1,
    title: 'Discovery & Consultation',
    description: 'We meet at your home to understand your vision, assess the space, and discuss your goals, lifestyle needs, and budget expectations.',
  },
  {
    step: 2,
    title: 'Design & Planning',
    description: 'Our team produces detailed plans, material selections, and a transparent line-item budget. You approve every decision before we break ground.',
  },
  {
    step: 3,
    title: 'Permits & Preparation',
    description: 'We handle all municipal permits, utility coordination, and scheduling. Your project manager builds the full timeline and confirms trade availability.',
  },
  {
    step: 4,
    title: 'Demolition & Rough-In',
    description: 'Controlled demolition, structural work, electrical, plumbing, and HVAC rough-ins. Weekly photo updates keep you informed at every stage.',
  },
  {
    step: 5,
    title: 'Build & Finishing',
    description: 'Cabinetry, flooring, tile, paint, fixtures, and trim. Our quality control checkpoints ensure every detail meets specification before moving forward.',
  },
  {
    step: 6,
    title: 'Final Walkthrough & Handover',
    description: 'A comprehensive walkthrough with your project manager. We address any punch-list items and hand over your completed space with full warranty documentation.',
  },
];

export default function ServicesPage() {
  return (
    <main className="bg-chimera-black text-white">
      <section className="min-h-[70vh] flex items-center relative overflow-hidden">
        <Image
          src={heroPhoto}
          alt="Expert renovation craftsmen delivering premium quality workmanship"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="max-w-6xl mx-auto px-6 pt-20 relative z-10">
          <div className="max-w-2xl">
            <div className="uppercase tracking-[4px] text-chimera-gold text-sm mb-6">OUR CRAFT</div>
            <h1 className="font-display text-8xl leading-none tracking-[-3px] mb-8">
              SERVICES THAT
              <br />
              DEFINE HOMES
            </h1>
            <p className="text-2xl text-chimera-text-secondary">Three tiers. One standard: excellence.</p>
          </div>
        </div>
      </section>

      <section className="py-20 border-b border-chimera-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-5xl mb-4">Not sure where to start?</h2>
            <p className="text-chimera-text-muted max-w-lg mx-auto">
              Tell us about your project and we&apos;ll help you find the right approach. No commitment required.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/project-planning"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-chimera-gold text-black font-semibold text-lg rounded-md hover:bg-white transition-colors"
            >
              Start Project Planning
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 border border-white/40 text-white font-medium text-lg rounded-md hover:bg-white/10 transition-colors"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-chimera-gold text-sm tracking-[3px] uppercase mb-3">SERVICE TIERS</div>
            <h2 className="font-display text-5xl">Choose Your Level</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="border border-chimera-border rounded-xl p-10 hover:border-chimera-gold transition-colors group flex flex-col"
              >
                <div
                  className={`inline-block px-5 py-1 text-xs font-medium rounded-sm mb-6 w-fit ${
                    tier.color === 'gold' ? 'bg-chimera-gold text-black' : 'bg-white/10 border border-chimera-border'
                  }`}
                >
                  {tier.name}
                </div>

                <div className="text-5xl font-display mb-8">{tier.price}</div>

                <ul className="space-y-4 mb-12 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-chimera-text-secondary">
                      <span className="text-chimera-gold mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className="block w-full py-4 text-center border border-chimera-gold text-chimera-gold rounded-md group-hover:bg-chimera-gold group-hover:text-black transition-colors"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-chimera-surface">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-chimera-gold text-sm tracking-[3px] uppercase mb-3">HOW IT WORKS</div>
            <h2 className="font-display text-5xl">Our Process</h2>
          </div>

          <div className="space-y-12">
            {processSteps.map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex gap-8"
              >
                <div className="w-12 h-12 rounded-md bg-chimera-gold flex-shrink-0 flex items-center justify-center text-black font-mono font-bold">
                  {item.step}
                </div>
                <div>
                  <div className="font-semibold text-xl mb-2">{item.title}</div>
                  <p className="text-chimera-text-muted leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-5xl mb-6">Ready to transform your space?</h2>
          <p className="text-xl text-chimera-text-muted mb-12">
            Start with a free consultation. No pressure, no obligation — just honest advice from experienced builders.
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
