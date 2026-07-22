<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const props = defineProps<{
	reportId: string
	memoryIndex?: number
}>()

const emit = defineEmits<{
	close: []
}>()

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')
const { getReportById, removeMemory, markSummaryChanged } = useMemories()
const report = computed(() => getReportById(props.reportId))

const activeIndex = ref(0)
const touchStartX = ref<number | null>(null)
const SWIPE_THRESHOLD = 40

const memories = computed(() => report.value?.memories ?? [])

function clampIndex(index: number) {
	if (!memories.value.length) {
		return 0
	}
	return Math.min(Math.max(index, 0), memories.value.length - 1)
}

function resolveInitialIndex() {
	if (typeof props.memoryIndex !== 'number' || Number.isNaN(props.memoryIndex)) {
		return 0
	}
	return clampIndex(props.memoryIndex)
}

const isEditing = ref(false)
const isDeleteConfirmOpen = ref(false)
const deleting = ref(false)
const deleteErrorMessage = ref('')
const activePhotoIndex = ref<number | null>(null)
const activeMemory = computed(() => memories.value[clampIndex(activeIndex.value)] ?? null)
const hasPrev = computed(() => activeIndex.value > 0)
const hasNext = computed(() => activeIndex.value < memories.value.length - 1)

const formattedDate = computed(() => {
	if (!report.value) {
		return ''
	}

	return new Date(report.value.date).toLocaleDateString('cs-CZ', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	})
})

