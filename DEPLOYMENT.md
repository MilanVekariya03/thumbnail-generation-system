# Deployment Guide

This guide covers deploying the Thumbnail Generation System to production.

## Architecture Overview

This is a monorepo with three main components:
- **Frontend (Web)**: Next.js app - Deploy to Vercel
- **Backend (API)**: Fastify server - Deploy to Railway/Render/Fly.io
- **Worker**: Background job processor - Deploy to Railway/Render/Fly.io

## Prerequisites

- GitHub account
- Vercel account
- Railway/Render account (for backend & worker)
- MongoDB Atlas account (free tier available)
- Redis Cloud account (free tier available)

---

## 1. Database Setup

### MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for development
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/thumbnail-system?retryWrites=true&w=majority
   ```

### Redis Cloud (Free Tier)

1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create a free database
3. Get your connection string:
   ```
   redis://default:<password>@redis-xxxxx.cloud.redislabs.com:12345
   ```

---

## 2. Frontend Deployment (Vercel)

### Option A: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web`
   - **Build Command**: `cd ../.. && npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/web`
   - **Output Directory**: `packages/web/.next`
   - **Install Command**: `npm install`

6. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   NEXT_PUBLIC_WS_URL=https://your-backend-url.railway.app
   ```

7. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 3. Backend Deployment (Railway)

### Setup

1. Go to [Railway](https://railway.app/)
2. Create a new project
3. Click "Deploy from GitHub repo"
4. Select your repository

### Configure Backend Service

1. Add a new service for "Backend"
2. Configure settings:
   - **Root Directory**: `packages/backend`
   - **Build Command**: `npm install && npm run build --workspace=packages/shared && npm run build`
   - **Start Command**: `npm start`

3. Add Environment Variables:
   ```
   MONGO_URL=mongodb+srv://...
   REDIS_URL=redis://...
   JWT_SECRET=your-super-secret-jwt-key-change-this
   PORT=3001
   NODE_ENV=production
   UPLOAD_DIR=./uploads
   THUMBNAIL_DIR=./thumbnails
   ```

4. Enable public networking and note the URL

### Configure Worker Service

1. Add another service for "Worker"
2. Configure settings:
   - **Root Directory**: `packages/worker`
   - **Build Command**: `npm install && npm run build --workspace=packages/shared && npm run build`
   - **Start Command**: `npm start`

3. Add Environment Variables (same as backend):
   ```
   MONGO_URL=mongodb+srv://...
   REDIS_URL=redis://...
   NODE_ENV=production
   UPLOAD_DIR=./uploads
   THUMBNAIL_DIR=./thumbnails
   WORKER_CONCURRENCY=2
   JOB_TIMEOUT=300000
   ```

---

## 4. Alternative: Deploy Backend to Render

### Backend Service

1. Go to [Render](https://render.com/)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: thumbnail-backend
   - **Root Directory**: `packages/backend`
   - **Build Command**: `npm install && npm run build --workspace=packages/shared && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

5. Add environment variables (same as Railway)

### Worker Service

1. Create a new "Background Worker"
2. Configure:
   - **Name**: thumbnail-worker
   - **Root Directory**: `packages/worker`
   - **Build Command**: `npm install && npm run build --workspace=packages/shared && npm run build`
   - **Start Command**: `npm start`

3. Add environment variables

---

## 5. Update Frontend Environment Variables

After deploying the backend, update your Vercel environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   NEXT_PUBLIC_WS_URL=https://your-backend-url.railway.app
   ```
3. Redeploy the frontend

---

## 6. File Storage Considerations

### Current Setup (Ephemeral Storage)
The current implementation uses local file storage, which is ephemeral on platforms like Railway/Render. Files will be lost on restart.

### Recommended: Use Cloud Storage

For production, integrate cloud storage:

#### Option A: AWS S3
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### Option B: Cloudinary
```bash
npm install cloudinary
```

#### Option C: Vercel Blob Storage
```bash
npm install @vercel/blob
```

---

## 7. Post-Deployment Checklist

- [ ] MongoDB Atlas is accessible
- [ ] Redis Cloud is accessible
- [ ] Backend API is running and accessible
- [ ] Worker is running and processing jobs
- [ ] Frontend can connect to backend API
- [ ] WebSocket connections work
- [ ] File uploads work
- [ ] Thumbnail generation works
- [ ] CORS is properly configured
- [ ] Environment variables are set correctly
- [ ] JWT_SECRET is secure and unique

---

## 8. Monitoring & Logs

### Vercel
- View logs in Vercel Dashboard → Your Project → Deployments → Logs

### Railway
- View logs in Railway Dashboard → Your Service → Logs

### Render
- View logs in Render Dashboard → Your Service → Logs

---

## 9. Troubleshooting

### Frontend can't connect to backend
- Check NEXT_PUBLIC_API_URL is correct
- Verify CORS settings in backend
- Check backend is running

### Worker not processing jobs
- Verify Redis connection
- Check worker logs
- Ensure REDIS_URL is correct in both backend and worker

### File uploads failing
- Check UPLOAD_DIR and THUMBNAIL_DIR exist
- Verify file size limits
- Check disk space (or migrate to cloud storage)

### WebSocket not connecting
- Verify NEXT_PUBLIC_WS_URL is correct
- Check Socket.io CORS configuration
- Ensure backend allows WebSocket connections

---

## 10. Cost Estimation (Free Tier)

- **Vercel**: Free (Hobby plan)
- **Railway**: $5/month credit (enough for small apps)
- **MongoDB Atlas**: Free (512MB storage)
- **Redis Cloud**: Free (30MB storage)

**Total**: ~$0-5/month for small-scale usage

---

## Security Notes

1. Never commit `.env` files
2. Use strong JWT_SECRET in production
3. Enable MongoDB IP whitelist in production
4. Use HTTPS for all services
5. Implement rate limiting
6. Add file upload validation
7. Sanitize user inputs
8. Keep dependencies updated

---

## Scaling Considerations

- Add multiple worker instances for high load
- Use CDN for serving thumbnails
- Implement caching strategies
- Add database indexes
- Monitor Redis memory usage
- Consider horizontal scaling for backend
