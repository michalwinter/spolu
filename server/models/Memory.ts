import { Schema } from 'mongoose'
import { defineMongooseModel } from '#nuxt/mongoose'

export interface OldMemoryPhotoDocument {
  filename: string
  thumbnailFilename: string
  originalName?: string
  mimeType: string
  size: number
  width?: number
  height?: number
}

export interface MemoryDocument {
  date: Date
  text: string
  location?: string
  lat?: number
  lng?: number
  photos: OldMemoryPhotoDocument[]
  authorId: Schema.Types.ObjectId
}

export const Memory = defineMongooseModel<MemoryDocument>({
  name: 'Memory',
  schema: {
    date: {
      type: Date,
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200
    },
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    },
    photos: [
      {
        filename: { type: String, required: true },
        thumbnailFilename: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        width: { type: Number },
        height: { type: Number }
      }
    ],
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  options: {
    timestamps: true
  }
})
