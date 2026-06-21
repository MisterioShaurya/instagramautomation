# Deployment Guide - DM Automation SaaS

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB Atlas cluster created (if using cloud)
- [ ] NEXTAUTH_SECRET generated with `openssl rand -base64 32`
- [ ] All tests passing locally
- [ ] Code pushed to GitHub
- [ ] Project committed to version control

## Vercel Deployment (Recommended)

Vercel is the optimal platform for Next.js applications.

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit: DM Automation SaaS"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select your GitHub repository
4. Click "Import"

### Step 3: Add Environment Variables

In the Vercel dashboard:

1. Go to Settings → Environment Variables
2. Add the following variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dm-automation
NEXTAUTH_SECRET=<your-generated-secret-key>
NEXTAUTH_URL=https://your-domain.vercel.app
```

**Important**: 
- Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`
- Use your actual MongoDB Atlas connection string
- For `NEXTAUTH_URL`, use your final production domain

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Your app is live!

### Step 5: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` environment variable to your custom domain

## MongoDB Atlas Setup

### Create a MongoDB Cluster

1. Sign up at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a new project
3. Create a cluster (free tier available)
4. Click "Connect" and select "Drivers"
5. Copy the connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/dm-automation?retryWrites=true&w=majority
   ```

### Configure Network Access

1. Go to Security → Network Access
2. Add IP Address: `0.0.0.0/0` (allows all IPs, only for dev/test)
   - **For production**: Add specific Vercel IP ranges
3. Click "Confirm"

### Create Database User

1. Go to Security → Database Access
2. Click "Create Database User"
3. Generate username/password
4. Copy to your connection string

## Self-Hosted Deployment

### Option 1: AWS EC2

```bash
# 1. SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-instance-ip

# 2. Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# 3. Install pnpm
npm install -g pnpm

# 4. Clone repository
git clone https://github.com/yourusername/dm-automation.git
cd dm-automation

# 5. Install dependencies
pnpm install

# 6. Create .env.production
cat > .env.production << EOF
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dm-automation
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
EOF

# 7. Build and start
pnpm build
pnpm start

# 8. Use PM2 for process management
npm install -g pm2
pm2 start "pnpm start" --name "dm-automation"
pm2 save
```

### Option 2: DigitalOcean App Platform

1. Go to [digitalocean.com/app-platform](https://digitalocean.com/app-platform)
2. Click "Launch App"
3. Select your GitHub repository
4. Configure:
   - Framework: Node.js
   - Build: `pnpm install && pnpm build`
   - Start: `pnpm start`
5. Add environment variables
6. Click "Deploy"

### Option 3: Heroku

```bash
# 1. Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# 2. Login
heroku login

# 3. Create app
heroku create dm-automation

# 4. Add MongoDB Atlas URI
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set NEXTAUTH_SECRET=your-secret
heroku config:set NEXTAUTH_URL=https://dm-automation.herokuapp.com

# 5. Deploy
git push heroku main

# 6. Check logs
heroku logs --tail
```

## Environment Variables

### Development (.env.local)
```
MONGODB_URI=mongodb://localhost:27017/dm-automation
NEXTAUTH_SECRET=dev-secret-key-only-for-development
NEXTAUTH_URL=http://localhost:3000
```

### Production (.env.production)
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dm-automation
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
```

## Performance Optimization

### Build Optimization
```bash
# Enable React Compiler (Next.js 16)
# In next.config.mjs:
const nextConfig = {
  reactCompiler: true,
};
```

### Database Optimization
- Add indexes to frequently queried fields
- MongoDB Atlas provides performance insights
- Monitor slow queries in cloud console

### Caching Strategy
- Use Vercel's Edge Cache for static assets
- Implement SWR for client-side data fetching
- Set appropriate Cache-Control headers

## Monitoring & Logging

### Vercel Analytics
1. Enable Analytics in Vercel dashboard
2. Track Web Vitals: LCP, FID, CLS
3. Monitor API usage and performance

### MongoDB Monitoring
1. Check MongoDB Atlas cluster metrics
2. Monitor storage usage
3. Set up alerts for high CPU/memory

### Error Tracking
```javascript
// Add error tracking (optional)
// Example: Sentry
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## Scaling Considerations

### Horizontal Scaling
- Next.js handles multiple instances
- Use sticky sessions for authentication
- Scale MongoDB separately if needed

### Database Scaling
- MongoDB Atlas handles auto-scaling
- Use connection pooling
- Archive old activity logs periodically

### CDN & Caching
- Vercel provides built-in CDN
- Cache static assets aggressively
- Use incremental static regeneration (ISR)

## Security Checklist

- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] NEXTAUTH_URL matches production domain
- [ ] MONGODB_URI credentials rotated
- [ ] Database IP whitelist restricted
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Environment variables not committed to git
- [ ] Database backups enabled
- [ ] Regular security updates applied
- [ ] Rate limiting implemented (optional)
- [ ] CORS configured correctly

## Troubleshooting

### Build Fails on Vercel
```
Error: Cannot find module 'X'
```
Solution:
- Clear Vercel cache: Settings → General → Clear Build Cache
- Verify all dependencies in package.json
- Check node version compatibility

### Database Connection Issues
```
Error: connect ECONNREFUSED
```
Solution:
- Verify MONGODB_URI is correct
- Check network access in MongoDB Atlas
- Ensure MongoDB cluster is running
- Test connection locally first

### Session Issues
```
Error: SessionProvider not found
```
Solution:
- Verify SessionProvider in layout.tsx
- Clear browser cookies
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches domain

### Slow Page Loads
Solution:
- Check Core Web Vitals in Vercel Analytics
- Optimize images with next/image
- Use dynamic imports for large components
- Enable caching headers

## Maintenance

### Weekly
- Monitor error logs
- Check database performance
- Review user feedback

### Monthly
- Rotate credentials
- Update dependencies: `pnpm update`
- Review security advisories: `pnpm audit`
- Clean up old activity logs

### Quarterly
- Security audit
- Performance optimization review
- Database optimization analysis
- Team training updates

## Rollback Procedure

### Vercel Rollback
1. Go to Deployments section
2. Find previous working deployment
3. Click "..." and select "Promote to Production"
4. Previous version is now live

### Database Rollback
- MongoDB Atlas provides automated backups
- Can restore from backup in Atlas console
- Keep backup frequency at 24 hours minimum

## Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
- [NextAuth.js Docs](https://next-auth.js.org)

---

**Last Updated**: June 2026
**Maintained By**: Your Team
