import { defineMongooseModel } from '#nuxt/mongoose'

export interface UserDocument {
  username: string
  passwordHash: string
  name: string
  color: string
}

export const User = defineMongooseModel<UserDocument>({
  name: 'User',
  schema: {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
  },
  options: {
    timestamps: true
  }
})