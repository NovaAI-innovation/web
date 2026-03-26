'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Clock, Menu, ShieldCheck, Phone, X, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/project-planning', label: 'Planning' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const phone = process.env.NEXT_PUBLIC_PHONE || '+1 (780) 934-8696';

  return (
    <header className="sticky top-0 z-50">
      {/* === LAYER 1: Premium Top Bar with Gradient Overlay === */}
      <div className="relative overflow-hidden bg-gradient-to-r from-black via-chimera-surface to-black border-b border-chimera-border/60">
        {/* Animated shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
        
        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-chimera-gold/50 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-center gap-8 md:gap-12">
            {/* Trust badges with enhanced styling */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <ShieldCheck className="w-4 h-4 text-chimera-gold" />
              <span className="text-sm font-medium text-chimera-text-secondary">Licensed</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <BadgeCheck className="w-4 h-4 text-chimera-gold" />
              <span className="text-sm font-medium text-chimera-text-secondary">Insured</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <Sparkles className="w-4 h-4 text-chimera-gold" />
              <span className="text-sm font-medium text-chimera-text-secondary">BBB A+</span>
            </div>
          </div>
        </div>
      </div>

      {/* === LAYER 2: Main Navigation with Glassmorphism === */}
      <div className="relative bg-black/80 backdrop-blur-xl border-b border-white/[0.08]">
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {/* Left accent glow */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-chimera-gold/5 to-transparent pointer-events-none" />
        
        <nav className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-24 md:h-28">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center group"
                aria-label="Chimera Enterprise Home"
              >
                <div className="relative">
                  {/* Logo glow effect */}
                  <div className="absolute inset-0 bg-chimera-gold/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Image
                    src="/generated_image_20260325_180513_1_nobg.png"
                    alt="Chimera Enterprise"
                    width={320}
                    height={64}
                    className="relative h-16 w-auto md:h-20 transition-transform duration-300 group-hover:scale-105"
                    priority
                    unoptimized
                  />
                </div>
              </Link>

              {/* Credentials badge - desktop only */}
              <div className="hidden lg:block relative">
                <div className="absolute inset-0 bg-chimera-gold/10 blur-lg rounded-full" />
                <Image
                  src="/generated_image_20260325_185825_1_nobg.png"
                  alt="Credentials"
                  width={180}
                  height={48}
                  className="relative h-12 w-auto opacity-80"
                  priority
                  unoptimized
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-base font-medium transition-colors duration-200 ${
                    pathname === link.href 
                      ? 'text-white' 
                      : 'text-chimera-text-secondary hover:text-white'
                  }`}
                >
                  {link.label}
                  {/* Active indicator */}
                  {pathname === link.href && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-chimera-gold to-transparent"
                    />
                  )}
                  {/* Hover glow */}
                  <span className="absolute inset-0 -m-2 rounded-lg bg-white/0 hover:bg-white/[0.03] transition-colors duration-200" />
                </Link>
              ))}
              
              {/* Client Portal Link - outlined style */}
              <Link
                href="/client-portal"
                className="relative group px-4 py-2 text-sm font-semibold text-chimera-text-secondary border border-chimera-border rounded-lg overflow-hidden transition-all duration-300 hover:border-chimera-gold/50 hover:text-chimera-gold"
              >
                {/* Hover background fill */}
                <span className="absolute inset-0 bg-gradient-to-r from-chimera-gold/0 via-chimera-gold/10 to-chimera-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative">Client Portal</span>
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {/* Get Estimate Button - Premium Gold */}
              <Link
                href="/project-planning"
                className="group relative flex items-center gap-2 px-6 py-3 text-sm font-bold text-black rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                {/* Base gradient */}
                <span className="absolute inset-0 bg-gradient-to-r from-chimera-gold via-[#e8c96e] to-chimera-gold transition-all duration-300 group-hover:brightness-110" />
                {/* Shine effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {/* Glow */}
                <span className="absolute inset-0 rounded-xl shadow-[0_0_30px_rgba(212,161,54,0.4)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <span className="relative flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Get Estimate
                </span>
              </Link>

              {/* Emergency Button - Urgent Red */}
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="group relative flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
              >
                {/* Base gradient */}
                <span className="absolute inset-0 bg-gradient-to-br from-chimera-red-urgent via-[#a81c1c] to-chimera-red-urgent" />
                {/* Pulse animation */}
                <span className="absolute inset-0 rounded-xl animate-pulse-glow" />
                {/* Shine effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                <span className="relative flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-pulse" />
                  Emergency
                </span>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden relative p-3 text-white rounded-xl bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Bottom decorative line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-chimera-gold/20 to-transparent" />
      </div>

      {/* === MOBILE NAVIGATION === */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl md:hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-chimera-surface/50 to-black" />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative ml-auto h-full w-[88%] max-w-sm border-l border-chimera-border/50 bg-gradient-to-b from-chimera-dark to-black p-6"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-chimera-border/50">
                <Image
                  src="/generated_image_20260325_180513_1_nobg.png"
                  alt="Chimera Enterprise"
                  width={240}
                  height={48}
                  className="h-10 w-auto"
                  priority
                  unoptimized
                />
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-2 text-white rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 mb-8">
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <ShieldCheck className="w-5 h-5 text-chimera-gold" />
                  <span className="text-xs text-chimera-text-muted">Licensed</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <BadgeCheck className="w-5 h-5 text-chimera-gold" />
                  <span className="text-xs text-chimera-text-muted">Insured</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Sparkles className="w-5 h-5 text-chimera-gold" />
                  <span className="text-xs text-chimera-text-muted">BBB A+</span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col gap-2 mb-8">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-4 text-lg font-medium text-white rounded-xl hover:bg-white/[0.05] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Link
                    href="/client-portal"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-4 text-lg font-medium text-chimera-gold rounded-xl hover:bg-white/[0.05] transition-colors"
                  >
                    Client Portal
                  </Link>
                </motion.div>
              </div>

              {/* CTA Buttons */}
              <div className="mt-auto space-y-3">
                <Link
                  href="/project-planning"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-center gap-2 w-full py-4 text-base font-bold text-black bg-gradient-to-r from-chimera-gold to-[#e8c96e] rounded-xl hover:brightness-110 transition-all"
                >
                  <Phone className="w-5 h-5" />
                  Get Estimate
                </Link>
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-2 w-full py-4 text-base font-bold text-white bg-gradient-to-r from-chimera-red-urgent to-[#a81c1c] rounded-xl animate-pulse-glow"
                >
                  <Clock className="w-5 h-5" />
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
