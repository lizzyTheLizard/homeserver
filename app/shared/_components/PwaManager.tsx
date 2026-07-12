'use client'

import { useEffect } from 'react'

export function PwaManager() {
  // 1. Register the native service worker file
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => { console.log('[PWA Master] Service worker registered running scope:', reg.scope) })
        .catch((err: unknown) => { console.error('[PWA Master] Registration failed:', err) })
    }
  }, [])

  // 2 . Perform a regular ping to avoid the server to shut down
  useEffect(() => {
    let pingInterval: NodeJS.Timeout | undefined = undefined

    function startPinger() {
      if (pingInterval) return
      sendPing()
      pingInterval = setInterval(sendPing, 60000)
    }

    function stopPinger() {
      if (!pingInterval) return
      clearInterval(pingInterval)
      pingInterval = undefined
    }

    function sendPing() {
      fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: Date.now() }),
      }).catch((err: unknown) => { console.error('Ping failed:', err) })
    }

    // Monitor if the user minimizes the PWA or switches apps on Android
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') startPinger()
      else stopPinger()
    })

    // Start on initial load
    if (document.visibilityState === 'visible') startPinger()
  }, [])

  return null
}
