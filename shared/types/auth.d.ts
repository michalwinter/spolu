declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    name: string
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
