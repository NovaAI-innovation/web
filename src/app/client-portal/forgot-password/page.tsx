'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devResetLink, setDevResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/client-portal/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const payload = await res.json() as {
        data: { message: string; resetToken?: string } | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setError(payload.error?.message ?? 'Something went wrong');
        setIsLoading(false);
        return;
      }

      // In dev mode, the API returns the reset token so the flow is testable
      if (payload.data?.resetToken) {
        setDevResetLink(`/client-portal/reset-password?token=${payload.data.resetToken}`);
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-chimera-black flex items-center justify-center">
        <div className="max-w-md w-full px-8 text-center">
          <div className="mx-auto w-16 h-16 bg-chimera-gold/10 rounded-md flex items-center justify-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-chimera-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="font-display text-4xl tracking-tight mb-4 text-white">Check Your Email</h1>
          <p className="text-chimera-text-muted mb-8">
            If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent password reset instructions.
          </p>

          {devResetLink && (
            <div className="mb-8 p-4 rounded-md bg-chimera-gold/10 border border-chimera-gold/30 text-sm">
              <div className="text-chimera-gold font-medium mb-2">Development Mode</div>
              <Link href={devResetLink} className="text-chimera-gold hover:underline break-all">
                Click here to reset password
              </Link>
            </div>
          )}

          <Link
            href="/client-portal"
            className="text-chimera-gold hover:text-white text-sm transition"
          >
            Back to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-chimera-black flex items-center justify-center">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl tracking-tight mb-3 text-white">Reset Password</h1>
          <p className="text-chimera-text-muted">Enter your email and we&apos;ll send reset instructions.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="reset-email" className="block text-sm text-chimera-text-muted mb-2">Email Address</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-chimera-surface border border-chimera-border rounded-md px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
              placeholder="you@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-chimera-gold text-black font-semibold rounded-md hover:bg-white transition-all disabled:opacity-70"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center mt-8">
          <Link href="/client-portal" className="text-chimera-gold hover:text-white text-sm transition">
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
