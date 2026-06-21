import mongoose from 'mongoose'

const automationRuleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    instagramUserId: {
      type: String,
      default: '',
    },
    mediaId: {
      type: String,
      required: true,
      index: true,
    },
    mediaThumbnail: {
      type: String,
      default: '',
    },
    keyword: {
      type: String,
      required: true,
      trim: true,
    },
    matchType: {
      type: String,
      enum: ['exact', 'contains'],
      default: 'contains',
    },
    dmMessage: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// Compound index for efficient queries per media item per user
automationRuleSchema.index({ userId: 1, mediaId: 1 })

export default mongoose.models.AutomationRule ||
  mongoose.model('AutomationRule', automationRuleSchema)