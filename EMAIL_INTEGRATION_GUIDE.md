# Email Notification Integration Guide

## Overview

Your TaskSync app now has a complete email notification system. This guide shows how to integrate it into your React components.

## Prerequisites

- ✅ Email server running: `npm run dev:server`
- ✅ Mailtrap credentials configured in `.env`
- ✅ Frontend running: `npm run dev`

---

## Available Services

### 1. **TaskNotificationService**
Backend service that handles email logic.

**Location**: `src/services/TaskNotificationService.ts`

**Methods**:
```typescript
// Send notification when task is created
TaskNotificationService.notifyTaskCreated(userEmail, userName, task)

// Send notification when task status changes
TaskNotificationService.notifyTaskStatusChanged(userEmail, userName, task, oldStatus, newStatus)

// Send notification for nearly due tasks (within 24 hours)
TaskNotificationService.notifyNearlyDueTasks(userEmail, userName, tasks)

// Send notification for overdue tasks
TaskNotificationService.notifyOverdueTasks(userEmail, userName, tasks)

// Check if email server is running
TaskNotificationService.isEmailServerRunning()
```

### 2. **useTaskNotifications Hook**
React hook for easy integration in components.

**Location**: `src/hooks/useTaskNotifications.ts`

**Usage**:
```typescript
const {
  notifyTaskCreated,
  notifyTaskStatusChanged,
  notifyNearlyDueTasks,
  notifyOverdueTasks,
  checkEmailServerStatus,
  isLoading,
  error
} = useTaskNotifications();
```

---

## Integration Examples

### Example 1: Send notification on Task Creation

**In TaskForm.tsx:**

```typescript
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { useAuth } from '@/context/AuthContext'; // Your auth context

export const TaskForm = () => {
  const { notifyTaskCreated } = useTaskNotifications();
  const { user } = useAuth(); // Get current user

  const handleCreateTask = async (formData) => {
    try {
      // 1. Create task in Firebase
      const taskId = await TaskService.createTask(user.uid, formData);
      
      // 2. Create task object
      const newTask = {
        id: taskId,
        ...formData,
        createdAt: new Date(),
      };

      // 3. Send email notification (optional - runs in background)
      await notifyTaskCreated(user.email, user.displayName, newTask);

      console.log('✅ Task created and notification sent');
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    // Your form JSX
    <form onSubmit={handleCreateTask}>
      {/* form fields */}
    </form>
  );
};
```

### Example 2: Send notification on Status Change

**In TaskCard.tsx:**

```typescript
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  userEmail: string;
  userName: string;
}

export const TaskCard = ({ task, userEmail, userName }: TaskCardProps) => {
  const { notifyTaskStatusChanged, isLoading } = useTaskNotifications();

  const handleStatusChange = async (newStatus: Task['status']) => {
    const oldStatus = task.status;

    try {
      // 1. Update task status in Firebase
      await TaskService.updateTask(task.id, { status: newStatus });

      // 2. Send notification for important status changes
      if (['completed', 'blocked'].includes(newStatus)) {
        await notifyTaskStatusChanged(userEmail, userName, task, oldStatus, newStatus);
      }

      console.log(`✅ Task status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <select 
        value={task.status} 
        onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
        disabled={isLoading}
      >
        <option value="todo">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="blocked">Blocked</option>
      </select>
      {isLoading && <span>Sending notification...</span>}
    </div>
  );
};
```

### Example 3: Send batch notification for nearly-due tasks

**In DashboardPage.tsx:**

```typescript
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { Task } from '@/types';

