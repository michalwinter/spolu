import {
  deleteMemoryDraft as deleteStoredMemoryDraft,
  putMemoryDraft,
  readMemoryDraft,
  type MemoryDraft
} from './memoryOfflineStore'

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

  return { draft, refreshDraft, saveDraft, removeDraft }
}
