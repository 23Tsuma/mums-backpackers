'use client';

import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';

export default function AdminSecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error || 'The password could not be changed.');
        return;
      }
      setMessage('Password updated. All sessions were signed out; redirecting to sign in…');
      window.setTimeout(() => window.location.assign('/admin/login?password=changed'), 1200);
    } catch {
      setError('Password changes are unavailable. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-2xl">
      <header className="mb-8">
        <p className="eyebrow">Account security</p>
        <h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Security settings.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">Changing your password signs out all active administrator sessions.</p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-sage-100 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,42,0.04)] sm:p-8">
        <label className="field-label">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="field-input" /></label>
        <label className="field-label">New password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="field-input" /><span className="mt-2 block text-xs font-normal text-ink-400">Use at least 12 characters.</span></label>
        {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}
        {message && <p className="text-sm font-medium text-forest-800" role="status">{message}</p>}
        <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-950 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-forest-800 disabled:opacity-60">
          <KeyRound size={16} /> {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </section>
  );
}
