'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowUpRight, KeyRound, Sparkles } from 'lucide-react';

export default function AdminSetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, setupToken }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error || 'The administrator account could not be created.');
        return;
      }
      window.location.assign('/admin/login?setup=complete');
    } catch {
      setError('Admin setup is unavailable. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 px-6 py-8 text-ink-900 lg:px-10">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-950 text-gold-200"><Sparkles size={17} /></span>
          <span><span className="block font-display text-xl leading-none text-forest-950">Mums</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-700">Backpackers</span></span>
        </Link>
        <Link href="/admin/login" className="inline-flex items-center gap-2 text-sm font-semibold text-forest-700"><ArrowLeft size={16} /> Admin sign in</Link>
      </header>
      <div className="mx-auto flex max-w-md justify-center py-16">
        <section className="w-full rounded-2xl bg-white p-7 shadow-[0_12px_50px_rgba(26,61,42,0.08)] sm:p-10">
          <p className="eyebrow">One-time setup</p>
          <h1 className="mt-4 font-display text-4xl text-forest-950">Create the admin account.</h1>
          <p className="mt-3 text-sm leading-6 text-ink-500">This form works only before the first administrator is created. The setup token must be configured privately on the server.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="field-label">Administrator email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" placeholder="you@example.com" /></label>
            <label className="field-label">Password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" /><span className="mt-2 block text-xs font-normal text-ink-400">Use at least 12 characters.</span></label>
            <label className="field-label">One-time setup token<input required type="password" autoComplete="off" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} className="field-input" /></label>
            {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}
            <button disabled={submitting} className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-forest-950 px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-forest-800 disabled:cursor-wait disabled:opacity-60">
              {submitting ? 'Creating account…' : 'Create administrator'} {!submitting && <ArrowUpRight size={17} />}
            </button>
          </form>
          <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-ink-400"><KeyRound size={14} className="mt-0.5 shrink-0" /> Never share the setup token. Once an account exists, this endpoint cannot create another administrator.</p>
        </section>
      </div>
    </main>
  );
}
