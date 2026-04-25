# TaskSync Notification System Setup

## Overview
The notification system sends emails to all TaskSync users about their nearly-due tasks. The sender is `tasksyncscheduler@gmail.com` and it fetches user data from Firebase Firestore.

## Components

### 1. **Email Server** (`server.js`)
- Runs on `http://localhost:5000`
- Handles email sending via Nodemailer/Gmail SMTP
- Endpoints:
  - `GET /health` - Health check
  - `POST /send-notification` - Send notification to specific user
  - `POST /send-reminder` - Send reminder for a single task
  - `POST /send-all-notifications` - Trigger bulk notifications (admin)

### 2. **Notification Service** (`send-notifications-to-all.js`)
- Fetches all users from Firebase
- Gets each user's nearly-due tasks
- Sends notifications via the email server

### 3. **Configuration** (`.env`)
```
# Email Server
SERVER_PORT=5000
SERVER_SECRET=your-secret-key-change-this
FRONTEND_URL=http://localhost:3001

# Gmail SMTP
SMTP_USER=tasksyncscheduler@gmail.com
SMTP_PASSWORD=mqgu ncmm jdiv vrtl  # App password, not regular password
```

### 4. **Firebase Structure**
```
users/
├── {userId}/
│   ├── email: string
│   ├── displayName: string
│   ├── preferences: object
│   └── tasks/
│       ├── {taskId}/
│       │   ├── title: string
│       │   ├── description: string
│       │   ├── dueDate: Timestamp
│       │   ├── priority: 'low' | 'medium' | 'high'
│       │   ├── status: 'todo' | 'in-progress' | 'completed'
│       │   └── ...
```

## Setup Instructions

### Step 1: Environment Variables
Update `.env` with:
```
VITE_FIREBASE_PROJECT_ID=tasksync-70aa9
VITE_FIREBASE_API_KEY=...
# Other Firebase config

SERVER_SECRET=your-secure-secret-here
SMTP_USER=tasksyncscheduler@gmail.com
SMTP_PASSWORD=your-gmail-app-password
```

### Step 2: Start the Email Server
```bash
npm run dev:server
```

Output:
```
🚀 TaskSync Email Server running on http://localhost:5000
📧 SMTP configured for: tasksyncscheduler@gmail.com
✅ Server is ready to send notifications
```

### Step 3: Send Notifications to All Users

**Option 1: Manual Trigger**
```bash
npm run notify-all-users
```

**Option 2: API Endpoint** (requires auth)
```bash
curl -X POST http://localhost:5000/send-all-notifications \
  -H "x-server-secret: your-secret-key-change-this" \
  -H "Content-Type: application/json"
```

## Workflow

1. **User creates/updates tasks** in TaskSync with due dates
2. **Tasks stored in Firebase** under `users/{userId}/tasks`
3. **Run notification script** (manually or via scheduler):
   - Fetches all users from Firebase
   - For each user, queries nearly-due tasks (within 24 hours)
   - Sends email notification via email server
4. **Users receive email** from `tasksyncscheduler@gmail.com` with their task list

## Testing

### Test Email Server
```bash
node test-email-server.js
```

### Debug Notification
```bash
node debug-notification.js
```

### Test Direct Gmail
```bash
node debug-gmail-direct.js
```

## Email Contents

### Notification Email
- **Subject**: "⏰ X task(s) due soon"
- **Content**: Table with all nearly-due tasks
- **Includes**: Task title, description, priority, due date/time

### Reminder Email
- **Subject**: "📌 Reminder: [Task Title]"
- **Content**: Single task details with priority badge
- **Includes**: Task title, description, priority, due date

## Production Deployment

### Option 1: Google Cloud Scheduler
Set up scheduled Cloud Functions to trigger daily:
```bash
firebase deploy --only functions
```

### Option 2: External Scheduler (e.g., EasyCron, AWS Lambda)
Call the endpoint:
```
POST /send-all-notifications
Headers:
  x-server-secret: [SERVER_SECRET]
  Content-Type: application/json
```

### Option 3: Docker Container
Run as scheduled task in container with cron

## Troubleshooting

### Emails not arriving
1. **Check spam folder** - Gmail may filter emails initially
2. **Verify SMTP credentials** - Test with `node debug-gmail-direct.js`
3. **Check server logs** - Run email server with debugging
4. **Verify Firebase connection** - Ensure service account key is available

### No users found
- Verify users exist in Firebase at `users/{userId}`
- Check user documents have `email` field
- Verify Firestore security rules allow reading

### Tasks not found
- Verify tasks exist at `users/{userId}/tasks/{taskId}`
- Check `dueDate` field is a valid Firestore Timestamp
- Ensure `status` is not 'completed'

## Security Considerations

- ✅ Email server requires `x-server-secret` header
- ✅ SMTP credentials stored in `.env` (not committed)
- ✅ Firebase rules limit user access to own data
- ⚠️ In production, use environment secrets, not `.env`
- ⚠️ Rotate `SERVER_SECRET` regularly
- ⚠️ Use OAuth2 instead of app passwords if possible

## Next Steps

1. Set up Firebase with sample users and tasks
2. Test notification flow manually
3. Configure scheduled trigger (cron job)
4. Monitor email delivery and bounce rates
5. Customize email templates as needed
