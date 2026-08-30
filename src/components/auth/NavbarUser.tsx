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
    <div className="flex items-center gap-3 text-xs font-display uppercase tracking-wider">
      <Link
        href="/upload"
        className="hover:text-trail-orange transition-colors py-1 text-ink/80"
      >
        {t('upload')}
      </Link>

      {user ? (
        <>
          <span className="text-contour-tan">/</span>
          <Link
            href="/me"
            className="hover:text-trail-orange transition-colors py-1 text-ink/80"
          >
            {t('myUploads')}
          </Link>
          {user.role === 'admin' && (
            <>
              <span className="text-contour-tan">/</span>
              <Link
                href="/admin"
                id="navbar-admin-link"
                className="text-trail-orange font-bold hover:underline transition-colors py-1"
              >
                {t('admin')}
              </Link>
            </>
          )}
          <span className="text-contour-tan">/</span>
          <button
            type="button"
            id="btn-navbar-logout"
            onClick={handleLogout}
            className="text-ink/60 hover:text-ink transition-colors cursor-pointer py-1 uppercase"
          >
            {locale === 'id' ? 'Keluar' : 'Logout'}
          </button>
        </>
      ) : (
        <>
          <span className="text-contour-tan">/</span>
          <Link
            href="/login"
            className="hover:text-trail-orange transition-colors py-1 text-ink/80"
          >
            {locale === 'id' ? 'Masuk' : 'Login'}
          </Link>
        </>
      )}
    </div>
  );
}
