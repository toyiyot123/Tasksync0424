# TaskSync Firebase Deployment Guide

## Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in to Firebase: `firebase login`
- Project ID: `tasksync-70aa9`

## Deployment Steps

### 1. Build the React Frontend
```bash
npm run build
```
This creates a `dist` folder with production-optimized code.

### 2. Deploy to Firebase Hosting + Functions
```bash
firebase deploy
```

This will:
- ✅ Deploy React app to Firebase Hosting
- ✅ Deploy Cloud Functions (task reminders)
- ✅ Update Firestore rules

### 3. Set Environment Variables for Functions
```bash
firebase functions:config:set \
  smtp.user="tasksyncscheduler@gmail.com" \
  smtp.password="mqgu ncmm jdiv vrtl" \
  frontend.url="https://tasksync-70aa9.web.app"
```

### 4. Redeploy Functions with Config
```bash
firebase deploy --only functions
```

## What Gets Deployed

### Frontend (Firebase Hosting)
- **URL**: `https://tasksync-70aa9.web.app`
- **Contents**: React app in `dist/` folder
- **Type**: Static hosting

### Backend (Firebase Functions)
- **Email Server**: `sendNearlyDueReminder` - Runs daily at 9 AM
- **Overdue Alert**: `sendOverdueAlert` - Runs daily at 5 PM
- **Database**: Firestore (already deployed)
- **Security**: Firestore rules enforced

### Database (Firestore)
- **Users**: `/users/{userId}` - User profiles and settings
- **Tasks**: `/users/{userId}/tasks/{taskId}` - Individual tasks
- **Rules**: Auto-enforced from `firestore.rules`

## Notification System After Deployment

### Automated Notifications (via Cloud Functions)
- **9:00 AM UTC**: Nearly-due tasks (within 24 hours)
- **5:00 PM UTC**: Overdue tasks reminder

### Manual Notifications
```bash
npm run notify-all-users
```

## Verify Deployment

### Check Hosting
```bash
firebase hosting:channels:list
```

### Check Functions
```bash
firebase functions:list
```

### View Logs
```bash
firebase functions:log
```

## Production Environment Variables

Update in [Firebase Console](https://console.firebase.google.com/project/tasksync-70aa9/functions/config):

```
SMTP_USER=tasksyncscheduler@gmail.com
SMTP_PASSWORD=mqgu ncmm jdiv vrtl
FRONTEND_URL=https://tasksync-70aa9.web.app
```

## Troubleshooting

### "Not deployed" error
```bash
firebase init
firebase deploy --only hosting,functions
```

### Functions not triggering
- Check Cloud Scheduler jobs in Google Cloud Console
- Verify environment variables are set
- Check function logs: `firebase functions:log`

### Email not sending
- Verify SMTP credentials in Firebase Console
- Check Gmail app password is correct
- Verify sender email is authorized

### Hosting not updating
- Clear cache: `firebase hosting:channels:close`
- Rebuild: `npm run build`
- Redeploy: `firebase deploy --only hosting`

## URLs After Deployment

- **Frontend**: https://tasksync-70aa9.web.app
- **Firebase Console**: https://console.firebase.google.com/project/tasksync-70aa9
- **Firestore**: https://console.firebase.google.com/project/tasksync-70aa9/firestore

## Next Steps

1. ✅ Build frontend
2. ✅ Deploy to Firebase
3. ✅ Configure environment variables
4. ✅ Test notifications in production
5. ✅ Monitor Cloud Functions logs
6. ✅ Set up alerts for failures

## Commands Quick Reference

```bash
# Build
npm run build

# Deploy everything
firebase deploy

# Deploy only specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore

# Check status
firebase status
firebase functions:list

# View logs
firebase functions:log --limit 50

# Clean up
rm -rf dist
firebase hosting:channels:list
```
