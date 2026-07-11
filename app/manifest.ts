import type { MetadataRoute } from 'next'
import { applications } from './shared/Application'

// const baseUrl = 'http://localhost:3000'
const baseUrl = 'https://www.gutschi.site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gutschi.site',
    description: 'Homeserver dashboard and applications',
    id: baseUrl,
    start_url: baseUrl,
    display: 'standalone',
    orientation: 'portrait',
    launch_handler: { client_mode: 'navigate-existing' },
    theme_color: '#0000dc',
    background_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: applications.map(a => ({ name: a.name, description: a.description, url: baseUrl + a.link })),
  }
}
