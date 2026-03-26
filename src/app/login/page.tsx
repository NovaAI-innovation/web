'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const bgImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?fit=crop&w=2200&q=80';

type LoginPayload =
  | { requiresTwoFactor: true; challengeId: string; email: string }
  | { requiresTwoFactor?: false; id: string; name: string; email: string; role: string; redirectTo: string };

function getVerificationMessage(searchParams: ReturnType<typeof useSearchParams>): { info: string; error: string } {
  const verified = searchParams.get('verified');
  if (verified === 'true') return { info: 'Email verified! You can now sign in.', error: '' };
  if (verified === 'already') return { info: 'Your email is already verified. Sign in below.', error: '' };
  if (verified === 'error') {
    const reason = searchParams.get('reason');
    const msg = reason === 'expired'
      ? 'Verification link has expired. Please request a new one.'
      : 'Invalid verification link.';
    return { info: '', error: msg };
  }
  return { info: '', error: '' };
}

export default function UnifiedLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { info: initialInfo, error: initialError } = getVerificationMessage(searchParams);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [info, setInfo] = useState(initialInfo);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setUnverifiedEmail('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await res.json() as {
        data: LoginPayload | null;
        error: { code: string; message: string } | null;
      };

      if (!res.ok || payload.error) {
        const code = payload.error?.code;
        if (code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(email);
          setError('Please verify your email address before signing in.');
        } else {
          setError(payload.error?.message ?? 'Sign in failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (!payload.data) {
        setError('Unexpected response. Please try again.');
        setIsLoading(false);
        return;
      }

      const data = payload.data;

      // 2FA required — navigate to challenge page
      if (data.requiresTwoFactor) {
        router.push(`/login/verify?challengeId=${data.challengeId}`);
        return;
      }

      if (!data.requiresTwoFactor && 'redirectTo' in data) {
        // Store user info for client-side display
        localStorage.setItem('sessionUser', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }));
        window.location.href = data.redirectTo;
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail || isResending) return;
    setIsResending(true);
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unverifiedEmail }),
    }).catch(() => null);
    setIsResending(false);
    setInfo('Verification email resent. Please check your inbox.');
    setError('');
    setUnverifiedEmail('');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-chimera-black">
      <Image
        src={bgImage}
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
          <div className="text-center mb-10">
            <h1 className="font-display text-5xl tracking-tight mb-2 text-white">
              <span className="text-chimera-gold">Chimera</span>
            </h1>
            <p className="text-chimera-text-muted text-sm">Sign in to your account</p>
          </div>

          {info && (
            <div className="mb-5 p-4 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              {info}
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
              {unverifiedEmail && (
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="block mt-2 text-chimera-gold hover:text-white transition underline text-xs"
                >
                  {isResending ? 'Resending…' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm text-chimera-text-muted mb-2">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-chimera-surface border border-chimera-border rounded-md px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
                placeholder="you@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm text-chimera-text-muted mb-2">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-chimera-surface border border-chimera-border rounded-md px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-chimera-gold text-black font-semibold rounded-md hover:bg-white transition-all disabled:opacity-70"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="flex justify-between mt-6 text-sm">
            <Link href="/client-portal/forgot-password" className="text-chimera-text-muted hover:text-chimera-gold transition">
              Forgot password?
            </Link>
            <Link href="/client-portal/register" className="text-chimera-gold hover:text-white transition">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
