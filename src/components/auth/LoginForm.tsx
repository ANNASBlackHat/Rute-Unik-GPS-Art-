'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || `/${locale}/upload`;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('authError'));
      }

      if (isSignUp) {
        setSuccessMsg(t('signUpSuccess'));
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('authError');
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 sm:p-8 space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl text-ink uppercase tracking-tight">
          {isSignUp ? t('signUpTitle') : t('loginTitle')}
        </h1>
        <p className="font-body text-xs text-ink/70">
          {isSignUp ? t('signUpSubtitle') : t('loginSubtitle')}
        </p>
      </div>

      {errorMsg && (
        <div
          id="auth-error-banner"
          role="alert"
          className="p-3 bg-error text-error-on border border-white/20 rounded-[4px] font-body text-xs flex items-start gap-2"
        >
          <AlertTriangle size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 mt-0.5" /> <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          id="auth-success-banner"
          className="p-3 bg-moss text-chalk border border-white/20 rounded-[4px] font-body text-xs"
        >
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-data text-xs">
        {isSignUp && (
          <div className="space-y-1">
            <label className="block uppercase text-ink/70 font-semibold text-[11px]">
              {t('fullNameLabel')}
            </label>
            <input
              id="auth-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Runner Name"
              className="w-full px-3 py-2 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block uppercase text-ink/70 font-semibold text-[11px]">
            {t('emailLabel')}
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="runner@example.com"
            className="w-full px-3 py-2 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink"
          />
        </div>

        <div className="space-y-1">
          <label className="block uppercase text-ink/70 font-semibold text-[11px]">
            {t('passwordLabel')}
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            id="btn-auth-submit"
            variant="primary"
            className="w-full justify-center"
            disabled={loading}
          >
            {loading
              ? t('submitting')
              : isSignUp
                ? t('signUpButton')
                : t('signInButton')}
          </Button>
        </div>
      </form>

      <div className="pt-4 border-t border-contour-tan text-center">
        <button
          type="button"
          id="btn-toggle-auth-mode"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="font-data text-xs text-ink/80 hover:text-ink underline cursor-pointer"
        >
          {isSignUp ? t('alreadyHaveAccount') : t('noAccount')}
        </button>
      </div>
    </Card>
  );
}
