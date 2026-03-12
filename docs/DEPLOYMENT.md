# Gabon COD Platform - Vercel Deployment Guide

## Overview

This guide will help you deploy the Gabon COD Platform to Vercel.

---

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Push your code to GitHub
3. **Vercel CLI** (optional): `npm i -g vercel`

---

## Step 1: Set Up Vercel Postgres Database

1. Go to Vercel Dashboard → Storage → Create Database
2. Select **Postgres** and create a new database
3. Note the `.env` connection strings provided
4. Copy the `DATABASE_URL` and `DIRECT_URL` values

---

## Step 2: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Vercel Postgres connection string | Yes |
| `DIRECT_URL` | Vercel Postgres direct connection | Yes |
| `NEXTAUTH_URL` | Your Vercel app URL | Yes |
| `NEXTAUTH_SECRET` | Random 32+ char string | Yes |
| `JWT_SECRET` | Random 32+ char string | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | For uploads |
| `PUSHER_APP_ID` | Pusher app ID | For real-time |
| ... | See `.env.production.example` | - |

**Generate secrets:**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

---

## Step 3: Deploy to Vercel

### Option A: Via Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project directory
cd "C:\Users\uytr\Desktop\DG\GAbon Saas\gabon-cod-platform"
vercel
```

### Option B: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `prisma generate && next build`
   - **Output Directory:** `.next`
4. Click **Deploy**

---

## Step 4: Run Database Migrations

After first deployment, run Prisma migrations:

```bash
# Connect to Vercel Postgres locally
vercel link

# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# OR create a migration (production)
npx prisma migrate deploy
```

---

## Step 5: Configure Custom Domain (Optional)

1. Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` and `APP_URL` env vars

---

## Step 6: Set Up Webhooks (For Carriers)

Update your carrier dashboards with these webhook URLs:

```
ShipSen: https://your-domain.vercel.app/api/webhooks/shipsen
ColisSwift: https://your-domain.vercel.app/api/webhooks/colisswift
AfriqueCOD: https://your-domain.vercel.app/api/webhooks/afriquecod
```

---

## Troubleshooting

### Build Errors

**Prisma Client Not Found:**
```bash
# Ensure prisma generate runs before build
vercel env pull .env.local
npx prisma generate
```

**Database Connection Issues:**
- Ensure `pgbouncer=true` is in your `DATABASE_URL`
- Check Vercel Postgres is not paused

### Runtime Errors

**NextAuth Session Issues:**
- Verify `NEXTAUTH_URL` matches your deployed URL exactly
- Ensure `NEXTAUTH_SECRET` is set

**CORS Errors:**
- Update `NEXT_PUBLIC_APP_URL` to your deployed URL

---

## Post-Deployment Checklist

- [ ] Database connection working
- [ ] User registration/login working
- [ ] SMS notifications (Twilio) sending
- [ ] File uploads (Cloudinary) working
- [ ] Real-time updates (Pusher) working
- [ ] Google Sheets integration connected
- [ ] Carrier webhooks receiving
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate valid

---

## Useful Commands

```bash
# View logs
vercel logs

# View environment variables
vercel env ls

# Pull env vars locally
vercel env pull .env.local

# Redeploy
vercel --prod
```

---

## Cost Estimate (Vercel)

| Service | Price | Notes |
|---------|-------|-------|
| Hobby Plan | Free | 100GB bandwidth, 6GB functions |
| Pro Plan | $20/mo | 1TB bandwidth, unlimited functions |
| Vercel Postgres | $20/mo | 256MB storage, 60hrs compute |
| Domains | $10/yr | Custom domain |

**Recommended:** Pro Plan ($20/mo) for production
