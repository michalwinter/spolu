import pkg from './package.json'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    'nuxt-auth-utils',
    'nuxt-mongoose',
    '@nuxt/ui',
    '@nuxtjs/leaflet',
    '@vueuse/nuxt'
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