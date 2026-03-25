'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const payload = await res.json() as {
        data: { ok: boolean } | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setError(payload.error?.message ?? 'Invalid password');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chimera-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-chimera-surface border border-chimera-border mb-6">
            <Lock className="w-6 h-6 text-chimera-gold" />
          </div>
          <h1 className="font-display text-3xl tracking-tight mb-1">
            <span className="text-chimera-gold">Chimera</span> Admin
          </h1>
          <p className="text-sm text-chimera-text-muted">Contractor portal access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoComplete="current-password"
              className="w-full bg-chimera-surface border border-chimera-border rounded-xl px-4 py-3.5 pr-11 text-sm text-white placeholder:text-chimera-text-muted focus:outline-none focus:border-chimera-gold transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-chimera-text-muted hover:text-white transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-chimera-gold text-black font-semibold py-3.5 rounded-xl hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
