import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rute Unik — GPS-Art Running Routes',
    short_name: 'Rute Unik',
    description:
      'A curated directory of GPS-art running routes browsable by city, with community uploads and live run tracking.',
    start_url: '/id',
    display: 'standalone',
    background_color: '#F7F5EF',
    theme_color: '#1F2A1E',
    icons: [
      { src: '/icon', sizes: '64x64', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
