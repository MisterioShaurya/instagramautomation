# Backend Development Guide

Complete guide for developing and testing the Instagram automation backend.

## Local Development Setup

### 1. Dependencies
All dependencies are already installed. Key packages:

- `@anthropic-ai/sdk` - Claude AI integration
- `mongoose` - MongoDB ODM with schema validation
- `next-auth` - User authentication
- `crypto-js` - Token encryption
- `bullmq` - Rate limiting queue (optional)

### 2. Environment Setup

Create `.env.local` with development values:

```env
# MongoDB (local or Atlas)
MONGODB_URI=mongodb://localhost:27017/dm-automation

# NextAuth
NEXTAUTH_SECRET=dev-secret-key
NEXTAUTH_URL=http://localhost:3000

# Meta Webhook (use any values for local testing)
META_APP_ID=dev_app_id
META_APP_SECRET=dev_app_secret
META_VERIFY_TOKEN=dev_verify_token

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Encryption
ENCRYPTION_KEY=dGVzdC1lbmNyeXB0aW9uLWtleQ==
```

### 3. Start Development Server

```bash
cd /vercel/share/project
pnpm dev
```

Server runs on http://localhost:3000

## Testing the Webhook System

### Option 1: Test Endpoint (Easiest)

No need for Meta setup. Test automations directly:

```bash
# 1. Create an automation in the dashboard
# - User signs up and creates automation with keyword "LINK"
# - Response: "Check out our product: https://example.com"

# 2. Test the automation
curl -X POST http://localhost:3000/api/webhooks/instagram/test \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_session_cookie>" \
  -d '{
    "eventType": "comment",
    "messageText": "LINK",
    "recipientId": "test_user_123"
  }'

# Response should show success
```

### Option 2: Simulate Webhook Events (Advanced)

Manually send webhook payloads to test signature verification:

```bash
#!/bin/bash

# Set variables
ENDPOINT="http://localhost:3000/api/webhooks/instagram"
APP_SECRET="dev_app_secret"
BODY='{"object":"instagram","entry":[{"id":"123","changes":[{"field":"messages","value":{"id":"msg_123","text":"LINK","from":{"id":"user_123"}}}]}]}'

# Calculate signature
SIGNATURE="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$APP_SECRET" -hex | awk '{print $2}')"

# Send request
curl -X POST "$ENDPOINT" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

## Code Structure

### `/lib/encryption.ts`
- `encryptToken(token)` - Encrypt Instagram access tokens
- `decryptToken(encryptedToken)` - Decrypt tokens for API use
- Token encryption happens automatically when storing to DB

### `/lib/webhook-processor.ts`
- `processWebhookEvent(context)` - Main webhook orchestrator
- Handles keyword matching, automation selection, response generation
- Queues DMs for sending with rate limiting

### `/lib/claude-integration.ts`
- `generateAIResponse(params)` - Generate reply using Claude
- Builds system prompt with brand instructions and tone
- Max 500 tokens per response to keep DMs concise

### `/lib/instagram-api.ts`
- `sendInstagramDM(recipientId, messageText, accessToken)` - Send actual DM
- `sendInstagramDMWithRetry()` - With exponential backoff
- Handles rate limiting (429) and auth failures (401/403)

### `/lib/rate-limiter.ts`
- `enqueueInstagramDM(params)` - Queue DM for sending
- `processDMQueue(userKey)` - Process queued DMs (max 1 per 2 seconds)
- In-memory queue - no external services needed for local dev

### `/app/api/webhooks/instagram/route.ts`
- `GET` - Webhook verification (Meta's setup flow)
- `POST` - Receive webhook events
- `handleCommentEvent()` - Process post comments
- `handleMessageEvent()` - Process DMs
- All requests signed with `X-Hub-Signature-256`

### `/app/api/webhooks/instagram/test/route.ts`
- `POST` - Test webhook events locally
- `GET` - View example payloads
- Requires authentication (users can only test their own automations)

## Database Models

### User Schema
```typescript
{
  email: String (unique),
  password: String (bcrypt hashed),
  name: String,
  instagramConnected: Boolean,
  instagramPageId: String,           // For comment webhooks
  instagramAccountId: String,        // For DM webhooks
  instagramAccessToken: String,      // Encrypted!
  instagramAccessTokenEncrypted: Boolean,
  webhookSecret: String,
  theme: 'light' | 'dark',
  timestamps: true
}
```

### Automation Schema
```typescript
{
  userId: ObjectId (ref: User),
  name: String,
  description: String,
  trigger: {
    type: 'comment_keyword' | 'dm_keyword' | 'story_mention' | 'post_mention',
    keywords: [String],
    matchType: 'exact' | 'contains' | 'starts_with'
  },
  responseType: 'static' | 'ai',
  responseContent: {
    message: String,
    link: String,
    qualifyingQuestions: [String]
  },
  aiEnabled: Boolean,
  aiTone: 'professional' | 'friendly' | 'casual' | 'formal',
  aiInstructions: String,
  enabled: Boolean,
  status: 'active' | 'paused' | 'inactive',
  stats: {
    triggersCount: Number,
    responsesCount: Number,
    engagementRate: Number,
    timesTriggered: Number,
    lastTriggeredAt: Date
  },
  timestamps: true
}
```

### ActivityLog Schema
```typescript
{
  userId: ObjectId,
  automationId: ObjectId,
  type: 'trigger' | 'response' | 'error' | 'config_change',
  description: String,
  metadata: Mixed,
  createdAt: Date
}
```

## Testing Workflows

### Test 1: Static Response

1. Sign up: http://localhost:3000/auth/signup
2. Go to Dashboard → Automations → New
3. Create automation:
   - Name: "Send Link"
   - Trigger: Comment keyword "LINK"
   - Response Type: Static
   - Message: "Check out our product: https://example.com"
4. Test:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/instagram/test \
     -H "Content-Type: application/json" \
     -H "Cookie: <session>" \
     -d '{"eventType":"comment","messageText":"LINK"}'
   ```

