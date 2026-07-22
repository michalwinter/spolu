<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'


const props = defineProps<{
  modelValue: { text: string, lat?: number, lng?: number }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { text: string, lat?: number, lng?: number }]
}>()

const { search: searchPlaces, reverse: reverseGeocode } = useGeocode()
const runtimeConfig = useRuntimeConfig()

const mapyApiKey = computed(() => runtimeConfig.public.mapyApiKey)

const PRAGUE: [number, number] = [50.0755, 14.4378]

const open = ref(false)
const mapEl = useTemplateRef<HTMLDivElement>('mapEl')
const query = ref('')
const results = ref<GeocodeResult[]>([])
const searching = ref(false)
const locating = ref(false)
const errorMessage = ref('')

let leaflet: typeof import('leaflet') | null = null
let map: LeafletMap | null = null
let marker: LeafletMarker | null = null
let searchTimer: ReturnType<typeof setTimeout> | undefined

async function getLeaflet() {
  if (leaflet) {
    return leaflet
  }

  const mod = await import('leaflet')
  leaflet = (mod.default ?? mod) as unknown as typeof import('leaflet')

  // Vite bundles leaflet's default marker icons under hashed URLs that the
  // library can't find on its own - point it at the imported asset URLs.
  delete (leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
  leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIconUrl,
    shadowUrl: markerShadow
  })

  return leaflet
}

async function ensureMap() {
  if (map || !mapEl.value) {
    return
  }

  const L = await getLeaflet()

  const hasPosition = typeof props.modelValue.lat === 'number' && typeof props.modelValue.lng === 'number'
  const center: [number, number] = hasPosition
    ? [props.modelValue.lat as number, props.modelValue.lng as number]
    : PRAGUE

  map = L.map(mapEl.value).setView(center, hasPosition ? 14 : 7)

  L.tileLayer(`https://api.mapy.cz/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${mapyApiKey.value}`, { maxZoom: 19 }).addTo(map)

  if (hasPosition) {
    marker = L.marker(center).addTo(map)
  }

  map.on('click', (mapEvent) => {
    selectPosition(mapEvent.latlng.lat, mapEvent.latlng.lng, true)
  })

  requestAnimationFrame(() => map?.invalidateSize())
}

async function placeMarker(lat: number, lng: number, pan: boolean) {
  const L = await getLeaflet()
  if (!map) {
    return
  }

  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng]).addTo(map)
  }

  if (pan) {
    map.setView([lat, lng], Math.max(map.getZoom(), 14))
  }
}

async function selectPosition(lat: number, lng: number, lookupAddress: boolean) {
  await placeMarker(lat, lng, true)
  emit('update:modelValue', { text: props.modelValue.text, lat, lng })

  if (!lookupAddress) {
    return
  }

  try {
    const result = await reverseGeocode(lat, lng)
    console.log('Reverse geocode result:', result)
    emit('update:modelValue', { text: result.location || props.modelValue.text, lat, lng })
  } catch {
    // Keep whatever text was already there - the position itself was still saved.
  }
}

function selectResult(result: GeocodeResult) {
  results.value = []
  query.value = ''
  // Place the marker/coordinates first, then apply the descriptive label
  // once that settles, so it can't be clobbered by selectPosition's own
  // (coordinates-only) emit racing with this one.
  selectPosition(result.lat, result.lng, false).then(() => {
    emit('update:modelValue', { text: result.label, lat: result.lat, lng: result.lng })
  })
}

function onSearchInput() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  const value = query.value.trim()
  if (value.length < 3) {
    results.value = []
    return
  }

  searchTimer = setTimeout(async () => {
    searching.value = true
    errorMessage.value = ''
    try {
      results.value = await searchPlaces(value)
    } catch {
      errorMessage.value = 'Hledání se nezdařilo.'
    } finally {
      searching.value = false
    }
  }, 1000)
}

function useMyLocation() {
  if (!('geolocation' in navigator)) {
    errorMessage.value = 'Geolokace není v tomto prohlížeči dostupná.'
    return
  }

  locating.value = true
  errorMessage.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false
      selectPosition(position.coords.latitude, position.coords.longitude, true)
    },
    () => {
      locating.value = false
      errorMessage.value = 'Nepodařilo se zjistit polohu.'
    },
    { timeout: 8000 }
  )
}

function clearLocation() {
  results.value = []
  query.value = ''
  errorMessage.value = ''
  if (marker && map) {
    map.removeLayer(marker)
    marker = null
  }
  emit('update:modelValue', { text: '', lat: undefined, lng: undefined })
}

watch(open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    await ensureMap()
    map?.invalidateSize()
  }
})

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  map?.remove()
  map = null
  marker = null
})
</script>

<template>
  <div class="w-full p-5 space-y-3">
    <UInput
      v-model="query"
      icon="i-lucide-search"
      placeholder="Hledat místo..."
      class="w-full"
      :loading="searching"
      @input="onSearchInput"
    />

    <div v-if="results.length" class="max-h-32 overflow-y-auto rounded-md border border-default divide-y divide-default">
      <button
        v-for="result in results"
        :key="`${result.lat}-${result.lng}`"
        type="button"
        class="w-full text-left px-2 py-1.5 text-xs hover:bg-elevated transition"
        @click="selectResult(result)"
      >
        {{ result.label }}
      </button>
    </div>

    <div ref="mapEl" class="w-full h-56 rounded-md overflow-hidden z-40" />

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />

    <div class="flex items-center justify-between gap-2">
      <UButton
        label="Moje poloha"
        icon="i-lucide-locate-fixed"
        size="xs"
        color="neutral"
        variant="outline"
        :loading="locating"
        @click="useMyLocation"
      />
      <UButton label="Smazat" size="xs" color="neutral" variant="ghost" @click="clearLocation" />
      <UButton label="Hotovo" size="xs" @click="() => { open = false }" />
    </div>
  </div>
</template>
