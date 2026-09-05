import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Rute Unik — GPS-Art Running Routes',
    template: '%s | Rute Unik',
  },
  description: 'A curated directory of GPS-art running routes',
  openGraph: {
    siteName: 'Rute Unik',
    type: 'website',
    locale: 'en_ID',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
