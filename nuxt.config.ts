import pkg from './package.json'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    'nuxt-auth-utils',
    'nuxt-mongoose',
    '@nuxt/ui',
    '@nuxtjs/leaflet',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
      ],
    },
    rootAttrs: {
      'data-vaul-drawer-wrapper': '',
    },
    layoutTransition: {
      name: 'layout',
      mode: 'out-in',
      // Matched to Nuxt UI defaults
      enterActiveClass: 'transition-opacity duration-200 ease-out',
      enterFromClass: 'opacity-0',
      enterToClass: 'opacity-100',
      leaveActiveClass: 'transition-opacity duration-150 ease-in',
      leaveFromClass: 'opacity-100',
      leaveToClass: 'opacity-0'
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      name: 'Spolu',
      short_name: 'Spolu',
      description: 'Sdílená timeline vzpomínek pro dva uživatele.',
      lang: 'cs-CZ',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#ef4444',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/pwa-512x512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      type: 'module'
    },
    workbox: {
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: '/',
      runtimeCaching: [
        {
          // Cache Nuxt route documents so the app can cold-start offline.
          urlPattern: /\/(?!api\/)(?!.*\.[a-zA-Z0-9]+$).*/,
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'app-pages',
            networkTimeoutSeconds: 4,
            expiration: {
              maxEntries: 40,
              maxAgeSeconds: 60 * 60 * 24 * 7
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /\/api\/memories(?:\?.*)?$/,
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'api-memories',
            networkTimeoutSeconds: 4,
            expiration: {
              maxEntries: 80,
              maxAgeSeconds: 60 * 60 * 24 * 7
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /\/api\/memories\/summary(?:\?.*)?$/,
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'api-memories-summary',
            networkTimeoutSeconds: 4,
            expiration: {
              maxEntries: 40,
              maxAgeSeconds: 60 * 60 * 24 * 7
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /\/api\/gallery(?:\?.*)?$/,
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'api-gallery',
            networkTimeoutSeconds: 4,
            expiration: {
              maxEntries: 40,
              maxAgeSeconds: 60 * 60 * 24 * 7
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /\/api\/photos\/.*/,
          handler: 'CacheFirst',
          method: 'GET',
          options: {
            cacheName: 'api-photos',
            expiration: {
              maxEntries: 500,
              maxAgeSeconds: 60 * 60 * 24 * 30
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    }
  },
  runtimeConfig: {
    uploadsDir: '.data/uploads',
    public: {
      mapyApiKey: '',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || pkg.version || 'dev',
    },
    mongoose: {
      uri: 'mongodb://127.0.0.1:27017/spolu'
    },
    session: {
      maxAge: 60 * 60 * 24 * 365,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true
      }
    }
  },
  vite: {
    optimizeDeps: {
      include: [
        '@internationalized/date',
        '@vue-leaflet/vue-leaflet',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@vueuse/core',
        'leaflet',
        'zod'
      ]
    }
  },
  imports: {
    presets: [
      {
        from: '@vueuse/core',
        imports: ['breakpointsTailwind', 'useBreakpoints'] 
      }
    ]
  }
})