import type { MetadataRoute } from 'next'
import { applications } from './shared/Application'

const APP_URL = process.env.NODE_ENV === 'production' ? 'https://www.gutschi.site' : 'http://localhost:3000'

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#ffffff',
    description: 'Homeserver dashboard and applications',
    display: 'standalone',
    icons: [
      { purpose: 'any', sizes: '192x192', src: '/icon-192.png', type: 'image/png' },
      { purpose: 'maskable', sizes: '192x192', src: '/icon-192-maskable.png', type: 'image/png' },
      { sizes: '512x512', src: '/icon-512.png', type: 'image/png' },
    ],
    id: APP_URL,
    launch_handler: { client_mode: 'navigate-existing' },
    name: 'Gutschi.site',
    orientation: 'portrait',
    shortcuts: applications.map(a => ({ description: a.description, name: a.name, url: APP_URL + a.link })),
    start_url: `${APP_URL  }/pwa.html`,
    theme_color: '#0000dc',
  }
}
