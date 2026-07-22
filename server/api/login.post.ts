import { z } from 'zod'

const bodySchema = z.object({
  username: z.string().trim().min(1).max(100).transform(v => v.toLowerCase()),
  password: z.string().min(1).max(200)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Vyplň prosím uživatelské jméno a heslo.' })
  }

  const { username, password } = parsed.data

  const genericError = createError({ statusCode: 401, message: 'Neplatné přihlašovací údaje.' })

  const user = await User.findOne({ username })
  if (!user) {
    throw genericError
  }

  const isValid = await verifyPassword(user.passwordHash, password)
  if (!isValid) {
    throw genericError
  }

  await setUserSession(event, {
    user: {
      id: user._id.toString(),
      username: user.username,
      name: user.name
    },
    loggedInAt: Date.now()
  })

  return { ok: true }
})
