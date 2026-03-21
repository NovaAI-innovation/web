'use client';

import { useEffect, useState, useCallback } from 'react';

type NotificationPreferences = {
  email: boolean;
  messages: boolean;
  milestones: boolean;
  budget: boolean;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('portalUser');
    if (stored) return JSON.parse(stored) as UserProfile;
  } catch { /* ignore */ }
  return null;
}

export default function SettingsPage() {
  const [name, setName] = useState(() => getStoredUser()?.name ?? '');
  const [email, setEmail] = useState(() => getStoredUser()?.email ?? '');
  const [phone, setPhone] = useState(() => getStoredUser()?.phone ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    email: true,
    messages: true,
    milestones: true,
    budget: false,
  });

  const updateNotifPref = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      await fetch('/api/client-portal/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // Revert on failure
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  }, []);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/client-portal/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await res.json() as {
        data: { message: string } | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setPasswordError(payload.error?.message ?? 'Failed to change password');
        setChangingPassword(false);
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setChangingPassword(false);
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch {
      setPasswordError('Something went wrong');
      setChangingPassword(false);
    }
  };

  // Fetch fresh data from API to sync with server
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/client-portal/auth/me', { signal: controller.signal })
      .then((res) => res.json())
      .then((payload: { data: UserProfile | null }) => {
        if (payload.data) {
          setName(payload.data.name);
          setEmail(payload.data.email);
          setPhone(payload.data.phone ?? '');
        }
      })
      .catch(() => { /* use localStorage values */ });

    fetch('/api/client-portal/notifications', { signal: controller.signal })
      .then((res) => res.json())
      .then((payload: { data: NotificationPreferences | null }) => {
        if (payload.data) {
          setNotifPrefs(payload.data);
        }
      })
      .catch(() => { /* use defaults */ });

    return () => controller.abort();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/client-portal/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });

      const payload = await res.json() as {
        data: UserProfile | null;
        error: { message: string } | null;
      };

      if (!res.ok || payload.error) {
        setError(payload.error?.message ?? 'Failed to save');
        setSaving(false);
        return;
      }

      // Update localStorage with fresh data
      if (payload.data) {
        localStorage.setItem('portalUser', JSON.stringify(payload.data));
      }

      setSaved(true);
      setSaving(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Something went wrong');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="text-chimera-gold text-sm tracking-widest mb-2">CLIENT PORTAL</div>
          <h1 className="font-display text-6xl tracking-tighter">Settings</h1>
          <p className="text-chimera-text-muted mt-3">Manage your profile and notification preferences.</p>
        </div>

        {/* Profile Section */}
        <div className="glass rounded-3xl p-10 mb-8">
          <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-8">PROFILE INFORMATION</div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="settings-name" className="block text-sm text-chimera-text-muted mb-2">Full Name</label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
                />
              </div>
              <div>
                <label htmlFor="settings-email" className="block text-sm text-chimera-text-muted mb-2">Email</label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold"
                />
              </div>
            </div>
            <div>
              <label htmlFor="settings-phone" className="block text-sm text-chimera-text-muted mb-2">Phone</label>
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold md:max-w-sm"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-chimera-gold hover:bg-white text-black font-semibold rounded-xl px-8 py-3 transition disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saved && (
                <span className="text-sm text-green-400">Profile updated successfully</span>
              )}
            </div>
          </form>
        </div>

        {/* Notifications Section */}
        <div className="glass rounded-3xl p-10 mb-8">
          <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-8">NOTIFICATION PREFERENCES</div>
          <div className="space-y-6">
            <ToggleRow
              label="Email notifications"
              description="Receive email updates about your projects"
              checked={notifPrefs.email}
              onChange={(v) => void updateNotifPref('email', v)}
            />
            <ToggleRow
              label="New messages"
              description="Get notified when your project manager sends a message"
              checked={notifPrefs.messages}
              onChange={(v) => void updateNotifPref('messages', v)}
            />
            <ToggleRow
              label="Milestone updates"
              description="Notifications when milestones are completed or updated"
              checked={notifPrefs.milestones}
              onChange={(v) => void updateNotifPref('milestones', v)}
            />
            <ToggleRow
              label="Budget alerts"
              description="Alert when budget utilization exceeds 80%"
              checked={notifPrefs.budget}
              onChange={(v) => void updateNotifPref('budget', v)}
            />
          </div>
        </div>

        {/* Password Section */}
        <div className="glass rounded-3xl p-10">
          <div className="uppercase text-xs tracking-[2px] text-chimera-gold mb-8">SECURITY</div>

          {!showPasswordForm ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Password</div>
                <div className="text-sm text-chimera-text-muted mt-1">Change your account password</div>
              </div>
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-xs px-6 py-3 border border-chimera-border rounded-full hover:bg-white/5 transition"
              >
                CHANGE PASSWORD
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Change Password</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordError('');
                    setPasswordSuccess(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  className="text-xs text-chimera-text-muted hover:text-white transition"
                >
                  Cancel
                </button>
              </div>

              {passwordError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                  Password changed successfully.
                </div>
              )}

              <div>
                <label htmlFor="current-password" className="block text-sm text-chimera-text-muted mb-2">Current Password</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold md:max-w-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm text-chimera-text-muted mb-2">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold md:max-w-sm"
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="block text-sm text-chimera-text-muted mb-2">Confirm New Password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-chimera-surface border border-chimera-border rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-chimera-gold md:max-w-sm"
                  minLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="bg-chimera-gold hover:bg-white text-black font-semibold rounded-xl px-8 py-3 transition disabled:opacity-70"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}

          <div className="border-t border-chimera-border mt-8 pt-8 flex items-center justify-between">
            <div>
              <div className="font-medium">Two-Factor Authentication</div>
              <div className="text-sm text-chimera-text-muted mt-1">Add an extra layer of security to your account</div>
            </div>
            <button className="text-xs px-6 py-3 border border-chimera-border rounded-full hover:bg-white/5 transition opacity-50 cursor-not-allowed" disabled>
              COMING SOON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-chimera-border last:border-0">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-chimera-text-muted mt-1">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-chimera-gold' : 'bg-chimera-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
