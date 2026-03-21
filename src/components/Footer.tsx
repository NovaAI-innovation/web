'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';

const phone = process.env.NEXT_PUBLIC_PHONE || '+1 (780) 934-8696';
const email = process.env.NEXT_PUBLIC_EMAIL || 'info@chimeraenterprise.ca';

export default function Footer() {
  return (
    <footer className="bg-chimera-dark border-t border-chimera-border pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <div className="mb-4">
            <Image
              src="/brand/final/chimera-horizontal-on-dark.svg"
              alt="Chimera Enterprise"
              width={300}
              height={60}
              className="h-10 w-auto"
            />
          </div>
          <p className="text-chimera-text-muted max-w-xs mb-6">
            Premium renovation and project planning.
            Disciplined execution. Real results.
          </p>
          <div className="flex items-start gap-2 text-sm text-chimera-text-muted max-w-xs">
            <MapPin className="w-4 h-4 mt-0.5 text-chimera-gold" />
            <span>Serving Edmonton, Sherwood Park, St. Albert, and Spruce Grove</span>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="uppercase text-xs tracking-widest text-chimera-text-muted mb-4">Company</div>
          <div className="space-y-3 text-sm">
            <Link href="/" className="block hover:text-white transition">Home</Link>
            <Link href="/projects" className="block hover:text-white transition">Projects</Link>
            <Link href="/contact" className="block hover:text-white transition">Contact</Link>
            <Link href="/client-portal" className="block hover:text-white transition">Client Portal</Link>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="uppercase text-xs tracking-widest text-chimera-text-muted mb-4">Services</div>
          <div className="space-y-3 text-sm">
            <Link href="/services" className="block hover:text-white transition">Full Renovations</Link>
            <Link href="/services" className="block hover:text-white transition">Kitchen & Bath</Link>
            <Link href="/project-planning" className="block hover:text-white transition">Project Planning</Link>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="uppercase text-xs tracking-widest text-chimera-text-muted mb-4">Get In Touch</div>

          <div className="space-y-6">
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-chimera-gold/10 flex items-center justify-center text-chimera-gold group-hover:bg-chimera-gold group-hover:text-black transition">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm text-chimera-text-muted">Call us</div>
                <div className="font-medium">{phone}</div>
              </div>
            </a>

            <a href={`mailto:${email}`} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-chimera-gold/10 flex items-center justify-center text-chimera-gold group-hover:bg-chimera-gold group-hover:text-black transition">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm text-chimera-text-muted">Email us</div>
                <div className="font-medium">{email}</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="mt-20 border-t border-chimera-border pt-8 text-center text-xs text-chimera-text-muted">
        © {new Date().getFullYear()} Chimera Enterprise. All rights reserved.
      </div>
    </footer>
  );
}
