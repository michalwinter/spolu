<script setup lang="ts">
import 'leaflet/dist/leaflet.css'

const runtimeConfig = useRuntimeConfig()
const { reverse: reverseGeocode } = useGeocode()

const props = defineProps<{
  text: string
  location?: {
    lat?: number
    lng?: number
  }
}>()

const emit = defineEmits<{
  'update:text': [value: string]
  'update:location': [value: { lat?: number, lng?: number }]
  close: []
}>()

const apiKey = computed(() => runtimeConfig.public.mapyApiKey)

const PRAGUE: [number, number] = [50.0755, 14.4378]
const COORD_EPSILON = 0.00001
const center = computed(() => {
  if (typeof props.location?.lat === 'number' && typeof props.location?.lng === 'number') {
    return [props.location.lat, props.location.lng] as [number, number]
  }
  return PRAGUE
})
const initialZoom = computed(() => {
  if (typeof props.location?.lat === 'number' && typeof props.location?.lng === 'number') {
    return 16
  }
  return 7
})

const map = ref<any>(null)
const locationText = ref(props.text)
const lat = ref<number | undefined>(props.location?.lat)
const lng = ref<number | undefined>(props.location?.lng)

const locating = ref(false)
const reverseGeocoding = ref(false)

let reverseGeocodeTimer: ReturnType<typeof setTimeout> | undefined
let reverseLookupToken = 0

function hasCoordinateChange(nextLat: number, nextLng: number, prevLat?: number, prevLng?: number) {
  if (typeof prevLat !== 'number' || typeof prevLng !== 'number') {
    return true
  }

  return Math.abs(nextLat - prevLat) > COORD_EPSILON || Math.abs(nextLng - prevLng) > COORD_EPSILON
}

async function syncLocationFromMap() {
  const leafletMap = map.value?.leafletObject
  if (!leafletMap) {
    return
  }

  const center = leafletMap.getCenter()
  const nextLat = center.lat
  const nextLng = center.lng

  if (!hasCoordinateChange(nextLat, nextLng, lat.value, lng.value)) {
    return
  }

  const lookupToken = ++reverseLookupToken

  lat.value = nextLat
  lng.value = nextLng
  reverseGeocoding.value = true

  try {
    const result = await reverseGeocode(nextLat, nextLng)
    if (lookupToken !== reverseLookupToken) {
      return
    }

    locationText.value = result.location ?? locationText.value
  } catch {
    if (lookupToken !== reverseLookupToken) {
      return
    }
  } finally {
    if (lookupToken === reverseLookupToken) {
      reverseGeocoding.value = false
    }
  }
}

function scheduleMapLocationSync() {
  if (reverseGeocodeTimer) {
    clearTimeout(reverseGeocodeTimer)
  }

  reverseGeocodeTimer = setTimeout(() => {
    void syncLocationFromMap()
  }, 1500)
}

function gpsSearch() {
  if (!('geolocation' in navigator)) {
    alert('Geolokace není v tomto prohlížeči dostupná.')
    return
  }

  locating.value = true

  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false
      const { latitude, longitude } = position.coords
      map.value?.leafletObject.setView([latitude, longitude], 15)
    },
    () => {
      locating.value = false
      alert('Nepodařilo se zjistit polohu.')
    },
    { timeout: 8000 }
  )
}

function onMapMoveEnd() {
  scheduleMapLocationSync()
}

function selectLocation() {
  if (reverseGeocodeTimer) {
    clearTimeout(reverseGeocodeTimer)
    reverseGeocodeTimer = undefined
  }

  emit('update:text', locationText.value)
  emit('update:location', {
    lat: lat.value,
    lng: lng.value
  })
  emit('close')
}

watch(
  () => props.text,
  (value) => {
    locationText.value = value
  },
)

watch(
  () => props.location,
  (value) => {
    lat.value = value?.lat
    lng.value = value?.lng
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (reverseGeocodeTimer) {
    clearTimeout(reverseGeocodeTimer)
  }
})
</script>

<template>
  <div class="p-5 flex flex-col gap-5">
    <div class="flex items-center gap-5">
      <h2 class="flex-1 text-lg font-semibold">Vyberte lokaci</h2>
      <UButton icon="ph:x" color="neutral" variant="ghost" @click="emit('close')" />
    </div>
    <UInput v-model="locationText" icon="ph:map-pin" placeholder="Popis lokace" tabindex="-1" :loading="reverseGeocoding">
      <template #trailing>
        <UButton v-if="locationText.length > 0" icon="ph:x" variant="ghost" color="neutral" size="xs" @click="() => { locationText = '' }" />
        <span v-else></span>
      </template>
    </UInput>
    <div class="w-full min-h-64 aspect-square rounded-md  relative z-0 overflow-hidden bg-muted">
      <ClientOnly fallback="Načítání mapy...">
        <LMap ref="map" :zoom="initialZoom" :max-zoom="18" :center="center" :options="{ zoomControl: false, attributionControl: false }" @moveend="onMapMoveEnd">
          <LTileLayer 
            name="Mapy.cz" layer-type="base"
            :url="`https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?lang=cs&apikey=${apiKey}`" 
            :attribution="`&copy; <a href='https://mapy.cz'>Mapy.cz</a>`"
          />
        </LMap>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-3/4 z-400 pointer-events-none drop-shadow-md">
          <!-- SVG Ikonka špendlíku -->
          <UIcon name="ph:map-pin-simple-fill" class="size-8 text-primary-600" />
        </div>
      </ClientOnly>
    </div>
    <div class="flex justify-between gap-2.5">
      <UButton icon="ph:gps" variant="soft" @click="gpsSearch" :loading="locating" />
      <UButton icon="ph:check" color="primary" variant="solid" label="Potvrdit" @click="selectLocation" />
    </div>
  </div>
</template>