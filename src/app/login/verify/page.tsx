'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  const challengeId = searchParams.get('challengeId') ?? '';

  // Redirect if no challengeId
  useEffect(() => {
    if (!challengeId) router.replace('/login');
  }, [challengeId, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp }),
      });

      const payload = await res.json() as {
        data: { id: string; name: string; email: string; role: string; redirectTo: string } | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setError(payload.error?.message ?? 'Invalid code. Please try again.');
        setIsLoading(false);
        return;
      }

      if (payload.data) {
        localStorage.setItem('sessionUser', JSON.stringify({ id: payload.data.id, name: payload.data.name, email: payload.data.email, role: payload.data.role }));
        window.location.href = payload.data.redirectTo;
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    // Redirect back to login to start a new login flow (which will re-issue the OTP)
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-chimera-black flex items-center justify-center px-6">
      <div className="max-w-sm w-full px-8 py-10 rounded-2xl glass-elevated border border-chimera-gold/20">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl tracking-tight mb-2 text-white">Verify your identity</h1>
          <p className="text-chimera-text-muted text-sm">
            We sent a 6-digit code to your email address. Enter it below.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label htmlFor="otp-input" className="block text-sm text-chimera-text-muted mb-2">
              Verification code
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full bg-chimera-surface border border-chimera-border rounded-md px-5 py-4 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-chimera-gold"
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full py-4 bg-chimera-gold text-black font-semibold rounded-md hover:bg-white transition-all disabled:opacity-70"
          >
            {isLoading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-chimera-text-muted text-sm">
            Code expires in 10 minutes.{' '}
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-chimera-gold hover:text-white transition"
            >
              Sign in again to resend.
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
