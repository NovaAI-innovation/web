'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <main className="min-h-screen bg-chimera-black flex items-center justify-center">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl tracking-tight mb-3 text-white">Client Portal</h1>
          <p className="text-chimera-text-muted">Sign in to access your project</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
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
              className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
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
              className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-chimera-gold text-black font-semibold rounded-2xl hover:bg-white transition-all disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Sign In"}
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
    </main>
  );
}
