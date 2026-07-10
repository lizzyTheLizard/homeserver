'use client'

import { useEffect } from 'react'

export function PwaManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 1. Register the native service worker file
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => { console.log('[PWA Master] Service worker registered running scope:', reg.scope) })
        .catch((err: unknown) => { console.error('[PWA Master] Registration failed:', err) })
      // 2. Listen for messages emitted from sw.js
      const handleCacheUpdate = (event: MessageEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (event.data?.type === 'CACHE_UPDATED') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const { cacheName, updatedURL } = event.data.payload
          // Verify it matches your home page cache parameters
          if (cacheName === 'homepage-cache' && updatedURL === window.location.origin + '/') {
            console.log('Fresh background content detected! Reloading layout natively...')
            // Reload the page seamlessly to flash updated server data
            window.location.reload()
          }
        }
      }
      navigator.serviceWorker.addEventListener('message', handleCacheUpdate)
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleCacheUpdate)
      }
    }
  }, [])
  return null
}
