# Firebase Cloud Functions - Scheduled Notifications

## Overview

Two Cloud Functions run automatically on a schedule:

- **`sendNearlyDueReminder`** - 9:00 AM UTC daily → Reminds users about tasks due within 24 hours
- **`sendOverdueAlert`** - 5:00 PM UTC daily → Alerts users about overdue tasks

These run serverless on Firebase - **no additional servers needed!**

---

## Setup for Deployment

### Step 1: Set Environment Variables

Set these in your Firebase project:

```bash
firebase functions:config:set \
  smtp.user="kencueto25@gmail.com" \
  smtp.password="heqjcyytdpwulpzk" \
  frontend.url="https://your-tasksync-app.com"
```

Or use the Firebase Console:
1. Go to Project Settings → Functions
2. Add these environment variables:
   - `SMTP_USER`: your Gmail address
   - `SMTP_PASSWORD`: Gmail app password (with 2FA enabled)
   - `FRONTEND_URL`: Your deployed React app URL

### Step 2: Deploy Functions

```bash
# From project root
npm run deploy:functions
```

Or manually:
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Step 3: Verify Deployment

Check Firebase Console → Functions tab:
- Both functions should appear
- Status should be "OK" (green)

Check logs:
```bash
firebase functions:log
```

---

## How It Works

### 9:00 AM - Nearly-Due Reminder

1. Cloud Scheduler triggers at 9 AM UTC
2. Function queries all users in Firestore
3. For each user, finds tasks due within 24 hours
4. Sends professional HTML email with task list
5. Repeats daily

### 5:00 PM - Overdue Alert

1. Cloud Scheduler triggers at 5 PM UTC
2. Function queries all users in Firestore
3. For each user, finds overdue tasks (past due date)
4. Sends alert email with task list
5. Repeats daily

---

## Email Format

### Nearly-Due Reminder Email
- Header: Gradient purple theme
- Shows: Task title, priority, due date, hours remaining
- Button: "View All Tasks" → Links to your app
- Professional responsive design

### Overdue Alert Email
- Header: Gradient red/pink theme  
- Shows: Task title, priority, due date, days overdue
- Button: "View Overdue Tasks"
- Urgent styling to get attention

---

## Testing Locally

### Test in Emulator

```bash
# Terminal 1: Start emulator
npm run serve

# Terminal 2: Trigger function manually
curl http://localhost:5001/<PROJECT-ID>/<REGION>/sendNearlyDueReminder
```

### Test with Real Data

Set a task due tomorrow → 9 AM → Check your email

---

## Customizing Schedule Times

Edit `functions/src/taskReminders.ts`:

```typescript
// Change from 9 AM to 10 AM UTC
.schedule('0 10 * * *')

// Change to user's local timezone
.timeZone('America/New_York')

// Multiple times per day
.schedule('0 8,12,17 * * *') // 8 AM, 12 PM, 5 PM
```

---

## Cron Patterns Reference

| Pattern | Meaning |
|---------|---------|
| `0 9 * * *` | Every day at 9:00 AM UTC |
| `0 17 * * *` | Every day at 5:00 PM UTC |
| `0 9,17 * * *` | 9 AM and 5 PM daily |
| `0 9 * * 1` | Every Monday at 9 AM UTC |
| `*/30 * * * *` | Every 30 minutes |

---

## Environment Variables Needed

**.env file (for local development)**
```
SMTP_USER=kencueto25@gmail.com
SMTP_PASSWORD=heqjcyytdpwulpzk
FRONTEND_URL=http://localhost:3001
```

**Firebase Console (for production)**
- Add same variables in Functions settings
- Values are encrypted and secure

---

## Troubleshooting

### Emails Not Sending?

1. **Check logs:**
   ```bash
   firebase functions:log
   ```

2. **Verify environment variables:**
   ```bash
   firebase functions:config:get
   ```

3. **Test email credentials:**
   - Make sure Gmail 2FA is enabled
   - App password is correct (no spaces)
   - App password is in Gmail settings

4. **Check Firestore data:**
   - Verify users exist in Firestore
   - Verify tasks exist and have dueDate fields
   - Check task status is not 'completed'

### "Permission denied" error?

Make sure your Firebase rules allow Cloud Functions to read user data:

```firebase
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow Cloud Functions to read all user data
    match /users/{uid} {
      allow read: if request.auth.uid == uid || request.auth == null;
      allow read: if request.headers['Authorization'] != null; // Cloud Functions
    }
  }
}
```

---

## Disabling Reminders

If you want to stop scheduled reminders:

1. **Delete the function:**
   ```bash
   firebase functions:delete sendNearlyDueReminder
   firebase deploy --only functions
   ```

2. **Or disable in console:**
   - Firebase Console → Functions
   - Click function → Delete

---

## Files Included

- `functions/src/taskReminders.ts` - Main Cloud Functions code
- `functions/src/index.ts` - Function exports
- `functions/package.json` - Already has nodemailer installed

---

## Deployment Checklist

- [ ] Firebase project created
- [ ] Firestore database initialized
- [ ] Gmail SMTP credentials set (app password)
- [ ] Environment variables configured in Firebase Console
- [ ] Functions code deployed: `firebase deploy --only functions`
- [ ] Check logs: `firebase functions:log`
- [ ] Verify functions status in Console (should be green)
- [ ] Test with manual trigger or wait for scheduled time

---

## Done! 🎉

Your email notifications are now running automatically in production:
- ✅ Daily reminders for nearly-due tasks
- ✅ Daily alerts for overdue tasks
- ✅ Runs serverless on Firebase
- ✅ No additional servers needed
- ✅ Professional HTML emails

When you deploy, these functions start working immediately!
