import mongoose from 'mongoose'

/**
 * Stores comments fetched from Instagram Graph API for a specific media (reel).
 * This allows us to cache comments and track which ones we've processed.
 */
const fetchedCommentSchema = new mongoose.Schema(
  {
    mediaId: {
      type: String,
      required: true,
      index: true,
    },
    commentId: {
      type: String,
      required: true,
      unique: true,
    },
    text: {
      type: String,
      default: '',
    },
    username: {
      type: String,
      default: '',
    },
    userId: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
)

fetchedCommentSchema.index({ mediaId: 1, commentId: 1 }, { unique: true })

export default mongoose.models.FetchedComment ||
  mongoose.model('FetchedComment', fetchedCommentSchema)