'use client';

import React, { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

interface NavUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

export function NavbarUser({ locale }: { locale: string }) {
  const t = useTranslations('common');
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-xs font-display uppercase tracking-wider text-ink/40">
        <span>...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-3 text-xs font-display uppercase tracking-wider">
      <Link
        href="/upload"
        className="inline-flex items-center min-h-11 px-1.5 py-2 hover:text-ink text-ink/80 transition-colors"
      >
        {t('upload')}
      </Link>

      {user ? (
        <>
          <span className="text-contour-tan" aria-hidden="true">/</span>
          <Link
            href="/me"
            className="inline-flex items-center min-h-11 px-1.5 py-2 hover:text-ink text-ink/80 transition-colors"
          >
            {t('myUploads')}
          </Link>
          {user.role === 'admin' && (
            <>
              <span className="text-contour-tan" aria-hidden="true">/</span>
              <Link
                href="/admin"
                id="navbar-admin-link"
                className="inline-flex items-center min-h-11 px-1.5 py-2 text-ink font-bold hover:text-trail-orange-text hover:underline underline-offset-2 transition-colors"
              >
                {t('admin')}
              </Link>
            </>
          )}
          <span className="text-contour-tan" aria-hidden="true">/</span>
          <button
            type="button"
            id="btn-navbar-logout"
            onClick={handleLogout}
            className="inline-flex items-center min-h-11 px-1.5 py-2 text-ink/70 hover:text-ink transition-colors cursor-pointer uppercase"
          >
            {locale === 'id' ? 'Keluar' : 'Logout'}
          </button>
        </>
      ) : (
        <>
          <span className="text-contour-tan" aria-hidden="true">/</span>
          <Link
            href="/login"
            className="inline-flex items-center min-h-11 px-1.5 py-2 hover:text-ink text-ink/80 transition-colors"
          >
            {locale === 'id' ? 'Masuk' : 'Login'}
          </Link>
        </>
      )}
    </div>
  );
}
