export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const { rememberUser, restoreOfflineUser } = useOfflineSession()

  if (loggedIn.value) {
    rememberUser()
  } else {
    restoreOfflineUser()
  }

  if (to.path === '/login') {
    return loggedIn.value ? navigateTo('/') : undefined
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
