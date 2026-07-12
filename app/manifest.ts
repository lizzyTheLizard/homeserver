import type { MetadataRoute } from 'next'
import { applications } from './shared/Application'
import { config } from './shared/config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gutschi.site',
    description: 'Homeserver dashboard and applications',
    id: config.APP_URL,
    start_url: config.APP_URL + '/pwa.html',
    display: 'standalone',
    orientation: 'portrait',
    launch_handler: { client_mode: 'navigate-existing' },
    theme_color: '#0000dc',
    background_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcuts: applications.map(a => ({ name: a.name, description: a.description, url: config.APP_URL + a.link })),
  }
}
