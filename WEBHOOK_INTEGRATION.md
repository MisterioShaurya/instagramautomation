# Instagram Webhook Integration Guide

Complete backend implementation for receiving and processing Instagram comments and DMs using Meta's Graph API and Claude AI.

## Architecture Overview

The webhook system works as follows:

```
1. Instagram User Action
   ↓
2. Meta sends webhook event to POST /api/webhooks/instagram
   ↓
3. Signature Verification (X-Hub-Signature-256 header)
   ↓
4. Event Parsing (comment vs DM vs mention)
   ↓
5. User Lookup (by instagramPageId or instagramAccountId)
   ↓
6. Automation Matching (keywords, trigger types)
   ↓
7. Response Generation (static or Claude AI)
   ↓
8. Rate-Limited Queue (max 1 DM per 2 seconds)
   ↓
9. Send via Instagram Graph API
   ↓
10. Log Activity & Update Stats
```

## Setup Instructions

### 1. Meta App Configuration

#### Create Meta App
1. Go to [Meta Developers](https://developers.facebook.com)
2. Create a new app or use existing one
3. Add "Instagram" product
4. Get your **App ID** and **App Secret**

#### Configure Webhook
1. In App Settings → Messenger, set Webhook URL:
   ```
   https://yourdomain.com/api/webhooks/instagram
   ```

2. Generate and set Verify Token:
   ```bash
   openssl rand -base64 32
   ```

3. Subscribe to webhook fields:
   - `comments` - For post comments
   - `messages` - For Instagram DMs
   - `feed` - For mentions and other events

### 2. Environment Variables

Set in your production environment:

```env
# Meta App Credentials
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_VERIFY_TOKEN=your_verify_token

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Token Encryption
ENCRYPTION_KEY=base64_encoded_key

# MongoDB
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yourdomain.com
```

### 3. User Instagram Integration

When a user connects their Instagram account:

```typescript
const user = await User.findByIdAndUpdate(userId, {
  instagramPageId: 'facebook-page-id',      // For comments
  instagramAccountId: 'instagram-account-id', // For DMs
  instagramAccessToken: encryptToken(longLivedToken),
  instagramConnected: true,
  instagramAccessTokenEncrypted: true,
})
```

The Instagram access token **must be encrypted** before storage using `ENCRYPTION_KEY`.

## API Endpoints

### Webhook Verification
```
GET /api/webhooks/instagram
Params: hub.mode, hub.verify_token, hub.challenge
```

Used by Meta during webhook setup. Returns the challenge parameter if verify token matches.

### Receive Events
```
POST /api/webhooks/instagram
Header: X-Hub-Signature-256: sha256=<hmac_hash>
Body: Webhook event payload from Meta
```

Receives Instagram events. Signature is verified using `META_APP_SECRET`.

### Test Webhook
```
POST /api/webhooks/instagram/test
Body: { eventType: "comment", messageText: "LINK", recipientId: "ig-user-id" }
```

Test your automations without waiting for real Instagram events. Requires authentication.

## Event Processing Flow

### Comment Event Example

```json
{
  "entry": [{
    "id": "page_id",
    "changes": [{
      "field": "comments",
      "value": {
        "id": "comment_id",
        "text": "LINK",
        "from": { "id": "user_id", "name": "John" },
        "post_id": "post_id_12345"
      }
    }]
  }]
}
```

Processing steps:
1. Extract page ID from post_id
2. Find user by `instagramPageId`
3. Query automations with trigger `comment_keyword`
4. Match keywords (case-insensitive)
5. Generate response
6. Queue DM to sender
7. Log activity

### DM Event Example

```json
{
  "entry": [{
    "id": "business_account_id",
    "changes": [{
      "field": "messages",
      "value": {
        "id": "message_id",
        "text": "Hi, can you send me the product link?",
        "from": { "id": "sender_id" },
        "to": { "data": [{ "id": "business_account_id" }] }
      }
    }]
  }]
}
```

Processing steps:
1. Extract business account ID
2. Find user by `instagramAccountId`
3. Query automations with trigger `dm_keyword`
4. Match keywords
5. Generate response
6. Queue DM back to sender
7. Log activity

## Response Generation

### Static Response
```typescript
const automation = {
  responseType: 'static',
  responseContent: {
    message: 'Thanks for your interest! Check out our link below.',
    link: 'https://example.com/product'
  }
}
```

Response is sent as-is without AI generation.

### AI Response
```typescript
const automation = {
  responseType: 'ai',
  aiEnabled: true,
  aiTone: 'friendly',
  aiInstructions: 'You are a helpful brand representative...',
}
```

Claude generates a natural response based on:
- User's message content
- Brand instructions (system prompt)
- Tone preference
- Instagram best practices (concise, natural)

Claude model used: `claude-3-5-sonnet-20241022` (latest Sonnet)

## Rate Limiting

Maximum 1 DM per 2 seconds per Instagram account.

Implementation:
- In-memory queue when Redis unavailable
- Tracks last send time per user
- Exponential backoff on failures
- Max 3 retries per DM

Queue stats endpoint (development):
```
GET /api/webhooks/instagram/queue-stats
```

## Security Considerations

### Signature Verification
Every webhook event from Meta includes `X-Hub-Signature-256` header:

```
X-Hub-Signature-256: sha256=<hmac_hash>
```

Computed as:
```
hmac_hash = HMAC-SHA256(META_APP_SECRET, webhook_body)
```

We verify this signature before processing to ensure:
- Request came from Meta
- Body wasn't tampered with
- **Required for Meta app review**

### Token Encryption
Instagram access tokens are encrypted using `ENCRYPTION_KEY`:

```typescript
const encrypted = encryptToken(accessToken)     // Store in DB
const decrypted = decryptToken(encrypted)       // Use for API calls
```

Prevents token exposure if database is compromised.

### Rate Limiting
Prevents:
- Overwhelming user inboxes with auto-replies
- Triggering Instagram's abuse filters
- Excessive API quota usage

## Error Handling

### Rate Limit (429)
```
Status: 429 Too Many Requests
```
Retries automatically with exponential backoff.

### Authentication Error (401/403)
```
Status: 401 Unauthorized
```
Token may be expired. User needs to reconnect Instagram account.

### Not Found (404)
User or automation not found. Event is logged but not processed.

## Monitoring & Debugging

### Logs
All webhook processing is logged with `[webhook]` prefix:

```
[webhook] Verification request received
[webhook] Signature verification passed
[webhook] Processing comment event
[processor] Matched automation: Send Product Link
[instagram] Sending DM to: ig_user_123
[rate-limiter] DM sent successfully
```

### Activity Log
Database tracks all automation triggers and responses:

```typescript
ActivityLog.find({
  userId: user_id,
  type: { $in: ['trigger', 'response', 'error'] }
})
```

### Queue Stats (Development)
```bash
curl http://localhost:3000/api/webhooks/instagram/queue-stats
```

Returns pending DM count per user and timing info.

## Testing

### Local Testing with Test Endpoint

```bash
# Test comment automation
curl -X POST http://localhost:3000/api/webhooks/instagram/test \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_session_cookie>" \
  -d '{
    "eventType": "comment",
    "messageText": "LINK",
    "recipientId": "test_user_123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Webhook event processed successfully",
  "details": {
    "eventType": "comment",
    "messageText": "LINK",
    "recipientId": "test_user_123"
  }
}
```

### Testing with Meta Webhook Simulator

Meta provides a webhook tester in your app settings:

1. Go to App Settings → Messenger → Webhooks
2. Click "Test" button
3. Choose event type (comments or messages)
4. Review the request/response

## Production Deployment

### Checklist
- [ ] `META_APP_SECRET` set in production env
- [ ] `META_VERIFY_TOKEN` set in production env
- [ ] `ANTHROPIC_API_KEY` configured
- [ ] `ENCRYPTION_KEY` set (never share!)
- [ ] `MONGODB_URI` points to production database
- [ ] Webhook URL registered in Meta App Dashboard
- [ ] HTTPS enforced (Meta requires https://)
- [ ] Instagram business account connected to Meta app
- [ ] Long-lived access token obtained (valid for 60 days)
- [ ] Rate limiting tested under load

### Monitoring
- Monitor webhook endpoint latency
- Track automation trigger rates
- Watch for rate limit errors
- Monitor Claude API costs
- Check error logs for auth failures

### Token Refresh
Instagram access tokens expire after 60 days. Implement token refresh:

```typescript
// Run daily cron job
const { new_access_token } = await refreshInstagramToken(user.instagramAccessToken)
await User.updateOne(
  { _id: user._id },
  { instagramAccessToken: encryptToken(new_access_token) }
)
```

## Troubleshooting

### Webhook not receiving events
- Verify webhook URL is publicly accessible (https://)
- Check Meta App Dashboard for errors
- Ensure bot has necessary permissions
- Verify business account is connected

### "Invalid signature" errors
- Check `META_APP_SECRET` is set correctly
- Verify webhook URL matches Meta dashboard
- Ensure body hasn't been modified before verification

### No automations triggering
- Verify user's Instagram account is connected
- Check automation is set to `enabled: true` and `status: 'active'`
- Verify keywords match (case-insensitive partial match by default)
- Test with test endpoint

### DMs not sending
- Check Instagram access token is still valid
- Verify recipient ID is correct
- Monitor rate limiting queue
- Check Claude API key if using AI responses

### High latency
- MongoDB queries may be slow - add indexes
- Claude API requests take 1-3 seconds
- Implement response caching for common messages

## Advanced Features

### Custom Response Preview
Generate sample AI responses before creating automation:

```typescript
POST /api/automations/preview-response
Body: {
  sampleMessages: ["LINK", "How much?"],
  aiInstructions: "...",
  tone: "friendly"
}

Response: Array of generated responses
```

### Bulk Create Automations
```typescript
POST /api/automations/bulk-create
Body: Array<Automation>
```

### Export Activity Report
```typescript
GET /api/dashboard/activity-report?startDate=...&endDate=...
```

## Database Indexes

For optimal performance, create indexes:

```typescript
// User model
db.users.createIndex({ instagramPageId: 1 })
db.users.createIndex({ instagramAccountId: 1 })

// Automation model
db.automations.createIndex({ userId: 1, status: 1, 'trigger.type': 1 })
db.automations.createIndex({ 'stats.lastTriggeredAt': -1 })

// ActivityLog model
db.activitylogs.createIndex({ userId: 1, createdAt: -1 })
db.activitylogs.createIndex({ automationId: 1, type: 1 })
```

## References

- [Meta Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Webhook Documentation](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Claude API Reference](https://docs.anthropic.com)
