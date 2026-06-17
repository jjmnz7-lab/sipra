import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SIPRA',
    short_name: 'SIPRA',
    description: 'Sistema de Pagos y Recordatorios para Academias',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#15435a',
    categories: ['education', 'finance', 'productivity'],
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
