import mongoose from 'mongoose'

/**
 * Deduplication collection: tracks which comments have already received an automated reply.
 * This ensures we never send more than one DM per comment.
 */
const sentReplySchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationRule',
      required: true,
      index: true,
    },
    commentId: {
      type: String,
      required: true,
      index: true,
    },
    commenterId: {
      type: String,
      required: true,
    },
    replyType: {
      type: String,
      enum: ['comment', 'dm', 'both'],
      default: 'dm',
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
)

// Prevent duplicate entries for the same comment + rule combination
sentReplySchema.index({ commentId: 1, ruleId: 1 }, { unique: true })

export default mongoose.models.SentReply ||
  mongoose.model('SentReply', sentReplySchema)