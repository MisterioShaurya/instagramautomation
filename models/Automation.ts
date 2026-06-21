import mongoose from 'mongoose'

const automationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    trigger: {
      type: {
        type: String,
        enum: ['comment_keyword', 'dm_keyword', 'story_mention', 'post_mention'],
      },
      keywords: [String],
      matchType: {
        type: String,
        enum: ['exact', 'contains', 'starts_with'],
        default: 'contains',
      },
    },
    // Response configuration - determines how the automation replies
    responseType: {
      type: String,
      enum: ['static', 'ai'],
      default: 'static',
      // 'static' = use responseContent.message directly
      // 'ai' = generate reply using Claude API
    },
    responseContent: {
      message: String, // Used for static responses
      link: String, // Optional link to include
      qualifyingQuestions: [String],
    },
    // AI-specific configuration
    aiEnabled: {
      type: Boolean,
      default: false,
    },
    aiTone: {
      type: String,
      enum: ['professional', 'friendly', 'casual', 'formal'],
      default: 'professional',
    },
    aiInstructions: {
      type: String,
      // System prompt for Claude: "You are a brand representative for..."
      default: 'You are a helpful brand representative. Reply naturally and helpfully.',
    },
    // Automation status
    enabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'inactive'],
      default: 'active',
    },
    // Statistics and tracking
    stats: {
      triggersCount: { type: Number, default: 0 },
      responsesCount: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      timesTriggered: { type: Number, default: 0 },
      lastTriggeredAt: Date,
    },
  },
  { timestamps: true }
)

export default mongoose.models.Automation ||
  mongoose.model('Automation', automationSchema)
