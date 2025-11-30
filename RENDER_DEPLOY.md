# Deploy Backend & Worker to Render

This guide will help you deploy the backend API and worker service to Render.

## Prerequisites

1. **GitHub account** with your code pushed
2. **Render account** (sign up at https://render.com)
3. **MongoDB Atlas** database (free tier)
4. **Redis Cloud** database (free tier)

---

## Step 1: Setup MongoDB Atlas (Free)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster (M0 Sandbox)
3. Create a database user:
   - Go to **Database Access**
   - Click **Add New Database User**
   - Username: `thumbnail_user`
   - Password: Generate a secure password (save it!)
4. Whitelist all IPs:
   - Go to **Network Access**
   - Click **Add IP Address**
   - Click **Allow Access from Anywhere** (0.0.0.0/0)
5. Get connection string:
   - Go to **Database** → **Connect**
   - Choose **Connect your application**
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Example: `mongodb+srv://thumbnail_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/thumbnail-system?retryWrites=true&w=majority`

---

## Step 2: Setup Redis Cloud (Free)

1. Go to https://redis.com/try-free/
2. Create a free database (30MB)
3. Get connection details:
   - Go to your database
   - Copy the **Endpoint** (looks like: `redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345`)
   - Copy the **Password**
4. Format connection string:
   - `redis://default:YOUR_PASSWORD@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345`

---

## Step 3: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Push render.yaml to GitHub** (already done if you committed it)

2. **Go to Render Dashboard**: https://dashboard.render.com/

3. **Create New Blueprint**:
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Select your repository: `thumbnail-generation-system`
   - Render will detect `render.yaml` automatically
   - Click **"Apply"**

4. **Add Environment Variables**:
   
   For **thumbnail-backend** service:
   - Click on the backend service
   - Go to **Environment** tab
   - Add these variables:
     ```
     MONGO_URL = mongodb+srv://thumbnail_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/thumbnail-system
     REDIS_URL = redis://default:YOUR_PASSWORD@redis-xxxxx.cloud.redislabs.com:12345
     JWT_SECRET = (auto-generated, or set your own secure random string)
     ```

   For **thumbnail-worker** service:
   - Click on the worker service
   - Go to **Environment** tab
   - Add these variables:
     ```
     MONGO_URL = (same as backend)
     REDIS_URL = (same as backend)
     ```

5. **Deploy**:
   - Both services will automatically deploy
   - Wait for builds to complete (5-10 minutes)

### Option B: Manual Setup

If you prefer to set up manually:

#### Deploy Backend:

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `thumbnail-backend`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: Node
   - **Build Command**: 
     ```
     npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/backend
     ```
   - **Start Command**: 
     ```
     npm run start --workspace=packages/backend
     ```
   - **Plan**: Free

5. Add Environment Variables (click "Advanced"):
   ```
   NODE_ENV = production
   PORT = 3001
   MONGO_URL = mongodb+srv://...
   REDIS_URL = redis://...
   JWT_SECRET = your-super-secret-random-string
   UPLOAD_DIR = ./uploads
   THUMBNAIL_DIR = ./thumbnails
   ```

6. Click **"Create Web Service"**

#### Deploy Worker:

1. Click **"New +"** → **Background Worker**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `thumbnail-worker`
   - **Region**: Oregon (same as backend)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: Node
   - **Build Command**: 
     ```
     npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/worker
     ```
   - **Start Command**: 
     ```
     npm run start --workspace=packages/worker
     ```
   - **Plan**: Free

4. Add Environment Variables:
   ```
   NODE_ENV = production
   MONGO_URL = mongodb+srv://...
   REDIS_URL = redis://...
   UPLOAD_DIR = ./uploads
   THUMBNAIL_DIR = ./thumbnails
   WORKER_CONCURRENCY = 2
   JOB_TIMEOUT = 300000
   ```

5. Click **"Create Background Worker"**

---

## Step 4: Get Backend URL

1. Go to your backend service in Render dashboard
2. Copy the URL (e.g., `https://thumbnail-backend.onrender.com`)
3. Save this URL - you'll need it for the frontend

---

## Step 5: Update Frontend Environment Variables

Now update your Netlify frontend to use the Render backend:

1. Go to Netlify Dashboard → Your Site → **Site settings** → **Environment variables**
2. Update these variables:
   ```
   NEXT_PUBLIC_API_URL = https://thumbnail-backend.onrender.com
   NEXT_PUBLIC_WS_URL = https://thumbnail-backend.onrender.com
   ```
3. Go to **Deploys** tab → **Trigger deploy** → **Deploy site**

---

## Step 6: Test Your Deployment

1. Visit your Netlify frontend URL
2. Register a new account
3. Login
4. Upload an image or video
5. Verify thumbnail generation works

Test backend health:
```
https://thumbnail-backend.onrender.com/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-..."}
```

---

## Important Notes

### ⚠️ Free Tier Limitations

**Render Free Tier**:
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- 750 hours/month free (enough for 1 service running 24/7)

**MongoDB Atlas Free Tier**:
- 512MB storage
- Shared CPU
- No backups

**Redis Cloud Free Tier**:
- 30MB storage
- Shared resources

### 📁 File Storage

The current setup uses **ephemeral storage**. Files will be deleted when services restart.

**For production**, integrate cloud storage:
- AWS S3
- Cloudinary
- Vercel Blob Storage

### 🔒 Security

- Use strong passwords for MongoDB and Redis
- Keep JWT_SECRET secure and random
- Never commit `.env` files
- Enable MongoDB IP whitelist in production

---

## Troubleshooting

### Build fails
- Check build logs in Render dashboard
- Verify all dependencies are in package.json
- Ensure shared package builds first

### Backend not responding
- Check if service is running (Render dashboard)
- Free tier services spin down - first request is slow
- Check environment variables are set correctly

### Worker not processing jobs
- Verify Redis connection string is correct
- Check worker logs in Render dashboard
- Ensure both backend and worker use same Redis instance

### Database connection errors
- Verify MongoDB connection string
- Check MongoDB IP whitelist includes 0.0.0.0/0
- Ensure database user has correct permissions

---

## Monitoring

### View Logs

**Backend logs**:
1. Go to Render Dashboard
2. Click on `thumbnail-backend` service
3. Click **"Logs"** tab

**Worker logs**:
1. Go to Render Dashboard
2. Click on `thumbnail-worker` service
3. Click **"Logs"** tab

### Check Service Status

- Green dot = Running
- Yellow dot = Deploying
- Red dot = Failed

---

## Costs

- **Render**: Free (with limitations)
- **MongoDB Atlas**: Free (512MB)
- **Redis Cloud**: Free (30MB)
- **Netlify**: Free (frontend)

**Total: $0/month** for small-scale usage

---

## Next Steps

1. ✅ Deploy backend and worker to Render
2. ✅ Update frontend environment variables
3. ✅ Test the full application
4. 🔄 Consider upgrading to paid plans for production
5. 📦 Integrate cloud storage for persistent files
6. 📊 Add monitoring and error tracking (Sentry)
7. 🔐 Implement rate limiting
8. 🌐 Add custom domain

---

## Support

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Redis Cloud Docs**: https://docs.redis.com/latest/rc/

Your application is now fully deployed! 🚀