### Test 2: AI Response

1. Create automation:
   - Name: "Answer Questions"
   - Trigger: DM keyword "question"
   - Response Type: AI
   - System Prompt: "You are a knowledgeable brand representative. Answer briefly."
   - Tone: "friendly"
2. Test:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/instagram/test \
     -H "Content-Type: application/json" \
     -H "Cookie: <session>" \
     -d '{"eventType":"message","messageText":"What are your business hours?"}'
   ```

### Test 3: Keyword Matching

Create automations with different match types:

```typescript
// Exact: only matches exactly
{ keywords: ["LINK"], matchType: "exact" }

// Contains: matches if word appears anywhere
{ keywords: ["price"], matchType: "contains" }

// Starts with: matches if message starts with word
{ keywords: ["hi"], matchType: "starts_with" }
```

Test each with test endpoint.

### Test 4: Rate Limiting

Create multiple DM messages rapidly:

```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/webhooks/instagram/test \
    -H "Content-Type: application/json" \
    -H "Cookie: <session>" \
    -d "{\"eventType\":\"message\",\"messageText\":\"Test $i\"}"
done
```

Check logs - DMs should be queued, then sent at max 1 per 2 seconds.

## Debugging Tips

### Enable Verbose Logging

The system logs with prefixes:

- `[webhook]` - Webhook endpoint
- `[processor]` - Event processing
- `[encryption]` - Token encryption/decryption
- `[claude]` - Claude API calls
- `[instagram]` - Instagram API calls
- `[rate-limiter]` - Queue processing

### Check Activity Logs

View what happened during automation processing:

```typescript
// In MongoDB
db.activitylogs.find({ userId: "your_user_id" }).sort({ createdAt: -1 })
```

### Monitor Queue (Development)

```bash
curl http://localhost:3000/api/webhooks/instagram/queue-stats
```

Returns pending DM count and timing info per user.

### Test Claude Integration

Directly test Claude response generation:

```typescript
import { generateAIResponse } from '@/lib/claude-integration'

const response = await generateAIResponse({
  userMessage: "Can you help me?",
  systemPrompt: "You are a helpful representative.",
  tone: "friendly"
})

console.log(response)
```

### Test Encryption

```typescript
import { encryptToken, decryptToken } from '@/lib/encryption'

const token = "sk-instagram-token-123"
const encrypted = encryptToken(token)
const decrypted = decryptToken(encrypted)

console.log(token === decrypted) // Should be true
```

## Common Issues

### "ANTHROPIC_API_KEY not configured"

Make sure Claude API key is set:

```bash
echo $ANTHROPIC_API_KEY
```

Get key from https://console.anthropic.com

### "Invalid signature" when testing

The test endpoint doesn't verify signatures. If you're manually sending webhook payloads:

```bash
# Make sure APP_SECRET matches META_APP_SECRET in .env.local
openssl dgst -sha256 -hmac "META_APP_SECRET" -hex webhook_body.json
```

### MongoDB connection timeout

```bash
# Check MongoDB is running
mongo --version

# Start MongoDB locally
mongod

# Or use MongoDB Atlas connection string
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dm-automation
```

### Rate limiting queue not processing

Check logs for `[rate-limiter]` messages. Queue processes asynchronously:

```typescript
// Queue is processed in background
// Check with:
curl http://localhost:3000/api/webhooks/instagram/queue-stats

// Should show: { "userId": { queuedCount: X, lastSendTime: ..., ... } }
```

## Performance Optimization

### MongoDB Indexes

Add indexes for faster queries:

```javascript
// User lookup by Instagram ID
db.users.createIndex({ instagramPageId: 1 })
db.users.createIndex({ instagramAccountId: 1 })

// Automation matching
db.automations.createIndex({ userId: 1, status: 1, 'trigger.type': 1 })

// Activity log queries
db.activitylogs.createIndex({ userId: 1, createdAt: -1 })
```

### Caching

Consider caching for repeated queries:

```typescript
// Cache user automations for 5 minutes
const cacheKey = `automations-${userId}`
let automations = cache.get(cacheKey)

if (!automations) {
  automations = await Automation.find({ userId })
  cache.set(cacheKey, automations, 300000) // 5 minutes
}
```

### Batch Processing

Process multiple events more efficiently:

```typescript
// Instead of individual MongoDB queries per event
// Batch queries when processing queue
const automations = await Automation.find({ 
  userId: { $in: [userId1, userId2, userId3] }
})
```

## Next Steps

1. Test static automations work end-to-end
2. Test AI response generation with Claude
3. Test rate limiting with multiple rapid events
4. Test keyword matching variations
5. Set up production Meta app and webhooks
6. Deploy to production and monitor

See WEBHOOK_INTEGRATION.md for production setup.
