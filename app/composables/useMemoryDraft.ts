import {
  deleteMemoryDraft as deleteStoredMemoryDraft,
  putMemoryDraft,
  readMemoryDraft,
  type MemoryDraft
} from './memoryOfflineStore'
import { MAX_SHARED_PHOTOS } from './sharedPhotos'

export function useMemoryDraft() {
  const { user } = useUserSession()
  const draft = useState<MemoryDraft | null>('memory-draft', () => null)
  const loadedUserId = useState<string | null>('memory-draft-user-id', () => null)

  async function refreshDraft() {
    if (!import.meta.client) {
      return null
    }

    const userId = user.value?.id
    if (!userId) {
      draft.value = null
      loadedUserId.value = null
      return null
    }

    const storedDraft = await readMemoryDraft(userId)
    draft.value = storedDraft
    loadedUserId.value = userId
    return storedDraft
  }

  async function saveDraft(value: Omit<MemoryDraft, 'id' | 'userId' | 'updatedAt'>) {
    const userId = user.value?.id
    if (!import.meta.client || !userId) {
      throw new Error('Nelze uložit koncept bez přihlášeného uživatele.')
    }

    const storedDraft: MemoryDraft = {
      ...value,
      id: userId,
      userId,
      updatedAt: new Date().toISOString()
    }

    await putMemoryDraft(storedDraft)
    draft.value = storedDraft
    loadedUserId.value = userId
    return storedDraft
  }

  /**
   * Puts photos into the draft: appended to the current one, or into a fresh draft when
   * `replace` is set or none exists. Returns how many photos did not fit into the limit.
   */
  async function addPhotos(files: File[], options: { replace?: boolean, date?: Date | null } = {}) {
    const current = options.replace ? null : (draft.value ?? await refreshDraft())
    const existingPhotos = current?.photos ?? []
    const accepted = files.slice(0, Math.max(0, MAX_SHARED_PHOTOS - existingPhotos.length))
    const photos = [
      ...existingPhotos,
      ...accepted.map(file => ({ name: file.name, type: file.type, lastModified: file.lastModified, blob: file as Blob }))
    ]

    if (current) {
      await saveDraft({ ...current, photos })
    } else {
      const base = options.date ? new Date(options.date) : new Date()
      await saveDraft({
        dateISO: new Date(base.getFullYear(), base.getMonth(), base.getDate()).toISOString(),
        text: '',
        location: '',
        tags: [],
        photos
      })
    }

    return files.length - accepted.length
  }

  async function removeDraft() {
    const userId = user.value?.id
    if (!import.meta.client || !userId) {
      return
    }

    await deleteStoredMemoryDraft(userId)
    if (loadedUserId.value === userId || draft.value?.userId === userId) {
      draft.value = null
      loadedUserId.value = userId
    }
  }

  return { draft, refreshDraft, saveDraft, addPhotos, removeDraft }
}
