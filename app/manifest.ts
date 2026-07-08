import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gutschi.site',
    short_name: 'Gutschi',
    description: 'Homeserver dashboard and applications',
    id: 'https://www.gutschi.site',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    launch_handler: {
      client_mode: 'navigate-existing',
    },
    theme_color: '#0000dc',
    background_color: '#ffffff',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Cash',
        short_name: 'Cash',
        description: 'Double bookkeeping',
        url: '/cash/',
      },
      {
        name: 'CoEditor',
        short_name: 'CoEditor',
        description: 'AI-driven Editor',
        url: '/coeditor/',
      },
      {
        name: 'Admin',
        short_name: 'Admin',
        description: 'Server admin',
        url: '/admin/',
      },
    ],
  }
}