const initials = computed(() => {
  const name = activeMemory.value?.author?.name ?? ''
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const mapLink = computed(() => {
	const memory = activeMemory.value
	if (!memory || typeof memory.lat !== 'number' || typeof memory.lng !== 'number') {
		return null
	}
	return `https://mapy.com/fnc/v1/showmap?mapset=basic&center=${memory.lng},${memory.lat}&zoom=16&marker=true`
})

function goPrev() {
	if (hasPrev.value) {
		activeIndex.value -= 1
	}
}

function goNext() {
	if (hasNext.value) {
		activeIndex.value += 1
	}
}

function selectPage(index: number) {
	activeIndex.value = index
}

function openDeleteConfirm() {
	deleteErrorMessage.value = ''
	isDeleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
	if (deleting.value) {
		return
	}

	deleteErrorMessage.value = ''
	isDeleteConfirmOpen.value = false
}

async function confirmDelete() {
	if (!report.value || !activeMemory.value) {
		return
	}

	deleting.value = true
	deleteErrorMessage.value = ''

	try {
		await removeMemory(report.value.id, activeMemory.value.id)
		isDeleteConfirmOpen.value = false
		markSummaryChanged()
		emit('close')
	} catch {
		deleteErrorMessage.value = 'Smazání se nezdařilo.'
	} finally {
		deleting.value = false
	}
}

function onTouchStart(event: TouchEvent) {
	touchStartX.value = event.touches[0]?.clientX ?? null
}

function onTouchEnd(event: TouchEvent) {
	if (touchStartX.value === null) {
		return
	}

	const endX = event.changedTouches[0]?.clientX ?? touchStartX.value
	const delta = endX - touchStartX.value

	if (Math.abs(delta) >= SWIPE_THRESHOLD) {
		if (delta < 0) {
			goNext()
		} else {
			goPrev()
		}
	}

	touchStartX.value = null
}

watch(
	() => [props.reportId, report.value?.updatedAt, report.value?.memories.length, props.memoryIndex] as const,
	() => {
		activeIndex.value = resolveInitialIndex()
	}
)

activeIndex.value = resolveInitialIndex()


</script>

<template>
	<div class="h-full p-5 flex flex-col gap-5">
		<div class="flex items-center justify-between gap-2.5">
			<div class="flex-1">
				<h2 class="font-semibold text-highlighted capitalize">{{ formattedDate }}</h2>
				<p v-if="report?.title" class="text-sm">{{ report.title }}</p>
			</div>
			<div class="flex items-center gap-1.25">
				<UButton icon="ph:trash" color="error" variant="ghost" @click="openDeleteConfirm" />
				<UButton icon="ph:pencil-simple" color="neutral" variant="ghost" @click="() => { isEditing = true }" />
			</div>
			<UButton icon="ph:x" color="neutral" variant="ghost" @click="emit('close')" />
		</div>

		<div v-if="memories.length" class="flex justify-center gap-1.5">
			<button
				v-for="(_, index) in memories"
				:key="`dot-${index}`"
				type="button"
				class="h-2 rounded-full transition-all"
				:class="index === activeIndex ? 'w-6 bg-primary' : 'w-2 bg-inverted/25'"
				:aria-label="`Přejít na vzpomínku ${index + 1}`"
				@click="selectPage(index)"
			></button>
		</div>

		<div
			v-if="activeMemory"
			class="min-h-72 h-full select-none space-y-2.5"
			@touchstart="onTouchStart"
			@touchend="onTouchEnd"
		>
			<div class="flex items-start justify-between gap-2">
				<div class="flex items-center gap-2.5">
					<UAvatar size="lg" :text="initials"/>
					<div class="flex items-center gap-2.5 text-sm font-semibold">
						<span v-if="activeMemory.author">{{ activeMemory.author.name }}</span>
						<!-- <span v-if="activeMemory.time">{{ activeMemory.time }}</span> -->
					</div>
				</div>
				<div class="text-sm">
					
				</div>

				<div v-if="!isMobile" class="flex items-center gap-1.5">
					<UButton
						icon="ph:caret-left"
						color="neutral"
						variant="soft"
						:disabled="!hasPrev"
						@click="goPrev"
					/>
					<UButton
						icon="ph:caret-right"
						color="neutral"
						variant="soft"
	          :disabled="!hasNext"
						@click="goNext"
					/>
				</div>
			</div>

			<!-- <p v-if="activeMemory.location" class="mb-3 text-sm text-muted flex items-center gap-1.5">
				<UIcon name="ph:map-pin" class="size-4" />
				<a v-if="mapLink" :href="mapLink" target="_blank" rel="noopener" class="hover:underline">
					{{ activeMemory.location }}
				</a>
				<span v-else>{{ activeMemory.location }}</span>
			</p> -->
			
			<div class="flex items-center gap-2.5">
				<UBadge v-if="activeMemory.time" variant="soft" color="neutral" :label="activeMemory.time" class="rounded-lg" />
				<UBadge v-if="activeMemory.location" icon="ph:map-pin" variant="soft" :label="activeMemory.location" class="rounded-lg" />
			</div>

			<p class="text-sm whitespace-pre-line">{{ activeMemory.text }}</p>

			<div v-if="activeMemory.photos.length" class="grid grid-cols-3 gap-2.5 my-5">
				<img
					v-for="(photo, i) in activeMemory.photos"
					:key="photo.id ?? photo.filename"
					:src="photoUrl(photo.thumbnailFilename)"
					alt=""
					class="aspect-square rounded-md object-cover"
					loading="lazy"
					@click="activePhotoIndex = i"
				>
			</div>

			<div v-if="activeMemory.tags.length" class="flex flex-wrap gap-2.5">
				<UBadge v-for="tag in activeMemory.tags" :key="tag" color="neutral" variant="soft" :label="`#${tag}`" />
			</div>
		</div>

		<div v-else class="rounded-xl border border-default p-6 text-center text-sm text-muted">
			Žádné vzpomínky k zobrazení.
		</div>
		<MemoryPhotoLightbox v-if="activeMemory" v-model="activePhotoIndex" :photos="activeMemory.photos" />

		<ModalsMemoryForm v-if="report && report.memories[activeIndex]" v-model="isEditing" :report-id="report.id" :memory-id="report.memories[activeIndex]!.id"  />
		<UModal v-model:open="isDeleteConfirmOpen" title="Smazat vzpomínku?" :ui="{ content: 'max-w-sm' }">
			<template #body>
				<div class="space-y-3">
					<p class="text-sm text-toned">Tato akce smaže vzpomínku včetně nahraných fotek. Pokračovat?</p>
					<UAlert v-if="deleteErrorMessage" color="error" variant="subtle" :title="deleteErrorMessage" />
				</div>
			</template>
			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton label="Zrušit" color="neutral" variant="ghost" :disabled="deleting" @click="closeDeleteConfirm" />
					<UButton label="Smazat" color="error" :loading="deleting" @click="confirmDelete" />
				</div>
			</template>
		</UModal>
	</div>
</template>