'use client';

import React, { useState, useEffect } from 'react';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Menu, X } from 'lucide-react';

interface NavUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

export function Navbar(_props?: { locale?: string }) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile menu on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b border-contour-tan bg-paper sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group text-decoration-none shrink-0"
        >
          <span className="font-display text-xl tracking-tight text-ink uppercase group-hover:text-trail-orange transition-colors">
            RUTE UNIK
          </span>
          <span className="text-[10px] font-data px-1.5 py-0.5 rounded-[3px] border border-contour-tan uppercase text-ink/70">
            GPS ART
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <nav
            className="flex items-center gap-3 sm:gap-4 text-xs font-display uppercase tracking-wider text-ink/80"
            aria-label="Main navigation"
          >
            <Link
              href="/"
              aria-current={pathname === '/' ? 'page' : undefined}
              className={`inline-flex items-center min-h-11 px-1.5 py-2 transition-colors ${
                pathname === '/'
                  ? 'text-ink font-bold border-b-2 border-trail-orange'
                  : 'text-ink/80 hover:text-ink'
              }`}
            >
              {t('explore')}
            </Link>

            <span className="text-contour-tan" aria-hidden="true">
              /
            </span>

            <Link
              href="/upload"
              aria-current={isActive('/upload') ? 'page' : undefined}
              className={`inline-flex items-center min-h-11 px-1.5 py-2 transition-colors ${
                isActive('/upload')
                  ? 'text-ink font-bold border-b-2 border-trail-orange'
                  : 'text-ink/80 hover:text-ink'
              }`}
            >
              {t('upload')}
            </Link>

            {!loading && (
              <>
                {user ? (
                  <>
                    <span className="text-contour-tan" aria-hidden="true">
                      /
                    </span>
                    <Link
                      href="/me"
                      aria-current={isActive('/me') ? 'page' : undefined}
                      className={`inline-flex items-center min-h-11 px-1.5 py-2 transition-colors ${
                        isActive('/me')
                          ? 'text-ink font-bold border-b-2 border-trail-orange'
                          : 'text-ink/80 hover:text-ink'
                      }`}
                    >
                      {t('myUploads')}
                    </Link>

                    {user.role === 'admin' && (
                      <>
                        <span className="text-contour-tan" aria-hidden="true">
                          /
                        </span>
                        <Link
                          href="/admin"
                          id="navbar-admin-link"
                          aria-current={isActive('/admin') ? 'page' : undefined}
                          className={`inline-flex items-center min-h-11 px-1.5 py-2 font-bold transition-colors ${
                            isActive('/admin')
                              ? 'text-ink border-b-2 border-trail-orange'
                              : 'text-ink hover:text-trail-orange'
                          }`}
                        >
                          {t('admin')}
                        </Link>
                      </>
                    )}

                    <span className="text-contour-tan" aria-hidden="true">
                      /
                    </span>
                    <button
                      type="button"
                      id="btn-navbar-logout"
                      onClick={handleLogout}
                      className="inline-flex items-center min-h-11 px-1.5 py-2 text-ink/70 hover:text-ink transition-colors cursor-pointer uppercase font-display"
                    >
                      {t('logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-contour-tan" aria-hidden="true">
                      /
                    </span>
                    <Link
                      href="/login"
                      aria-current={isActive('/login') ? 'page' : undefined}
                      className={`inline-flex items-center min-h-11 px-1.5 py-2 transition-colors ${
                        isActive('/login')
                          ? 'text-ink font-bold border-b-2 border-trail-orange'
                          : 'text-ink/80 hover:text-ink'
                      }`}
                    >
                      {t('login')}
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          <LanguageSwitcher />
        </div>

        {/* Mobile Right Controls: Language Switcher + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            id="btn-mobile-menu-toggle"
            aria-label={mobileMenuOpen ? t('closeMenu') : t('menu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="w-10 h-10 inline-flex items-center justify-center rounded-[4px] border border-contour-tan bg-chalk text-ink hover:border-ink transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X size={18} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Menu size={18} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="region"
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-contour-tan bg-chalk px-4 py-4 space-y-3 shadow-md animate-in slide-in-from-top-2 duration-150"
        >
          <nav className="flex flex-col space-y-1 text-sm font-display uppercase tracking-wider text-ink">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-[4px] transition-colors ${
                pathname === '/'
                  ? 'bg-paper text-ink font-bold border-l-4 border-trail-orange'
                  : 'hover:bg-paper/60 text-ink/80 hover:text-ink'
              }`}
            >
              {t('explore')}
            </Link>

            <Link
              href="/upload"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-[4px] transition-colors ${
                isActive('/upload')
                  ? 'bg-paper text-ink font-bold border-l-4 border-trail-orange'
                  : 'hover:bg-paper/60 text-ink/80 hover:text-ink'
              }`}
            >
              {t('upload')}
            </Link>

            {user ? (
              <>
                <Link
                  href="/me"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-[4px] transition-colors ${
                    isActive('/me')
                      ? 'bg-paper text-ink font-bold border-l-4 border-trail-orange'
                      : 'hover:bg-paper/60 text-ink/80 hover:text-ink'
                  }`}
                >
                  {t('myUploads')}
                </Link>

                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2.5 rounded-[4px] transition-colors ${
                      isActive('/admin')
                        ? 'bg-paper text-ink font-bold border-l-4 border-trail-orange'
                        : 'hover:bg-paper/60 text-ink/80 hover:text-ink'
                    }`}
                  >
                    {t('admin')}
                  </Link>
                )}

                <div className="pt-2 border-t border-contour-tan/50">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 rounded-[4px] text-ink/70 hover:text-ink hover:bg-paper/60 transition-colors uppercase font-display"
                  >
                    {t('logout')}
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 border-t border-contour-tan/50">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-[4px] transition-colors ${
                    isActive('/login')
                      ? 'bg-paper text-ink font-bold border-l-4 border-trail-orange'
                      : 'hover:bg-paper/60 text-ink/80 hover:text-ink'
                  }`}
                >
                  {t('login')}
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
