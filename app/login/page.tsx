'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowUpRight, KeyRound, Mail, Sparkles } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (!isSupabaseConfigured) {
      setError('Owner sign-in is unavailable because Supabase has not been configured.');
      setSubmitting(false);
      return;
    }

    const supabase = getSupabaseClient();
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setSubmitting(false);
    if (result.error) {
      setError(mode === 'login' ? 'We could not sign you in. Please check your details and try again.' : 'We could not create your account. Please try again with a different email address.');
      return;
    }

    if (mode === 'signup' && !result.data.session) {
      setMessage('Your account is ready. Check your email if confirmation is requested, then sign in.');
      setMode('login');
      return;
    }

    window.location.assign('/manage');
  }

  return (
    <main className="min-h-screen bg-cream-50 px-6 py-8 text-ink-900 lg:px-10">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="group flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-forest-950 text-gold-200 transition-transform group-hover:rotate-12"><Sparkles size={17} /></span><span><span className="block font-display text-xl leading-none text-forest-950">Mums</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-700">Backpackers</span></span></Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-forest-700"><ArrowLeft size={16} /> Back to website</Link>
      </header>
      <div className="mx-auto flex max-w-md justify-center py-20 lg:py-28"><section className="w-full rounded-2xl bg-white p-7 shadow-[0_12px_50px_rgba(26,61,42,0.08)] sm:p-10"><div className="mb-8"><p className="eyebrow">Owner workspace</p><h1 className="mt-4 font-display text-4xl text-forest-950">{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1><p className="mt-3 text-sm leading-6 text-ink-500">{mode === 'login' ? 'Sign in to manage your property details and photos.' : 'Create an account to add and manage your accommodation listing.'}</p></div>{!isSupabaseConfigured && <p className="mb-5 text-sm font-medium text-red-700" role="alert">Owner sign-in is unavailable because Supabase has not been configured.</p>}<form onSubmit={handleSubmit} className="space-y-5"><label className="field-label">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" autoComplete="email" placeholder="you@example.com" /></label><label className="field-label">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" /></label>{error && <p className="text-sm font-medium text-red-700" role="alert">{error}</p>}{message && <p className="rounded-xl bg-sage-50 p-4 text-sm leading-6 text-forest-800" role="status">{message}</p>}<button disabled={submitting || !isSupabaseConfigured} className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-forest-950 px-7 py-4 text-sm font-bold text-white transition-all hover:-translate-y-1 hover:bg-forest-800 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} {!submitting && <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />}</button></form><button type="button" disabled={!isSupabaseConfigured} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} className="mt-7 flex w-full items-center justify-center gap-2 text-sm font-semibold text-forest-700 disabled:cursor-not-allowed disabled:opacity-50">{mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}<KeyRound size={15} /></button></section></div>
    </main>
  );
}
