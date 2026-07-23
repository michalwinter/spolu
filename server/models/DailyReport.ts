import { Schema } from 'mongoose'
import { defineMongooseModel } from '#nuxt/mongoose'

export interface MemoryPhotoDocument {
  filename: string
  thumbnailFilename: string
  originalName?: string
  mimeType: string
  size: number
  width?: number
  height?: number
  authorId: Schema.Types.ObjectId
}

export interface DailyMemoryDocument {
  time?: string
  text: string
  location?: string
  lat?: number
  lng?: number
  photos: MemoryPhotoDocument[]
  authorId: Schema.Types.ObjectId
  tags?: string[]
}

export interface DailyReportDocument {
  date: Date
  title?: string
  memories: DailyMemoryDocument[]
}

export const DailyReport = defineMongooseModel<DailyReportDocument>({
  name: 'DailyReport',
  schema: {
    date: {
      type: Date,
      required: true,
      unique: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150
    },
    memories: [
      {
        time: { type: String, trim: true },
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
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
        photos: [
          {
            filename: { type: String, required: true },
            thumbnailFilename: { type: String, required: true },
            originalName: { type: String },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
            width: { type: Number },
            height: { type: Number },
            authorId: {
              type: Schema.Types.ObjectId,
              ref: 'User',
              required: true
            }
          }
        ],
        authorId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        tags: [{ type: String, trim: true, lowercase: true }]
      }
    ]
  },
  options: {
    timestamps: true
  }
})
