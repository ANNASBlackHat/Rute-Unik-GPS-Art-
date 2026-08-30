'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function AdminNav({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const pathname = usePathname();

  const tabs = [
    { href: '/admin/pending', label: t('tabPending') },
    { href: '/admin/duplicates', label: t('tabDuplicates') },
    { href: '/admin/cities', label: t('tabCities') },
    { href: '/admin/routes', label: t('tabRoutes') },
  ];

  return (
    <div className="border-b border-contour-tan flex items-center gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const fullHref = `/${locale}${tab.href}`;
        const isActive =
          pathname === fullHref ||
          (tab.href === '/admin/pending' && pathname === `/${locale}/admin`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 font-display text-xs uppercase tracking-wider transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
              isActive
                ? 'border-trail-orange text-trail-orange font-bold bg-chalk'
                : 'border-transparent text-ink/70 hover:text-ink hover:border-contour-tan'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
