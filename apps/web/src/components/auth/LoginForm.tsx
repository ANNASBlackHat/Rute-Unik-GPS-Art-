'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
      // Redirect is handled by Supabase
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('authError');
      setErrorMsg(message);
      setGoogleLoading(false);
    }
  };

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

      if (data.needsConfirmation) {
        setSuccessMsg(data.message || t('signUpSuccess'));
        setLoading(false);
        return;
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
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 pr-10 bg-paper border border-contour-tan rounded-[4px] text-ink focus:outline-none focus:border-ink"
            />
            <button
              type="button"
              id="btn-toggle-password"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/60 hover:text-ink transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            id="btn-auth-submit"
            variant="primary"
            className="w-full justify-center"
            disabled={loading || googleLoading}
          >
            {loading
              ? t('submitting')
              : isSignUp
                ? t('signUpButton')
                : t('signInButton')}
          </Button>
        </div>
      </form>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-contour-tan" />
        <span className="font-data text-[11px] uppercase tracking-wider text-ink/50">atau</span>
        <div className="h-px flex-1 bg-contour-tan" />
      </div>

      <Button
        type="button"
        id="btn-google-login"
        variant="secondary"
        className="w-full justify-center gap-2 bg-white border-contour-tan hover:bg-paper"
        disabled={loading || googleLoading}
        onClick={handleGoogleLogin}
      >
        {/* Google G */}
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09A6.99 6.99 0 015.48 12s.04-.7.36-2.09V7.07H2.18A10.99 10.99 0 001 12c0 1.78.42 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {googleLoading ? t('submitting') : locale === 'id' ? 'Lanjutkan dengan Google' : 'Continue with Google'}
      </Button>

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
