'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function AdminLogoutButton() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signOut() {
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/auth/logout', { method: 'POST' });
      if (!response.ok) {
        setError('Sign-out failed. Please try again.');
        return;
      }
      window.location.assign('/admin/login');
    } catch {
      setError('Sign-out is unavailable. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void signOut()} disabled={submitting} className="inline-flex items-center gap-2 text-sm font-semibold text-forest-800 disabled:opacity-60">
        <LogOut size={16} /> {submitting ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p className="mt-2 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
