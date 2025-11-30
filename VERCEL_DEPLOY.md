# Quick Vercel Deployment Guide

## Step-by-Step Instructions

### 1. Prepare Your Repository

```bash
# Make sure all changes are committed
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:

   **Framework Preset**: Next.js
   
   **Root Directory**: `packages/web`
   
   **Build Command**:
   ```bash
   cd ../.. && npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/web
   ```
   
   **Output Directory**: `packages/web/.next`
   
   **Install Command**: `npm install`

5. **IMPORTANT**: In "Build & Development Settings", override these:
   
   **Root Directory**: `packages/web` (click "Edit" and select this folder)
   
   Leave other settings as default (Next.js will auto-detect)

6. Add Environment Variables (leave these for now, update after backend deployment):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=http://localhost:3001
   ```

7. Click "Deploy"

### 3. Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Click "Add Service" → "GitHub Repo"

#### Backend Service Configuration:

- **Service Name**: thumbnail-backend
- **Root Directory**: `packages/backend`
- **Build Command**: 
  ```bash
  npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/backend
  ```
- **Start Command**: `npm start`

**Environment Variables**:
```
MONGO_URL=mongodb+srv://your-connection-string
REDIS_URL=redis://your-redis-url
JWT_SECRET=your-super-secret-key-change-this
PORT=3001
NODE_ENV=production
UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
```

5. Click "Deploy"
6. Go to "Settings" → "Networking" → "Generate Domain"
7. Copy the domain (e.g., `thumbnail-backend.railway.app`)

### 4. Deploy Worker to Railway

1. In the same Railway project, click "New Service"
2. Select your GitHub repository again

#### Worker Service Configuration:

- **Service Name**: thumbnail-worker
- **Root Directory**: `packages/worker`
- **Build Command**: 
  ```bash
  npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/worker
  ```
- **Start Command**: `npm start`

**Environment Variables** (same as backend):
```
MONGO_URL=mongodb+srv://your-connection-string
REDIS_URL=redis://your-redis-url
NODE_ENV=production
UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
WORKER_CONCURRENCY=2
JOB_TIMEOUT=300000
```

### 5. Update Vercel Environment Variables

1. Go back to Vercel Dashboard
2. Select your project → Settings → Environment Variables
3. Update the variables:
   ```
   NEXT_PUBLIC_API_URL=https://thumbnail-backend.railway.app
   NEXT_PUBLIC_WS_URL=https://thumbnail-backend.railway.app
   ```
4. Go to Deployments → Click "..." → "Redeploy"

### 6. Setup MongoDB Atlas (Free)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user (Database Access)
4. Whitelist all IPs: 0.0.0.0/0 (Network Access)
5. Get connection string from "Connect" → "Connect your application"
6. Update `MONGO_URL` in Railway environment variables

### 7. Setup Redis Cloud (Free)

1. Go to [redis.com/try-free](https://redis.com/try-free/)
2. Create a free database
3. Get connection string from database details
4. Update `REDIS_URL` in Railway environment variables

### 8. Test Your Deployment

1. Visit your Vercel URL (e.g., `your-app.vercel.app`)
2. Register a new account
3. Upload an image or video
4. Verify thumbnail generation works

---

## Troubleshooting

### Build fails on Vercel
- Check that the build command includes building the shared package first
- Verify the root directory is set to `packages/web`

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct (must start with https://)
- Check backend is running on Railway
- Test backend health: `https://your-backend.railway.app/health`

### Worker not processing jobs
- Check worker logs in Railway
- Verify Redis connection string is correct
- Ensure both backend and worker use the same Redis instance

### File uploads fail
- Check backend logs for errors
- Verify file size limits
- Note: Files are stored ephemerally and will be lost on restart

---

## Important Notes

⚠️ **File Storage**: The current setup uses ephemeral storage. Files will be deleted when services restart. For production, integrate cloud storage (AWS S3, Cloudinary, or Vercel Blob).

⚠️ **Security**: Change the `JWT_SECRET` to a strong random string in production.

⚠️ **Costs**: 
- Vercel: Free for hobby projects
- Railway: $5/month credit (usually enough for small apps)
- MongoDB Atlas: Free tier (512MB)
- Redis Cloud: Free tier (30MB)

---

## Next Steps

1. Set up cloud storage for persistent file storage
2. Add monitoring and error tracking (Sentry)
3. Implement rate limiting
4. Add analytics
5. Set up CI/CD pipeline
6. Configure custom domain
