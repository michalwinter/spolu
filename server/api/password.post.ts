import { z } from 'zod'

const bodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200)
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Vyplňte všechny povinné údaje.' })
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await User.findById(session.user.id)
  if (!user) {
    throw createError({ statusCode: 404, message: 'Uživatel nenalezen.' })
  }

  const isValid = await verifyPassword(user.passwordHash, currentPassword)
  if (!isValid) {
    throw createError({ statusCode: 401, message: 'Neplatné aktuální heslo.' })
  }

  const newPasswordHash = await hashPassword(newPassword)
  user.passwordHash = newPasswordHash
  await user.save()

  return { ok: true }
});