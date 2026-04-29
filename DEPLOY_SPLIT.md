# TaskSync Deployment Guide - Firebase Frontend + Vercel Backend

This guide covers deploying TaskSync with the frontend on Firebase Hosting and the backend on Vercel.

## Prerequisites

1. **Firebase Project** - Already created (tasksync-70aa9)
2. **Vercel Account** - https://vercel.com/signup
3. **GitHub Repository** - Connected to Vercel for continuous deployment

## Part 1: Deploy Frontend to Firebase Hosting

### Step 1: Build the Frontend

```bash
npm run build:frontend
```

This creates a `dist/` folder with optimized production build.

### Step 2: Deploy to Firebase

```bash
npm run deploy:firebase
```

Or manually:
```bash
firebase deploy --only hosting
```

Verify deployment at: `https://tasksync-70aa9.web.app`

## Part 2: Deploy Backend to Vercel

### Step 1: Connect GitHub to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Import this repository
4. **Project Settings:**
   - Framework Preset: None (Node.js)
   - Root Directory: `./`
   - Build Command: `npm run build:backend`
   - Output Directory: `api`

### Step 2: Set Environment Variables in Vercel

In Vercel Project Settings → Environment Variables, add:

```
FIREBASE_SERVICE_ACCOUNT = <your firebase service account JSON>
VITE_FIREBASE_API_KEY = <your firebase api key>
VITE_FIREBASE_PROJECT_ID = <your firebase project id>
EMAILJS_SERVICE_ID = service_mjgbtih
EMAILJS_PUBLIC_KEY = 9Dw-9GkNwVvoLmb1q
FRONTEND_URL = https://tasksync-70aa9.web.app
```

**To get Firebase Service Account:**
1. Firebase Console → Project Settings
2. Service Accounts → Generate New Private Key
3. Copy the JSON content and paste into `FIREBASE_SERVICE_ACCOUNT`

### Step 3: Configure Cron Jobs

Vercel automatically reads `vercel.json` for cron jobs:

```json
"crons": [
  {
    "path": "/api/notify?mode=overdue",
    "schedule": "0 17 * * *"  // Daily at 5 PM
  },
  {
    "path": "/api/notify?mode=nearly-due",
    "schedule": "0 09 * * *"  // Daily at 9 AM
  }
]
```

Requires Vercel Pro plan for cron jobs.

### Step 4: Deploy

Vercel will automatically deploy when you push to main branch.

Or deploy manually:
```bash
npm run deploy:vercel
```

## Part 3: Update Frontend API Endpoints

Update your frontend to use the Vercel backend URL:

In `src/services/` files that call the API:
```typescript
// Update API base URL
const API_BASE_URL = 'https://your-vercel-project.vercel.app';
```

## Verification

### Frontend
- Visit: `https://tasksync-70aa9.web.app`
- Check: Console for any API errors

### Backend
- Test API: `https://your-vercel-project.vercel.app/api/notify?mode=overdue`
- Expected response: `{ success: true, ... }`

## Troubleshooting

### Firebase Deployment Fails
```bash
firebase login
firebase use tasksync-70aa9
firebase deploy --only hosting
```

### Vercel Deployment Issues
```bash
npm run build:backend
vercel deploy --prod
vercel logs  # View deployment logs
```

### API Not Working
1. Check Vercel environment variables
2. Verify Firebase Service Account is valid JSON
3. Check browser console for CORS issues

## Rollback

**Firebase:**
```bash
firebase hosting:channels:list
firebase hosting:channels:delete <channel-id>
```

**Vercel:**
```bash
vercel rollback
```

## Support

- **Firebase Issues**: https://console.firebase.google.com/project/tasksync-70aa9
- **Vercel Issues**: https://vercel.com/support
