import pkg from './package.json'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // SPA: the HTML shell is static, so it can be precached and opened offline, and it never embeds user data.
  ssr: false,
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
  icon: {
    // Icons are bundled into the client; otherwise they are requested from the server and vanish offline.
    clientBundle: {
      scan: true,
      // výchozí ikony Nuxt UI (zavření, toasty, výběry…) se v kódu nevyskytují, ale používají se
      icons: [
        'lucide:x', 'lucide:check', 'lucide:minus', 'lucide:plus', 'lucide:info', 'lucide:search',
        'lucide:upload', 'lucide:ellipsis', 'lucide:loader-circle', 'lucide:circle-alert',
        'lucide:circle-check', 'lucide:circle-x', 'lucide:triangle-alert', 'lucide:eye', 'lucide:eye-off',
        'lucide:arrow-left', 'lucide:arrow-right', 'lucide:arrow-up', 'lucide:arrow-down',
        'lucide:chevron-down', 'lucide:chevron-up', 'lucide:chevron-left', 'lucide:chevron-right',
        'lucide:chevrons-left', 'lucide:chevrons-right', 'lucide:menu', 'lucide:sun', 'lucide:moon',
        'lucide:monitor', 'lucide:rotate-ccw', 'lucide:copy', 'lucide:copy-check'
      ]
    }
  },
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
      id: '/spolu',
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
      // Photos shared from the gallery are caught by public/share-target-sw.js.
      // HEIC/HEIF is left out because the server cannot process it.
      /*share_target: {
        action: '/share-target',
        method: 'POST',
        enctype: 'multipart/form-data',
        params: {
          files: [
            {
              name: 'photos',
              accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            }
          ]
        }
      },*/
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
      //importScripts: ['/share-target-sw.js'],
      globIgnores: ['**/share-target-sw.js'],
      // The app is a SPA, so every navigation is answered with the precached shell.
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/share-target/],
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,woff,woff2}'],
      // Fetched by the service worker on install, so it carries the runtime config of the running server.
      additionalManifestEntries: [{ url: '/', revision: String(Date.now()) }],
      runtimeCaching: [
        {
          // Photos are also downloaded ahead of time by the app (see memoryPhotoCache.ts).
          urlPattern: /\/api\/photos\/.+/,
          handler: 'CacheFirst',
          method: 'GET',
          options: {
            cacheName: 'api-photos',
            cacheableResponse: {
              statuses: [200]
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
      appBuild: process.env.NUXT_PUBLIC_APP_BUILD || '',
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