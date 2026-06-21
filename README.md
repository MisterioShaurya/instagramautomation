# DM Automation SaaS - Complete Platform

A full-stack AI-powered SaaS platform for automating Instagram DM responses. Features a stunning landing page, complete authentication system, and powerful dashboard for managing automations.

## Features

### Landing Page
- ✨ **Hero Section** - Bold headline with dual CTA buttons
- 📚 **How It Works** - 3-step process visualization
- 🎯 **Features Grid** - 6 automation capabilities
- 📊 **Comparison Table** - vs ManyChat competitive analysis
- 📧 **Waitlist Form** - Email capture with success state
- 🌙 **Dark Mode** - Beautiful dark-first design

### Authenticated Dashboard
- 🔐 **User Authentication** - Email/password auth with NextAuth.js
- 📊 **Dashboard Home** - Real-time stats and quick actions
- ⚙️ **Automation Builder** - 4-step form for creating automations
- 📋 **Automations List** - Manage all automations with toggle/delete
- 📈 **Analytics** - Performance tracking and insights
- ⚙️ **Settings** - Account, Instagram integration, preferences
- 🎨 **Responsive Design** - Works perfectly on mobile and desktop

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Styling**: Tailwind CSS v4 with custom color system
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with Credentials provider
- **Validation**: Zod for schema validation
- **Icons**: Lucide React icons
- **State Management**: React hooks and server components

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# MongoDB Connection (required for persistence)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dm-automation

# NextAuth Configuration (required for auth)
NEXTAUTH_SECRET=your-secret-key  # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Optional: Instagram API (future integration)
INSTAGRAM_API_KEY=
INSTAGRAM_API_SECRET=
```

### 3. Run Development Server
```bash
pnpm dev
```

Access the app:
- Landing Page: http://localhost:3000
- Login: http://localhost:3000/auth/login
- Signup: http://localhost:3000/auth/signup
- Dashboard: http://localhost:3000/dashboard (requires login)

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js route (signin, signout, callback)

### Waitlist (Landing Page)
- `POST /api/waitlist` - Add email to waitlist
  - Validates email with Zod
  - Returns success with generated ID
  - Works in demo mode without MongoDB

### Automations
- `GET /api/automations` - Get user's automations
- `POST /api/automations` - Create new automation
- `GET /api/automations/[id]` - Get single automation
- `PUT /api/automations/[id]` - Update automation
- `DELETE /api/automations/[id]` - Delete automation

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
  - Returns: totalAutomations, activeAutomations, totalTriggers, totalResponses, engagementRate, recentActivity

### Example: Create Automation
```bash
POST /api/automations
Content-Type: application/json

{
  "name": "Send Product Link",
  "description": "Auto-reply with product link",
  "trigger": {
    "type": "comment_keyword",
    "keywords": ["LINK", "PRODUCT"],
    "matchType": "contains"
  },
  "response": "send_link",
  "responseContent": {
    "message": "Check out our product!",
    "link": "https://example.com/product"
  },
  "aiEnabled": true,
  "aiTone": "friendly"
}
```

## MongoDB Setup

### Local Development
```bash
# Start MongoDB locally
mongod

# Add to .env.local:
MONGODB_URI=mongodb://localhost:27017/dm-automation
```

### Production (MongoDB Atlas)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Add to `.env.local`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dm-automation
```

## Database Collections

### Users
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (bcrypt hashed),
  name: String,
  instagramHandle: String,
  instagramConnected: Boolean,
  instagramAccessToken: String,
  theme: String, // 'light' | 'dark'
  createdAt: Date,
  updatedAt: Date
}
```

### Automations
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String,
  description: String,
  trigger: {
    type: String, // 'comment_keyword' | 'dm_keyword' | 'story_mention' | 'post_mention'
    keywords: [String],
    matchType: String // 'exact' | 'contains' | 'starts_with'
  },
  response: String, // 'auto_reply' | 'send_link' | 'qualify_lead' | 'custom_message'
  responseContent: {
    message: String,
    link: String,
    qualifyingQuestions: [String]
  },
  aiEnabled: Boolean,
  aiTone: String, // 'professional' | 'friendly' | 'casual' | 'formal'
  enabled: Boolean,
  stats: {
    triggersCount: Number,
    responsesCount: Number,
    engagementRate: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### ActivityLog
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  automationId: ObjectId (ref: Automation),
  type: String, // 'trigger' | 'response' | 'error' | 'config_change'
  description: String,
  metadata: Mixed,
  createdAt: Date
}
```

### WaitlistEmails
```javascript
{
  _id: ObjectId,
  email: String (unique),
  created_at: Date
}
```

## Authentication

