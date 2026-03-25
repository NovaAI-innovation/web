'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Clock, Menu, ShieldCheck, Phone, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/project-planning', label: 'Project Planning' },
  { href: '/contact', label: 'Contact' },
  { href: '/client-portal', label: 'Client Portal' },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const phone = process.env.NEXT_PUBLIC_PHONE || '+1 (780) 934-8696';
  const isPortalRoute = pathname.startsWith('/client-portal') || pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-chimera-border">
      <div className={`bg-chimera-surface border-b border-chimera-border/60 ${isPortalRoute ? 'py-2 text-sm' : 'py-1.5 text-xs'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-6 md:gap-8 text-chimera-text-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className={`${isPortalRoute ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-chimera-gold`} />
            <span>Licensed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BadgeCheck className={`${isPortalRoute ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-chimera-gold`} />
            <span>Insured</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className={`${isPortalRoute ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-chimera-gold`} />
            <span>BBB A+</span>
          </div>
        </div>
      </div>

      <nav className="max-w-7xl mx-auto px-6">
        <div className={`flex items-center justify-between ${isPortalRoute ? 'h-24' : 'h-20'}`}>
          <Link href="/" className="flex items-center" aria-label="Chimera Enterprise Home">
            <Image
              src="/brand/final/chimera-horizontal-on-dark.svg"
              alt="Chimera Enterprise"
              width={280}
              height={56}
              className={`${isPortalRoute ? 'h-12' : 'h-10'} w-auto`}
              priority
              unoptimized
            />
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {navLinks.filter(l => l.href !== '/client-portal').map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${isPortalRoute ? 'text-base' : 'text-sm'} font-medium text-chimera-text-secondary hover:text-white card-hover`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/client-portal"
              className={`${isPortalRoute ? 'text-base px-4 py-2' : 'text-sm px-3 py-1.5'} font-medium text-chimera-text-muted border border-chimera-border rounded-md hover:text-chimera-gold hover:border-chimera-gold/40 transition-colors`}
            >
              Client Portal
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/project-planning"
              className={`flex items-center gap-2 ${isPortalRoute ? 'px-6 py-3 text-base' : 'px-5 py-2.5 text-sm'} font-semibold bg-chimera-gold text-black rounded-md hover:bg-chimera-gold-light transition-colors`}
            >
              <Phone className={`${isPortalRoute ? 'w-5 h-5' : 'w-4 h-4'}`} />
              Get Estimate
            </Link>

            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className={`flex items-center gap-2 ${isPortalRoute ? 'px-6 py-3 text-base' : 'px-5 py-2.5 text-sm'} font-semibold bg-chimera-red-urgent text-white rounded-md hover:brightness-110 transition-colors`}
            >
              <Clock className={`${isPortalRoute ? 'w-5 h-5' : 'w-4 h-4'}`} />
              Emergency
            </a>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-white"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black md:hidden"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="ml-auto isolate h-full w-[86%] max-w-sm border-l border-chimera-border bg-chimera-dark p-6 shadow-[-24px_0_52px_rgba(0,0,0,0.72)]"
            >
              <div className="flex justify-between items-center mb-8">
                <Image
                  src="/brand/final/chimera-horizontal-on-dark.svg"
                  alt="Chimera Enterprise"
                  width={220}
                  height={44}
                  className="h-8 w-auto"
                  priority
                  unoptimized
                />
                <button onClick={() => setIsOpen(false)} className="text-white" aria-label="Close menu">
                  <X size={30} />
                </button>
              </div>

              <div className="bg-chimera-surface border border-chimera-border rounded-md p-3 text-xs text-chimera-text-muted mb-8">
                Licensed • Insured • BBB A+
              </div>

              <div className="flex flex-col gap-5 text-lg">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="py-2 text-white border-b border-chimera-border"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="mt-12 space-y-4">
                <Link
                  href="/project-planning"
                  onClick={() => setIsOpen(false)}
                  className="block w-full py-4 text-center font-semibold bg-chimera-gold text-black rounded-md"
                >
                  Get Estimate
                </Link>
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="block w-full py-4 text-center font-semibold bg-chimera-red-urgent text-white rounded-md"
                >
                  Emergency Call
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
