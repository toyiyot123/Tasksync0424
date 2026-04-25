# Automatic Email Notification Integration

## Quick Integration (3 Steps)

### Step 1: Import the hook in your Task Page/Component

```typescript
import { useTaskManager } from '@/hooks/useTaskManager';
import { useAuth } from '@/context/AuthContext'; // Your auth context
```

### Step 2: Initialize the hook with user info

```typescript
export const TasksPage = () => {
  const { user } = useAuth(); // Get current user
  
  // Initialize with user email and name - emails will send automatically
  const { createTask, updateTaskStatus, isLoading, error } = useTaskManager({
    userEmail: user?.email || '',
    userName: user?.displayName || '',
  });
  
  // Rest of component...
};
```

### Step 3: Use it in your handlers

Replace your task operations with the notification-enabled versions:

```typescript
// When creating a task
const handleCreateTask = async (taskData) => {
  try {
    const taskId = await createTask(user.uid, taskData);
    // Task created + email notification sent automatically! 🎉
  } catch (error) {
    console.error('Failed:', error);
  }
};

// When updating task status
const handleStatusChange = async (task, newStatus) => {
  try {
    await updateTaskStatus(task.id, newStatus, task);
    // Status updated + email notification sent automatically! 🎉
  } catch (error) {
    console.error('Failed:', error);
  }
};
```

---

## Complete Example: TasksPage Integration

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskManager } from '@/hooks/useTaskManager';
import { TaskForm } from '@/components/TaskForm';
import { TaskCard } from '@/components/TaskCard';
import { Task } from '@/types';

export const TasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  
  // ✨ Initialize task manager with auto-notifications
  const { createTask, updateTaskStatus, isLoading, error } = useTaskManager({
    userEmail: user?.email,
    userName: user?.displayName,
  });

  // Load tasks from Firebase
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      // Your existing task loading logic
      // const tasks = await TaskService.getUserTasks(user.uid);
      // setTasks(tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  // ✨ Create task with automatic email notification
  const handleCreateTask = async (formData: Partial<Task>) => {
    try {
      const taskId = await createTask(user.uid, {
        title: formData.title,
        description: formData.description,
        priority_manual: formData.priority,
        due_at: formData.dueDate,
        category_id: formData.categoryId,
        // ... other fields
      });

      // Reload tasks
      await loadTasks();
      setShowTaskForm(false);
      console.log('✅ Task created and notification sent!');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // ✨ Update task status with automatic email notification
  const handleTaskStatusChange = async (task: Task, newStatus: Task['status']) => {
    try {
      await updateTaskStatus(task.id, newStatus, task);
      
      // Update local state
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, status: newStatus } : t
      ));
      
      console.log('✅ Task updated and notification sent!');
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  // ✨ Send daily reminder for nearly-due tasks
  const handleSendReminder = async () => {
    const { sendNearlyDueReminder } = useTaskManager({
      userEmail: user?.email,
      userName: user?.displayName,
    });
    
    await sendNearlyDueReminder(tasks);
  };

  return (
    <div className="tasks-page">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1>My Tasks</h1>
        <div>
          <button 
            onClick={() => setShowTaskForm(true)}
            className="btn-primary"
            disabled={isLoading}
          >
            ➕ New Task
          </button>
          <button 
            onClick={handleSendReminder}
            className="btn-secondary ml-2"
            disabled={isLoading}
          >
            📧 Send Reminders
          </button>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="alert alert-error mb-4">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && <p>Processing...</p>}

      {/* Task form modal */}
      {showTaskForm && (
        <TaskForm 
          onSubmit={handleCreateTask}
          onClose={() => setShowTaskForm(false)}
        />
      )}

      {/* Tasks list */}
      <div className="tasks-grid">
        {tasks.map(task => (
          <TaskCard 
            key={task.id}
            task={task}
            onStatusChange={(newStatus) => handleTaskStatusChange(task, newStatus)}
            disabled={isLoading}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## What Happens Automatically

### When Task is Created ✉️
1. Task is saved to Firebase
2. Email sent to user with task details
3. User gets instant confirmation

### When Status Changes ✉️
- **To "Completed"**: User gets congratulations email
- **To "Blocked"**: User gets warning email
- Other statuses: No email (optional)

### On-Demand Features 📧
```typescript
// Send reminder for nearly-due tasks
await sendNearlyDueReminder(tasks);

// Send alert for overdue tasks  
await sendOverdueAlert(tasks);
```

---

## Error Handling

```typescript
const { isLoading, error } = useTaskManager({...});

// Show loading state
{isLoading && <p>Sending email...</p>}

// Show error if any
{error && <p style={{color: 'red'}}>{error}</p>}
```

---

## Best Practices

### ✅ Do This
```typescript
// Fire and forget - notification runs in background
await createTask(userId, taskData); // Returns immediately
// User doesn't wait for email to send
```

### ❌ Don't Do This
```typescript
// Don't make user wait for email to send
const startTime = Date.now();
await createTask(userId, taskData);
// Takes 2-3 seconds while sending email
```

---

## Files You Need

- `src/hooks/useTaskManager.ts` - React hook for easy integration
- `src/services/TaskServiceWithNotifications.ts` - Service with notifications
- `src/services/TaskNotificationService.ts` - Notification business logic
- `src/utils/emailClient.ts` - Frontend email API
- `server.js` - Express email server
- `server-utils/emailService.js` - Email sending logic

---

## Troubleshooting

**Email not sending?**
1. Check if server is running: `npm run dev:server`
2. Check console logs for errors
3. Verify user email is provided to hook
4. Check Mailtrap/Gmail inbox for actual emails

**Too many emails?**
- Emails only sent for important changes (creation, completed, blocked)
- Customize which changes trigger emails in `TaskNotificationService.ts`

**Want to disable notifications?**
- Don't pass `userEmail` to the hook
- Or don't use `useTaskManager`, use regular `TaskService` instead

---

## Next Steps

1. ✅ Replace `TaskService` calls with `useTaskManager` in your components
2. ✅ Test by creating a task
3. ✅ Verify email arrives
4. ✅ Deploy to production!

That's it! Your notification system is now automatically integrated! 🎉
