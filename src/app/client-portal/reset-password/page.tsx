'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <main className="min-h-screen bg-chimera-black flex items-center justify-center">
        <div className="max-w-md w-full px-8 text-center">
          <h1 className="font-display text-4xl tracking-tight mb-4 text-white">Invalid Link</h1>
          <p className="text-chimera-text-muted mb-8">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/client-portal/forgot-password" className="text-chimera-gold hover:text-white text-sm transition">
            Request a new reset link
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/client-portal/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const payload = await res.json() as {
        data: { message: string } | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setError(payload.error?.message ?? 'Reset failed');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-chimera-black flex items-center justify-center">
        <div className="max-w-md w-full px-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-4xl tracking-tight mb-4 text-white">Password Reset</h1>
          <p className="text-chimera-text-muted mb-8">
            Your password has been successfully reset.
          </p>
          <Link
            href="/client-portal"
            className="inline-block py-4 px-10 bg-chimera-gold text-black font-semibold rounded-2xl hover:bg-white transition-all"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-chimera-black flex items-center justify-center">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl tracking-tight mb-3 text-white">New Password</h1>
          <p className="text-chimera-text-muted">Choose a new password for your account.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="new-pw" className="block text-sm text-chimera-text-muted mb-2">New Password</label>
            <input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
              placeholder="Min. 8 characters"
              minLength={8}
              required
            />
          </div>

          <div>
            <label htmlFor="confirm-pw" className="block text-sm text-chimera-text-muted mb-2">Confirm Password</label>
            <input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
              placeholder="Re-enter password"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-chimera-gold text-black font-semibold rounded-2xl hover:bg-white transition-all disabled:opacity-70"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-chimera-black flex items-center justify-center">
        <div className="text-chimera-text-muted">Loading...</div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
