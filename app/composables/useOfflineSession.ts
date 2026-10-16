import { OFFLINE_USER_KEY, clearOfflineData } from './memoryOfflineStore'

type StoredUser = { id: string, username: string, name: string }

function readStoredUser(): StoredUser | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_USER_KEY) || 'null')
    if (parsed && typeof parsed.id === 'string' && typeof parsed.username === 'string' && typeof parsed.name === 'string') {
      return { id: parsed.id, username: parsed.username, name: parsed.name }
    }
  } catch {
    // Corrupted value is treated as missing.
  }

  return null
}

/**
 * The session lives in an httpOnly cookie that the client cannot read, so while the server is
 * unreachable the signed-in user is restored from a copy kept on the device. That copy exists
 * only between a confirmed login and a logout / confirmed session end.
 */
export function useOfflineSession() {
  const { session, loggedIn, user, fetch: fetchSession, clear } = useUserSession()

  function rememberUser() {
    if (!import.meta.client || !user.value) {
      return
    }

    const { id, username, name } = user.value
    localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify({ id, username, name }))
  }

  /** `session === null` means the server did not answer; an empty session means "not signed in". */
  function restoreOfflineUser() {
    if (!import.meta.client) {
      return false
    }

    if (loggedIn.value) {
      return true
    }

    if (session.value !== null) {
      return false
    }

    const stored = readStoredUser()
    if (!stored) {
      return false
    }

    session.value = { user: stored, loggedInAt: 0 }
    return true
  }

  /** Re-checks the session once the connection is back; ends the local session if the server rejects it. */
  async function revalidateSession() {
    await fetchSession()

    if (loggedIn.value) {
      rememberUser()
      return
    }

    if (session.value === null) {
      restoreOfflineUser()
      return
    }

    await clearOfflineData({ keepQueue: true })
    window.location.replace('/login')
  }

  /** Signs out on the server, then wipes every local copy and reloads to reset in-memory state. */
  async function logout() {
    await clear()
    await clearOfflineData()
    window.location.replace('/login')
  }

  return { rememberUser, restoreOfflineUser, revalidateSession, logout }
}
