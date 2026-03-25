'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const portalLoginBackground =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?fit=crop&w=2200&q=80';

export default function ClientPortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/client-portal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await res.json() as {
        data: { id: string; name: string; email: string } | null;
        error: { code: string; message: string } | null;
      };

      if (!res.ok || payload.error) {
        setError(payload.error?.message ?? 'Login failed');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('portalToken', 'authenticated');
      localStorage.setItem('portalUser', JSON.stringify(payload.data));
      window.location.href = '/client-portal/dashboard';
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-chimera-black">
      <Image
        src={portalLoginBackground}
        alt="Modern renovated home interior"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(199,154,44,0.25),transparent_45%)]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full px-8 py-10 rounded-2xl glass-elevated border border-chimera-gold/20">
          <div className="text-center mb-12">
            <h1 className="font-display text-5xl tracking-tight mb-3 text-white">Client Portal</h1>
            <p className="text-chimera-text-muted">Sign in to access your project</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="portal-email" className="block text-sm text-chimera-text-muted mb-2">Email</label>
              <input
                id="portal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-chimera-surface border border-chimera-border rounded-md px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
                placeholder="you@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="portal-password" className="block text-sm text-chimera-text-muted mb-2">Password</label>
              <input
                id="portal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-chimera-surface border border-chimera-border rounded-md px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
                placeholder="********"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-chimera-gold text-black font-semibold rounded-md hover:bg-white transition-all disabled:opacity-70"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/client-portal/forgot-password" className="text-chimera-text-muted hover:text-chimera-gold text-sm transition">
              Forgot your password?
            </Link>
          </div>

          <div className="text-center mt-4">
            <span className="text-chimera-text-muted text-sm">Don&apos;t have an account? </span>
            <Link href="/client-portal/register" className="text-chimera-gold hover:text-white text-sm transition">
              Register
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
