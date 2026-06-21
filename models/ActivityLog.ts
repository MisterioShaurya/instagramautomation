import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    automationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Automation',
    },
    type: {
      type: String,
      enum: ['trigger', 'response', 'error', 'config_change'],
      required: true,
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
)

export default mongoose.models.ActivityLog ||
  mongoose.model('ActivityLog', activityLogSchema)
