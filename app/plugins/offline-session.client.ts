export default defineNuxtPlugin(() => {
  const { revalidateSession } = useOfflineSession()

  window.addEventListener('online', () => {
    void revalidateSession()
  })
})
