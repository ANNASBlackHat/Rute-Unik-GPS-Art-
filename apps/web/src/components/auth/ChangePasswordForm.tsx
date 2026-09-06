'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ChangePasswordForm() {
  const t = useTranslations('auth');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (next !== confirm) { setError('New passwords do not match'); return; }
    if (next.length < 6) { setError('New password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess('Password changed successfully');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <Card className="p-6 space-y-4 max-w-md">
      <h2 className="font-display text-sm uppercase tracking-wider text-ink border-b border-contour-tan pb-2">Change Password</h2>
      {error && <div role="alert" className="p-3 bg-error text-error-on rounded-[4px] text-xs flex gap-2"><AlertTriangle size={16} aria-hidden="true" className="shrink-0 mt-0.5" /> <span>{error}</span></div>}
      {success && <div className="p-3 bg-moss text-chalk rounded-[4px] text-xs flex gap-2"><Check size={16} aria-hidden="true" className="shrink-0 mt-0.5" /> <span>{success}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="cp-current" className="block text-[11px] uppercase font-semibold text-ink/70">Current Password *</label>
          <input id="cp-current" type="password" required value={current} onChange={e=>setCurrent(e.target.value)} className="w-full px-3 py-2.5 bg-paper border border-contour-tan rounded-[4px] text-sm focus:outline-none focus:border-ink" />
        </div>
        <div className="space-y-1">
          <label htmlFor="cp-new" className="block text-[11px] uppercase font-semibold text-ink/70">New Password *</label>
          <input id="cp-new" type="password" required minLength={6} value={next} onChange={e=>setNext(e.target.value)} className="w-full px-3 py-2.5 bg-paper border border-contour-tan rounded-[4px] text-sm focus:outline-none focus:border-ink" />
        </div>
        <div className="space-y-1">
          <label htmlFor="cp-confirm" className="block text-[11px] uppercase font-semibold text-ink/70">Confirm New Password *</label>
          <input id="cp-confirm" type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full px-3 py-2.5 bg-paper border border-contour-tan rounded-[4px] text-sm focus:outline-none focus:border-ink" />
        </div>
        <Button type="submit" variant="primary" disabled={loading} className="w-full justify-center">
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </Card>
  );
}
