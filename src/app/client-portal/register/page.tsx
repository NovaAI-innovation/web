'use client';

import { useState } from 'react';
import Link from 'next/link';

type FieldErrors = {
  name?: string[];
  email?: string[];
  phone?: string[];
  password?: string[];
};

export default function ClientPortalRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mailingListOptIn, setMailingListOptIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, mailingListOptIn }),
      });

      const payload = await res.json() as {
        data: { id: string; name: string; email: string; emailVerificationRequired: boolean } | null;
        error: { code: string; message: string; details?: FieldErrors } | null;
      };

      if (!res.ok || payload.error) {
        if (payload.error?.details) {
          setFieldErrors(payload.error.details);
        }
        setError(payload.error?.message ?? 'Registration failed');
        setIsLoading(false);
        return;
      }

      // Store pending email so the verify page can offer to resend
      localStorage.setItem('pendingVerificationEmail', email);
      window.location.href = '/client-portal/verify-email';
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full bg-chimera-surface border border-chimera-border rounded-md px-5 py-4 text-white focus:outline-none focus:border-chimera-gold';

  return (
    <main className="min-h-screen bg-chimera-black flex items-center justify-center py-12">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl tracking-tight mb-3 text-white">Create Account</h1>
          <p className="text-chimera-text-muted">Register for the client portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label htmlFor="reg-name" className="block text-sm text-chimera-text-muted mb-2">Full Name</label>
            <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="John Smith" required />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm text-chimera-text-muted mb-2">Email</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-400">{fieldErrors.email[0]}</p>}
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-sm text-chimera-text-muted mb-2">Phone</label>
            <input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="(555) 123-4567" required />
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-400">{fieldErrors.phone[0]}</p>}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm text-chimera-text-muted mb-2">Password</label>
            <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Min. 8 characters" minLength={8} required />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-400">{fieldErrors.password[0]}</p>}
          </div>

          <div>
            <label htmlFor="reg-confirm" className="block text-sm text-chimera-text-muted mb-2">Confirm Password</label>
            <input id="reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Re-enter password" minLength={8} required />
          </div>

          {/* Mailing list opt-in */}
          <div className="flex items-start gap-3 pt-1">
            <input
              id="mailing-opt-in"
              type="checkbox"
              checked={mailingListOptIn}
              onChange={(e) => setMailingListOptIn(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-chimera-border bg-chimera-surface text-chimera-gold focus:ring-chimera-gold accent-[#c79a2c]"
            />
            <label htmlFor="mailing-opt-in" className="text-sm text-chimera-text-muted leading-relaxed cursor-pointer">
              I agree to receive project updates and news from Chimera Enterprise.
              <span className="text-xs block mt-0.5 opacity-60">Unsubscribe at any time from account settings.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-chimera-gold text-black font-semibold rounded-md hover:bg-white transition-all disabled:opacity-70"
          >
            {isLoading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-8">
          <span className="text-chimera-text-muted text-sm">Already have an account? </span>
          <Link href="/login" className="text-chimera-gold hover:text-white text-sm transition">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
