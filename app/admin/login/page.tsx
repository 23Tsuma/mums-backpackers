'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowUpRight, LockKeyhole, Sparkles } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error || 'Admin sign-in failed. Please try again.');
        return;
      }
      window.location.assign('/admin');
    } catch {
      setError('Admin sign-in is unavailable. Check your connection and try again.');
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
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-forest-700"><ArrowLeft size={16} /> Back to website</Link>
      </header>
      <div className="mx-auto flex max-w-md justify-center py-20 lg:py-28">
        <section className="w-full rounded-2xl bg-white p-7 shadow-[0_12px_50px_rgba(26,61,42,0.08)] sm:p-10">
          <div className="mb-8">
            <p className="eyebrow">Administrator access</p>
            <h1 className="mt-4 font-display text-4xl text-forest-950">Welcome back.</h1>
            <p className="mt-3 text-sm leading-6 text-ink-500">Sign in to review your property dashboard.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="field-label">Email address<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" placeholder="you@example.com" /></label>
            <label className="field-label">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" /></label>
            {error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}
            <button disabled={submitting} className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-forest-950 px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-forest-800 disabled:cursor-wait disabled:opacity-60">
              {submitting ? 'Signing in…' : 'Sign in'} {!submitting && <ArrowUpRight size={17} />}
            </button>
          </form>
          <Link href="/admin/setup" className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-forest-700"><LockKeyhole size={15} /> Set up the first administrator</Link>
        </section>
      </div>
    </main>
  );
}
