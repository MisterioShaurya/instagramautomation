import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      sparse: true, // allow null/undefined for Instagram-only users
      default: null,
    },
    password: {
      type: String,
      default: null,
    },
    name: String,
    // Instagram OAuth fields
    instagramUserId: {
      type: String,
      unique: true,
      sparse: true,
    },
    username: String,
    profilePictureUrl: String,
    instagramHandle: String,
    instagramConnected: {
      type: Boolean,
      default: false,
    },
    // Instagram Page-level fields for webhook processing
    instagramPageId: String, // Facebook Page ID (needed for webhooks)
    instagramAccountId: String, // Instagram Business Account ID (used to match incoming webhooks)
    instagramAccessToken: {
      type: String, // Encrypted before storage
      default: null,
    },
    // Meta App credentials for webhook verification
    instagramAccessTokenEncrypted: Boolean, // Flag to indicate token is encrypted
    metaAppId: String, // For future webhook signature verification per user
    tokenExpiresAt: Date, // When the long-lived token expires
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark',
    },
    webhookSecret: {
      type: String,
      default: null,
      // Custom secret for this user's webhook verification
      // Falls back to META_VERIFY_TOKEN env var if not set
    },
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model('User', userSchema)