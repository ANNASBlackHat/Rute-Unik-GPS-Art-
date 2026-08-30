'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: 'id' | 'en') => {
    if (newLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div
      id="language-switcher"
      data-testid="language-switcher"
      className="inline-flex items-center rounded-[4px] border border-contour-tan bg-chalk p-0.5 text-xs font-data select-none"
    >
      <button
        type="button"
        id="btn-switch-id"
        data-locale="id"
        onClick={() => handleLocaleChange('id')}
        disabled={isPending}
        className={`px-2.5 py-1 rounded-[3px] uppercase font-bold tracking-wider transition-colors ${
          locale === 'id'
            ? 'bg-ink text-chalk'
            : 'text-ink/70 hover:text-ink hover:bg-paper/50'
        }`}
        aria-label="Ganti bahasa ke Bahasa Indonesia"
      >
        ID
      </button>
      <button
        type="button"
        id="btn-switch-en"
        data-locale="en"
        onClick={() => handleLocaleChange('en')}
        disabled={isPending}
        className={`px-2.5 py-1 rounded-[3px] uppercase font-bold tracking-wider transition-colors ${
          locale === 'en'
            ? 'bg-ink text-chalk'
            : 'text-ink/70 hover:text-ink hover:bg-paper/50'
        }`}
        aria-label="Switch language to English"
      >
        EN
      </button>
    </div>
  );
}
