/* global self, caches */
const CACHE_NAME = 'pwa-cache-v1'
const OFFLINE_URLS = ['/offline.html', '/global.css']
const HTML_TIMEOUT = 3000 // Time in milliseconds to wait for an HTML page to load before falling back to cache

// A helper function that rejects after a set number of milliseconds
function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Network request timed out')), ms)
  })
}

// A helper function that handles failed requests by returning a cached response or an offline fallback page
async function requestFailed(event, error) {
  console.log(`Fetch failed or timed out: ${error.message}`)
  const cachedResponse = await caches.match(event.request)
  if (cachedResponse) {
    console.log(`Returning cached response for ${event.request.url}`)
    return cachedResponse
  }
  console.log(`No cached response found for ${event.request.url}, returning offline fallback page`)
  return caches.match('/offline.html')
}

/**
 * Install event: This runs when the browser sees this service worker for the first time.
 */
self.addEventListener('install', (event) => {
  // Cache the offline fallback assets
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
    console.log('PWA: Caching offline fallback assets')
    return cache.addAll(OFFLINE_URLS)
  }))
  // Forces the waiting service worker to become the active service worker immediately
  self.skipWaiting()
})

/**
 * Activate event: This runs after install
 */
self.addEventListener('activate', (event) => {
  // Ensuring old code doesn't break your updated site.
  event.waitUntil(caches.keys().then((cacheNames) => {
    return Promise.all(
      cacheNames.map((cache) => {
        // If a cache found in storage doesn't match our current CACHE_NAME, delete it
        if (cache !== CACHE_NAME) {
          console.log('PWA: Clearing old cache:', cache)
          return caches.delete(cache)
        }
      }),
    )
  }))
  // Allows the service worker to immediately control all open tabs/pages
  self.clients.claim()
})

/**
 * Fetch event: This runs for every network request made by the page.
 */
self.addEventListener('fetch', (event) => {
  // Only fetch GET requests, as other methods (POST, PUT, DELETE) may have side effects and should not be cached.
  if (event.request.method !== 'GET') return

  // We only apply timeouts to navigation requests (HTML pages)
  // so we don't break background API calls or huge image downloads.
  const isHtmlPage = event.request.mode === 'navigate'

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request)
    if (cachedResponse) {
      console.log(`PWA: Returning cached response for ${event.request.url}`)
      return cachedResponse
    }
    if (!isHtmlPage) return fetch(event.request)
    console.log(`PWA: Fetching HTML page ${event.request.url} with timeout of ${HTML_TIMEOUT}ms`)
    return Promise.race([fetch(event.request), timeout(HTML_TIMEOUT)])
      .then(r => console.log(`PWA: Fetching HTML page ` + event.request.url + ` completed with status: ` + r.status) || r)
      .catch(error => requestFailed(event, error))
  })())
})
