// https://nuxt.com/docs/api/configuration/nuxt-config
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
    rootAttrs: {
      'data-vaul-drawer-wrapper': '',
    }
  },
  runtimeConfig: {
    uploadsDir: '.data/uploads',
    public: {
      mapyApiKey: '',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || process.env.npm_package_version || 'dev',
      appBuild: process.env.NUXT_PUBLIC_APP_BUILD || ''
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