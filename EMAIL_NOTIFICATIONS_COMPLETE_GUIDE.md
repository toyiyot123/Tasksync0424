# Email Notification System - Complete Guide

## Overview

Your TaskSync app has **fully automated email notifications** that work in both development and production.

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React App)                   │
│  - Task creation/updates                │
│  - Manual reminder buttons (optional)   │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
    DEV              PROD
       │                │
       ▼                ▼
┌────────────────┐ ┌──────────────────────┐
│ Express Server │ │ Firebase Cloud       │
│ (Port 5000)    │ │ Functions            │
│ - Local only   │ │ - Serverless         │
│ - node-cron    │ │ - Cloud Scheduler    │
│   (in app)     │ │ - Runs automatically │
│                │ │ - 9 AM & 5 PM UTC    │
└────────────────┘ └──────────────────────┘
       │                │
       └───────┬────────┘
               │
              ▼
    ┌──────────────────────┐
    │  Nodemailer + Gmail  │
    │  kencueto25@gmail.com│
    └──────────────────────┘
               │
              ▼
    ┌──────────────────────┐
    │  User Email Inbox    │
    │  (Automatic reminders)
    └──────────────────────┘
```

---

## 🛠️ For Development (Local)

### What to Use
- **Express email server** on port 5000
- **node-cron** for scheduling in the app
- Local environment variables

### Setup
1. Start email server:
   ```bash
   npm run dev:server
   ```

2. Start React app:
   ```bash
   npm run dev
   ```

3. Initialize scheduler in your component:
   ```typescript
   import { useTaskScheduler } from '@/hooks/useTaskScheduler';
   
   useTaskScheduler({
     userId: user?.uid,
     userEmail: user?.email,
     userName: user?.displayName,
   });
   ```

### What Happens
- Emails send at 9 AM & 5 PM based on your system clock
- Runs in browser (your React app)
- Stops when you close the app

---

## 🚀 For Production (Deployed)

### What to Use
- **Firebase Cloud Functions** (serverless)
- **Cloud Scheduler** (Google Cloud)
- Production environment variables in Firebase Console

### Setup
1. Set environment variables in Firebase Console:
   ```
   SMTP_USER = kencueto25@gmail.com
   SMTP_PASSWORD = heqjcyytdpwulpzk (app password)
   FRONTEND_URL = https://your-app.com
   ```

2. Deploy Cloud Functions:
   ```bash
   firebase deploy --only functions
   ```

3. **Don't** use the local scheduler hook

### What Happens
- Emails send automatically at 9 AM & 5 PM UTC
- Runs on Google Cloud (even if your app is down)
- All users get emails automatically
- No additional server costs

---

## 📧 Email Types

### Type 1: Nearly-Due Reminder (9 AM Daily)
**Who Gets It:** Users with tasks due within 24 hours
**Contents:**
- Task title, description
- Priority level (color-coded)
- Due date & time
- Hours remaining
- Link to view all tasks

**Example:** "You have 3 tasks due in the next 24 hours"

### Type 2: Overdue Alert (5 PM Daily)
**Who Gets It:** Users with overdue tasks
**Contents:**
- Overdue task list
- How many days overdue
- Priority levels
- Link to overdue tasks

**Example:** "⚠️ You have 2 overdue tasks"

---

## 🔧 Configuration

### Change Email Times

**For Development:**
Edit `src/services/TaskScheduler.ts`:
```typescript
// Instead of 9 AM
cron.schedule('0 10 * * *', () => { ... }); // 10 AM
```

**For Production:**
Edit `functions/src/taskReminders.ts`:
```typescript
// Instead of 9 AM UTC, use 8 AM UTC
.schedule('0 8 * * *')

// Use different timezone
.timeZone('America/New_York')
```

### Change Email Frequency

**Send 3 times daily:**
```typescript
.schedule('0 8,12,17 * * *') // 8 AM, 12 PM, 5 PM
```

**Send weekly:**
```typescript
.schedule('0 9 * * 1') // Every Monday at 9 AM
```

---

## ✅ Deployment Checklist

### Before Deploying

- [ ] Test emails locally with `npm run dev:server`
- [ ] Verify Firebase project is set up
- [ ] Gmail credentials working (with app password)
- [ ] Firestore database created
- [ ] Users and tasks in database

### During Deployment

- [ ] Set environment variables in Firebase Console
- [ ] Run `firebase deploy --only functions`
- [ ] Check function status (should be green)
- [ ] View logs: `firebase functions:log`

### After Deployment

- [ ] Wait for 9 AM UTC (or test time)
- [ ] Check your email inbox
- [ ] Verify email format and content
- [ ] Check Firebase logs for errors
- [ ] Test manual reminder buttons (if added)

---

## 📱 Manual Reminder Buttons (Optional)

You can also let users send reminders manually from the dashboard:

```typescript
const { sendNearlyDueReminder } = useTaskManager({
  userEmail: user?.email,
  userName: user?.displayName,
});

<button onClick={() => sendNearlyDueReminder(tasks)}>
  📧 Send Reminders Now
</button>
```

This works in both dev and production!

---

## 🐛 Troubleshooting

### Emails Not Sending in Production?

1. **Check Cloud Function logs:**
   ```bash
   firebase functions:log
   ```

2. **Verify environment variables:**
   ```bash
   firebase functions:config:get
   ```

3. **Check Firestore rules** (allow Cloud Functions to read data):
   ```firebase
   allow read: if request.headers['Authorization'] != null;
   ```

4. **Test manually:**
   - Create a task with tomorrow's due date
   - Wait for 9 AM or manually trigger
   - Check your email

### Emails Working in Dev but Not Production?

- Make sure you didn't import `useTaskScheduler` hook in production build
- Verify Firebase environment variables are set
- Check Cloud Functions are deployed and green
- Verify Firestore has user and task data

---

## 📚 File Reference

### Development (Local)
- `src/services/TaskScheduler.ts` - Local cron scheduling
- `src/hooks/useTaskScheduler.ts` - React hook to start scheduler
- `server.js` - Express email server
- `server-utils/emailService.js` - Email sending logic

### Production (Serverless)
- `functions/src/taskReminders.ts` - Cloud Functions
- `functions/src/index.ts` - Function exports
- `Firebase Console` - Environment variables & Cloud Scheduler

### Shared
- `src/utils/emailClient.ts` - Frontend API client
- `src/services/TaskNotificationService.ts` - Email business logic
- `.env` - Local config

---

## 🎯 Next Steps

1. **Test locally first:**
   - `npm run dev:server`
   - Wait for 9 AM or 5 PM
   - Check email

2. **Deploy to production:**
   - Set Firebase environment variables
   - `firebase deploy --only functions`
   - Verify in Firebase Console

3. **Monitor:**
   - Check logs regularly: `firebase functions:log`
   - Monitor email delivery
   - Adjust times if needed

---

## Summary

| Aspect | Development | Production |
|--------|-------------|-----------|
| **Runs on** | Your machine | Google Cloud |
| **Technology** | Express + node-cron | Firebase Functions |
| **Scheduler** | Browser (in app) | Cloud Scheduler |
| **Active** | When app running | Always (24/7) |
| **Cost** | Free | Free (1 million invokes/month) |
| **Time Format** | Local timezone | UTC |
| **Setup** | 1 npm script | 1 firebase deploy |

Everything is configured and ready to go. Just deploy and your notifications work automatically! 🎉
