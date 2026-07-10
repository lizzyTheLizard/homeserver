import type { MetadataRoute } from 'next'
import { config } from './shared/config'
import { applications } from './shared/Application'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gutschi.site',
    description: 'Homeserver dashboard and applications',
    id: config.APP_URL,
    start_url: config.APP_URL + '/',
    display: 'standalone',
    orientation: 'portrait',
    launch_handler: { client_mode: 'navigate-existing' },
    theme_color: '#0000dc',
    background_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: applications.map(a => ({ name: a.name, description: a.description, url: config.APP_URL + a.link })),
  }
}
