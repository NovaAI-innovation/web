'use client';

import { useState } from 'react';

export default function ClientPortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login with demo token
    setTimeout(() => {
      const token = 'demo-token-' + Date.now();
      localStorage.setItem('portalToken', token);
      document.cookie = `portalToken=${token}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`;
      window.location.href = '/client-portal/dashboard';
    }, 800);
  };

  return (
    <main className="min-h-screen bg-chimera-black flex items-center justify-center">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl tracking-tight mb-3 text-white">Client Portal</h1>
          <p className="text-chimera-text-muted">Sign in to access your project</p>
        </div>

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

        <div className="text-center mt-8 text-xs text-chimera-text-muted">
          Demo credentials: any email + any password
        </div>
      </div>
    </main>
  );
}
