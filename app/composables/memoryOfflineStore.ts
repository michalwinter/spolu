import type { SerializedDailyReport } from '~~/server/utils/serialize'
import { clearPhotoCaches } from './memoryPhotoCache'

export type QueuedPhoto = {
  name: string
  type: string
  lastModified: number
  blob: Blob
}

export type QueuedCreatePayload = {
  dateISO: string
  time?: string
  text: string
  location?: string
  lat?: number
  lng?: number
  tags?: string[]
  removePhotoIds?: string[]
  photos: QueuedPhoto[]
}

export type QueuedCreateItem = {
  id: string
  userId?: string
  createdAt: string
  payload: QueuedCreatePayload
  attempts: number
  lastError?: string
}

export type MemoryDraftPhoto = {
  name: string
  type: string
  lastModified: number
  blob: Blob
}

export type MemoryDraft = {
  id: string
  userId: string
  updatedAt: string
  dateISO: string
  time?: string
  text: string
  location: string
  lat?: number
  lng?: number
  tags: string[]
  photos: MemoryDraftPhoto[]
}

export const OFFLINE_USER_KEY = 'spolu:offline-user'

const DB_NAME = 'spolu-offline'
const DB_VERSION = 3
const REPORTS_STORE = 'reports'
const CREATE_QUEUE_STORE = 'createQueue'
const MEMORY_DRAFTS_STORE = 'memoryDrafts'

function hasIndexedDb() {
  return import.meta.client && typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is not available'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(REPORTS_STORE)) {
        db.createObjectStore(REPORTS_STORE, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(CREATE_QUEUE_STORE)) {
        db.createObjectStore(CREATE_QUEUE_STORE, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(MEMORY_DRAFTS_STORE)) {
        db.createObjectStore(MEMORY_DRAFTS_STORE, { keyPath: 'id' })
      }

      // Replaced by the per-report store.
      if (db.objectStoreNames.contains('kv')) {
        db.deleteObjectStore('kv')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

async function transact<T>(
  stores: string | string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openDb()

  try {
    const tx = db.transaction(stores, mode)
    const completed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
    })

    const result = await work(tx)
    await completed
    return result
  } finally {
    db.close()
  }
}

export function readCachedReports() {
  if (!hasIndexedDb()) {
    return Promise.resolve([] as SerializedDailyReport[])
  }

  return transact(REPORTS_STORE, 'readonly', tx =>
    promisify(tx.objectStore(REPORTS_STORE).getAll() as IDBRequest<SerializedDailyReport[]>)
  )
}

export async function putCachedReports(reports: SerializedDailyReport[]) {
  if (!hasIndexedDb() || !reports.length) {
    return
  }

  await transact(REPORTS_STORE, 'readwrite', (tx) => {
    const store = tx.objectStore(REPORTS_STORE)
    for (const report of reports) {
      store.put(JSON.parse(JSON.stringify(report)))
    }
  })
}

/** Replaces the whole offline copy so reports deleted on the server disappear too. */
export async function replaceCachedReports(reports: SerializedDailyReport[]) {
  if (!hasIndexedDb()) {
    return
  }

  await transact(REPORTS_STORE, 'readwrite', (tx) => {
    const store = tx.objectStore(REPORTS_STORE)
    store.clear()
    for (const report of reports) {
      store.put(JSON.parse(JSON.stringify(report)))
    }
  })
}

export async function deleteCachedReport(id: string) {
  if (!hasIndexedDb()) {
    return
  }

  await transact(REPORTS_STORE, 'readwrite', (tx) => {
    tx.objectStore(REPORTS_STORE).delete(id)
  })
}

/** Returns queued creates that belong to the given user (or are not owned by anyone). */
export async function listQueuedCreates(userId?: string) {
  if (!hasIndexedDb()) {
    return [] as QueuedCreateItem[]
  }

  const items = await transact(CREATE_QUEUE_STORE, 'readonly', tx =>
    promisify(tx.objectStore(CREATE_QUEUE_STORE).getAll() as IDBRequest<QueuedCreateItem[]>)
  )

  return items
    .filter(item => !item.userId || !userId || item.userId === userId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export async function enqueueCreate(payload: QueuedCreatePayload, userId?: string, id?: string) {
  if (!hasIndexedDb()) {
    throw new Error('IndexedDB is not available')
  }

  const item: QueuedCreateItem = {
    id: id ?? crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    payload,
    attempts: 0,
  }

  await transact(CREATE_QUEUE_STORE, 'readwrite', (tx) => {
    tx.objectStore(CREATE_QUEUE_STORE).put(item)
  })

  return item
}

export async function updateQueuedCreate(item: QueuedCreateItem) {
  if (!hasIndexedDb()) {
    return
  }

  await transact(CREATE_QUEUE_STORE, 'readwrite', (tx) => {
    tx.objectStore(CREATE_QUEUE_STORE).put(item)
  })
}

export async function removeQueuedCreate(id: string) {
  if (!hasIndexedDb()) {
    return
  }

  await transact(CREATE_QUEUE_STORE, 'readwrite', (tx) => {
    tx.objectStore(CREATE_QUEUE_STORE).delete(id)
  })
}

export async function readMemoryDraft(userId: string) {
  if (!hasIndexedDb()) {
    return null
  }

  return transact(MEMORY_DRAFTS_STORE, 'readonly', tx =>
    promisify(tx.objectStore(MEMORY_DRAFTS_STORE).get(userId) as IDBRequest<MemoryDraft | undefined>)
  ).then(draft => draft?.userId === userId ? draft : null)
}

export async function putMemoryDraft(draft: MemoryDraft) {
  if (!hasIndexedDb()) {
    throw new Error('IndexedDB is not available')
  }

  await transact(MEMORY_DRAFTS_STORE, 'readwrite', (tx) => {
    tx.objectStore(MEMORY_DRAFTS_STORE).put(draft)
  })
}

export async function deleteMemoryDraft(userId: string) {
  if (!hasIndexedDb()) {
    return
  }

  await transact(MEMORY_DRAFTS_STORE, 'readwrite', (tx) => {
    tx.objectStore(MEMORY_DRAFTS_STORE).delete(userId)
  })
}

/**
 * Removes every locally stored copy of private data: memories, photos and the remembered
 * user. The queue of unsent memories is kept only when `keepQueue` is set.
 */
export async function clearOfflineData(options: { keepQueue?: boolean } = {}) {
  if (!import.meta.client) {
    return
  }

  localStorage.removeItem(OFFLINE_USER_KEY)

  const tasks: Promise<unknown>[] = [clearPhotoCaches()]

  if (hasIndexedDb()) {
    const stores = options.keepQueue
      ? [REPORTS_STORE, MEMORY_DRAFTS_STORE]
      : [REPORTS_STORE, CREATE_QUEUE_STORE, MEMORY_DRAFTS_STORE]
    tasks.push(transact(stores, 'readwrite', (tx) => {
      for (const name of stores) {
        tx.objectStore(name).clear()
      }
    }))
  }

  await Promise.allSettled(tasks)
}
