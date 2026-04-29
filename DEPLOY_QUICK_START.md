# TaskSync - Split Deployment Quick Start

## 🎯 Architecture
- **Frontend**: React app → Firebase Hosting
- **Backend**: Node.js API → Vercel Serverless Functions
- **Database**: Firestore (Firebase)

## 📋 Quick Checklist

### Setup Requirements
- [ ] Firebase CLI: `npm install -g firebase-tools`
- [ ] Vercel CLI: `npm install -g vercel`
- [ ] GitHub account connected to Vercel
- [ ] Firebase project created

## 🚀 Deployment Steps

### Step 1: Firebase Frontend Deployment

**First time setup:**
```bash
firebase login
firebase use tasksync-70aa9
```

**Build and deploy:**
```bash
npm run build:frontend
npm run deploy:firebase
```

**Verify:** https://tasksync-70aa9.web.app

---

### Step 2: Vercel Backend Deployment

**First time setup:**
```bash
vercel login
vercel link  # Link to your GitHub repository
```

**Set environment variables in Vercel:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

```
FIREBASE_SERVICE_ACCOUNT    → (Your Firebase Service Account JSON)
VITE_FIREBASE_API_KEY       → (From Firebase Console)
VITE_FIREBASE_PROJECT_ID    → tasksync-70aa9
EMAILJS_SERVICE_ID          → service_mjgbtih
EMAILJS_PUBLIC_KEY          → 9Dw-9GkNwVvoLmb1q
FRONTEND_URL                → https://tasksync-70aa9.web.app
```

**To get Firebase Service Account:**
1. Firebase Console → Project Settings
2. Click "Service Accounts"
3. Click "Generate New Private Key"
4. Copy the entire JSON and paste into `FIREBASE_SERVICE_ACCOUNT`

**Deploy:**
```bash
npm run deploy:vercel
```

Or push to main branch (auto-deploys if connected to GitHub).

**Verify:** `https://your-vercel-url.vercel.app/api/notify?mode=overdue`

---

## 📡 Update Frontend API Endpoint

Find files that call the backend API and update them:

```typescript
// Update this in services/
const API_BASE_URL = process.env.VITE_API_URL || 'https://your-vercel-url.vercel.app';
```

Add to `.env`:
```
VITE_API_URL=https://your-vercel-url.vercel.app
```

---

## ✅ Testing

### Test Frontend
```bash
npm run dev
# Visit http://localhost:3000
```

### Test Backend
```bash
curl "https://your-vercel-url.vercel.app/api/notify?mode=overdue"
# Should return: { "success": true, "sent": X, ... }
```

---

## 🔧 Common Issues

**Firebase deploy fails:**
```bash
firebase login
firebase deploy --only hosting --debug
```

**Vercel can't find API:**
- Check environment variables are set in Vercel Dashboard
- Check `vercel.json` exists in root
- Check `api/notify.js` exists

**API returns 500 error:**
- Check Vercel logs: `vercel logs`
- Verify Firebase Service Account JSON is valid
- Check all environment variables are set

---

## 📊 Monitoring

**Firebase:**
```bash
firebase hosting:channels:list
```

**Vercel:**
```bash
vercel logs  # View real-time logs
vercel env   # Check environment variables
```

---

## 🔄 Rollback

**Firebase:**
```bash
firebase hosting:channels:list
firebase hosting:channels:delete <channel-id>
```

**Vercel:**
```bash
vercel rollback
```

---

## 📚 Full Documentation

- Firebase: [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md)
- Complete Guide: [DEPLOY_SPLIT.md](./DEPLOY_SPLIT.md)
