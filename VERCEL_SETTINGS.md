# Exact Vercel Configuration Settings

## When Deploying to Vercel

### Step 1: Import Project
1. Go to https://vercel.com/new
2. Import your GitHub repository: `MilanVekariya03/thumbnail-generation-system`

### Step 2: Configure Project Settings

#### Framework Preset
- Select: **Next.js**

#### Root Directory
- Click **"Edit"** next to Root Directory
- Select: **`packages/web`**
- This is CRITICAL - Vercel needs to know the Next.js app is in this subfolder

#### Build & Development Settings
Leave these as default or use:
- **Build Command**: (leave empty, vercel.json will handle it)
- **Output Directory**: (leave empty, Next.js default `.next`)
- **Install Command**: (leave empty, vercel.json will handle it)

### Step 3: Environment Variables

Add these environment variables (you can update them later):

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Step 4: Deploy

Click **"Deploy"** and wait for the build to complete.

---

## After Backend is Deployed

Once you have your Railway backend URL, update the environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit both variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_WS_URL=https://your-backend.railway.app
   ```
3. Go to Deployments tab
4. Click the three dots on the latest deployment → "Redeploy"

---

## Troubleshooting

### Error: "No Output Directory named 'public' found"
**Solution**: Make sure you set the Root Directory to `packages/web` in project settings.

### Error: "Cannot find module '@thumbnail-system/shared'" or "tsc: command not found"
**Solution**: The vercel.json build command builds the shared package first, and TypeScript is now in dependencies (not devDependencies) to ensure it's available during build.

### Build succeeds but app doesn't work
**Solution**: Check that environment variables are set correctly and backend URL is accessible.

---

## Current Configuration

The `vercel.json` file is configured to:
1. Navigate to root directory
2. Install all dependencies (including shared package)
3. Build the shared package first
4. Build the web package

This ensures the monorepo structure works correctly.

---

## Quick Test

After deployment, test these URLs:

1. **Homepage**: `https://your-app.vercel.app/`
2. **Register**: `https://your-app.vercel.app/register`
3. **Login**: `https://your-app.vercel.app/` (login form)

If these load, your frontend is deployed successfully! 🎉
