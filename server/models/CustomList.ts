import { Schema } from 'mongoose'
import { defineMongooseModel } from '#nuxt/mongoose'

export interface CustomListItemDocument {
  title: string
  done: boolean
  addedBy: Schema.Types.ObjectId
  linkedReportId?: Schema.Types.ObjectId
}

export interface CustomListDocument {
  title: string
  description?: string
  icon?: string
  themeColor?: string
  authorId: Schema.Types.ObjectId
  items: CustomListItemDocument[]
}

export const CustomList = defineMongooseModel<CustomListDocument>({
  name: 'CustomList',
  schema: {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    icon: {
      type: String,
      default: 'ph:list-bullets',
      trim: true
    },
    themeColor: {
      type: String,
      default: 'slate',
      trim: true
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: 200
        },
        done: {
          type: Boolean,
          default: false
        },
        addedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        linkedReportId: {
          // Upraveno přímo na tvůj model DailyReport
          type: Schema.Types.ObjectId,
          ref: 'DailyReport'
        }
      }
    ]
  },
  options: {
    timestamps: true
  }
})