import { Archivo_Black, JetBrains_Mono, Inter } from 'next/font/google';

export const fontDisplay = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-archivo-black',
  display: 'swap',
});

export const fontData = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
