'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    setIsResending(true);
    setMessage('');

    try {
      const user = localStorage.getItem('pendingVerificationEmail') ?? '';
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user }),
      });
      setMessage('Verification email resent. Please check your inbox (and spam folder).');
    } catch {
      setMessage('Could not resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-chimera-black flex items-center justify-center px-6">
      <div className="max-w-md w-full px-8 py-10 rounded-2xl glass-elevated border border-chimera-gold/20 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-chimera-surface border border-chimera-gold/30 flex items-center justify-center">
            <Mail className="w-8 h-8 text-chimera-gold" />
          </div>
        </div>

        <h1 className="font-display text-4xl tracking-tight mb-3 text-white">Check your inbox</h1>
        <p className="text-chimera-text-muted mb-8 leading-relaxed">
          We sent a confirmation link to your email address. Click the link to activate your
          account. The link expires in 24 hours.
        </p>

        {message && (
          <div className="mb-6 p-4 rounded-md bg-chimera-surface border border-chimera-gold/20 text-chimera-text-secondary text-sm">
            {message}
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={isResending}
          className="w-full py-4 bg-chimera-surface border border-chimera-border rounded-md text-chimera-text-secondary hover:text-white hover:border-chimera-gold transition disabled:opacity-60 mb-4"
        >
          {isResending ? 'Sending…' : 'Resend verification email'}
        </button>

        <Link
          href="/login"
          className="text-chimera-text-muted hover:text-chimera-gold text-sm transition"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