### Sign Up / Sign In
- Email/password based with NextAuth.js
- Passwords hashed with bcryptjs (10 rounds)
- Sessions managed securely
- Credentials provider handles auth logic
- First-time users automatically create account

### Protected Routes
All dashboard routes require authentication:
- Unauthenticated users redirected to `/auth/login`
- Callback URL preserves original destination
- Session checked server-side via `getServerSession()`

### Key Files
- `/lib/auth.ts` - NextAuth configuration
- `/models/User.ts` - User schema with password hashing
- `/app/api/auth/[...nextauth]/route.ts` - Auth handler
- `/app/auth/login/page.tsx` - Login form
- `/app/auth/signup/page.tsx` - Signup form

## Dashboard Features

### Automation Builder (4 Steps)
1. **Basic Info** - Name and description
2. **Triggers** - Define keywords and trigger type
3. **Response** - Configure what the automation responds with
4. **AI Settings** - Enable AI and set tone

### Automations Management
- List all user automations
- Toggle on/off without deletion
- Edit automation details
- Delete with confirmation
- View performance metrics per automation

### Analytics & Stats
- Real-time statistics dashboard
- Total automations and active count
- Trigger and response metrics
- Engagement rate calculation
- Activity log display

### Settings
- Account information display
- Instagram account connection (UI ready)
- Email notification preferences
- Billing/plan information
- Account deletion option (UI ready)

## Design System

### Color Palette
- **Background**: `oklch(0.1 0 0)` - Dark base
- **Foreground**: `oklch(0.95 0 0)` - Light text
- **Accent**: `oklch(0.65 0.21 200)` - Bright cyan
- **Secondary**: `oklch(0.15-0.25 0 0)` - Card backgrounds
- **Muted**: `oklch(0.65 0 0)` - Secondary text
- **Border**: `oklch(1 0 0 / 10%)` - Subtle dividers

### Typography
- **Font**: Geist (system font) for all text
- **Line Height**: 1.4-1.6 for readability
- **Semantic**: Large headings, balanced hierarchy

## Customization

### Update Landing Page Copy
- `/components/hero.tsx` - Main headline
- `/components/features.tsx` - Feature descriptions
- `/components/comparison.tsx` - Comparison content

### Modify Dashboard Layout
- `/components/dashboard/sidebar.tsx` - Navigation items
- `/app/dashboard/page.tsx` - Home page widgets
- `/components/dashboard/stats-cards.tsx` - Metrics display

### Change Theme
Edit `/app/globals.css`:
```css
--accent: oklch(0.65 0.21 200);  /* Current: Cyan */
--foreground: oklch(0.95 0 0);
--background: oklch(0.1 0 0);
```

## Deployment

### Vercel (Recommended)
```bash
# Connect GitHub repository
git push origin main

# Set environment variables in Vercel Dashboard:
# - MONGODB_URI
# - NEXTAUTH_SECRET (openssl rand -base64 32)
# - NEXTAUTH_URL (your production domain)
```

### Self-Hosted
```bash
# Build
pnpm build

# Set environment variables
export MONGODB_URI=your_mongodb_uri
export NEXTAUTH_SECRET=your_secret
export NEXTAUTH_URL=https://yourdomain.com

# Start
pnpm start
```

## Security Best Practices

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ Sessions managed securely by NextAuth.js
- ✅ CSRF protection via NextAuth
- ✅ API routes protected with `getServerSession()`
- ✅ Sensitive data in environment variables
- ✅ SQL injection prevented via Mongoose
- ✅ Input validation with Zod schemas

## Performance

- Server-side rendering for landing page
- Client-side hydration for dashboard
- Optimized database queries with Mongoose indexes
- CSS minification and bundling
- Image optimization with Next.js
- Lazy loading of dashboard components

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing Authentication

### Test Credentials
You can create test accounts through the signup form. Try:
- Email: `test@example.com`
- Password: `password123`

### Demo Flow
1. Visit http://localhost:3000
2. Scroll to waitlist form and test email signup
3. Click "Create Automation" to visit dashboard
4. Use signup form to create test account
5. Login and explore automations dashboard

## Troubleshooting

### Issue: "NEXTAUTH_SECRET not configured"
```bash
# Generate a secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET=your_generated_secret
```

### Issue: MongoDB Connection Failed
- Verify MONGODB_URI in .env.local
- Check network connectivity to MongoDB
- Ensure IP whitelist on MongoDB Atlas (add 0.0.0.0/0 for dev)

### Issue: Session Not Persisting
- Clear cookies in browser
- Verify NEXTAUTH_URL matches domain
- Check NextAuth debug logs: `NODE_DEBUG=next-auth pnpm dev`

---

Built with Next.js 16, MongoDB, and NextAuth.js
