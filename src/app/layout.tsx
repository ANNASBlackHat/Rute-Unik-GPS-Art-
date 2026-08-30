import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rute Unik — GPS-Art Running Routes',
  description: 'A curated directory of GPS-art running routes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
