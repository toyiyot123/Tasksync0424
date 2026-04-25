# Scheduled Email Notifications Setup

## What Gets Scheduled

- **9:00 AM Daily** ⏰ - Send reminder for tasks due within 24 hours
- **5:00 PM Daily** 🚨 - Send alert for overdue tasks

Emails automatically send at these times - no user action needed!

---

## Setup (2 Steps)

### Step 1: Initialize in Your Main App Component

In `src/App.tsx` or wherever you initialize the app after login:

```typescript
import { useTaskScheduler } from '@/hooks/useTaskScheduler';
import { useAuth } from '@/context/AuthContext'; // Your auth context

export const App = () => {
  const { user } = useAuth();

  // ✨ Start scheduler when user logs in
  useTaskScheduler({
    userId: user?.uid,
    userEmail: user?.email,
    userName: user?.displayName,
  });

  return (
    // Your app JSX...
  );
};
```

### Step 2: That's It!

Once initialized, emails send automatically at:
- **9:00 AM** - Nearly due tasks
- **5:00 PM** - Overdue tasks

---

## Custom Schedule

Want different times? Add this to your app:

```typescript
import { TaskScheduler } from '@/services/TaskScheduler';

// Send reminders every day at 10 AM
TaskScheduler.scheduleCustom('0 10 * * *', async () => {
  // Custom logic here
});

// Send alerts twice daily (8 AM and 8 PM)
TaskScheduler.scheduleCustom('0 8,20 * * *', async () => {
  // Custom logic here
});

// Every Monday at 9 AM
TaskScheduler.scheduleCustom('0 9 * * 1', async () => {
  // Custom logic here
});
```

---

## Cron Patterns (Common Times)

| Pattern | Description |
|---------|-------------|
| `0 9 * * *` | Every day at 9:00 AM |
| `0 17 * * *` | Every day at 5:00 PM |
| `0 8,12,17 * * *` | Every day at 8 AM, 12 PM, 5 PM |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Every day at midnight |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 0 1 * *` | First day of every month |

---

## How It Works

1. **User Logs In**
2. `useTaskScheduler` hook initializes
3. Two cron jobs start running in background
4. At 9 AM: Check for nearly-due tasks → Send email if any found
5. At 5 PM: Check for overdue tasks → Send email if any found
6. Repeats daily automatically

---

## Features

✅ **Automatic** - No user action needed
✅ **Background** - Runs without blocking the app
✅ **Smart** - Only sends email if there are tasks
✅ **Customizable** - Change times anytime
✅ **Graceful** - Skips email if server is down

---

## Testing

To test immediately without waiting for scheduled time:

```typescript
import { TaskNotificationService } from '@/services/TaskNotificationService';
import { TaskService } from '@/services/TaskService';

// Test nearly-due reminder
const tasks = await TaskService.getUserTasks(userId);
const nearlyDue = TaskNotificationService.getNearlyDueTasks(tasks);
if (nearlyDue.length > 0) {
  await TaskNotificationService.notifyNearlyDueTasks(
    userEmail,
    userName,
    nearlyDue
  );
}

// Test overdue alert
const overdue = TaskNotificationService.getOverdueTasks(tasks);
if (overdue.length > 0) {
  await TaskNotificationService.notifyOverdueTasks(
    userEmail,
    userName,
    overdue
  );
}
```

---

## Troubleshooting

**Emails not sending?**
1. Check console for errors: `🚀 Starting task scheduler...`
2. Verify email server is running: `npm run dev:server`
3. Make sure user is logged in (userId, userEmail, userName provided)

**Want to disable?**
- Don't use `useTaskScheduler` hook
- Or comment out the hook call

**Change email times?**
```typescript
// Instead of 9 AM, send at 8 AM
TaskScheduler.scheduleCustom('0 8 * * *', () => { /* logic */ });
```

---

## Files Used

- `src/services/TaskScheduler.ts` - Cron job management
- `src/hooks/useTaskScheduler.ts` - React hook for initialization
- `src/services/TaskNotificationService.ts` - Email sending
- `server.js` - Email server (must be running)

That's it! Your automated email schedule is ready! 📧