export const DashboardPage = () => {
  const { notifyNearlyDueTasks, checkEmailServerStatus } = useTaskNotifications();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  // Check email server status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const isRunning = await checkEmailServerStatus();
      if (isRunning) {
        console.log('✅ Email server is running');
      } else {
        console.warn('⚠️ Email server is not running');
      }
    };
    checkStatus();
  }, [checkEmailServerStatus]);

  // Send reminder for nearly-due tasks
  const handleSendReminder = async () => {
    const nearlyDueTasks = tasks.filter(task => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= tomorrow && task.status !== 'completed';
    });

    if (nearlyDueTasks.length > 0) {
      await notifyNearlyDueTasks(user.email, user.displayName, nearlyDueTasks);
    }
  };

  return (
    <div className="dashboard">
      <button onClick={handleSendReminder}>
        📧 Send Task Reminders
      </button>
      {/* Dashboard content */}
    </div>
  );
};
```

---

## Best Practices

### 1. **Don't Block User Actions**
Always run notifications asynchronously without waiting:

```typescript
// ❌ Don't do this - blocks user
await notifyTaskCreated(...);

// ✅ Do this instead - fire and forget
notifyTaskCreated(...).catch(console.error);
```

### 2. **Handle Gracefully When Email Server is Down**
The notification service automatically skips if server is unavailable:

```typescript
// This won't throw an error if email server is down
// It will just log a warning and continue
await notifyTaskCreated(userEmail, userName, task);
```

### 3. **Only Notify on Important Changes**
Don't send emails for every change - be selective:

```typescript
// ✅ Good - only notify on important events
if (['completed', 'blocked'].includes(newStatus)) {
  await notifyTaskStatusChanged(...);
}

// ❌ Bad - too many emails
await notifyTaskStatusChanged(...); // On every change
```

### 4. **Provide User Feedback**
Show loading state while notification is being sent:

```typescript
const { isLoading, error } = useTaskNotifications();

return (
  <>
    <button disabled={isLoading}>Save Task</button>
    {isLoading && <p>Sending notification...</p>}
    {error && <p style={{ color: 'red' }}>{error}</p>}
  </>
);
```

---

## Testing

### Test in Development

1. **Start email server:**
   ```bash
   npm run dev:server
   ```

2. **Send test email:**
   ```bash
   node test-email-server.js
   ```

3. **Check Mailtrap inbox:**
   Go to [mailtrap.io](https://mailtrap.io) and view received emails

### Monitor Email Logs

**Server logs** (when running `npm run dev:server`):
```
📧 Sending notification to user@example.com
✅ Email sent successfully
❌ Failed to send email: [error message]
```

---

## Troubleshooting

### Email Not Sending?

1. **Check if server is running:**
   ```bash
   # You should see this output:
   🚀 TaskSync Email Server running on http://localhost:5000
   ```

2. **Check Mailtrap credentials:**
   - Open `.env` and verify Mailtrap settings
   - Go to [mailtrap.io](https://mailtrap.io) and confirm credentials match

3. **Check browser console:**
   Look for errors in DevTools Console tab

4. **Check server logs:**
   Look at terminal running `npm run dev:server` for error messages

### Too many emails?

Mailtrap free tier has limits. You can:
- Upgrade Mailtrap plan
- Use selective notifications (only on important changes)
- Add debouncing to prevent rapid successive emails

---

## Next Steps

1. **Integrate into TaskForm** - Add notification on task creation
2. **Integrate into TaskCard** - Add notification on status change
3. **Add scheduler** - Set up cron job to send daily reminders
4. **Customize templates** - Modify email HTML in `server-utils/emailService.js`
5. **Deploy** - Move email server to production

---

## File Locations

- **Frontend hooks**: `src/hooks/useTaskNotifications.ts`
- **Backend service**: `src/services/TaskNotificationService.ts`
- **Email server**: `server.js` and `server-utils/emailService.js`
- **Email client**: `src/utils/emailClient.ts`
- **Example**: `src/components/NOTIFICATION_INTEGRATION_EXAMPLE.tsx`

---

## Questions?

Refer to:
- [Mailtrap Docs](https://mailtrap.io/inboxes)
- [Nodemailer Docs](https://nodemailer.com/)
- [Email Server Setup](EMAIL_SERVER_SETUP.md)
