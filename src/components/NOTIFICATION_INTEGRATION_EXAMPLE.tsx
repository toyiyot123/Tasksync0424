/**
 * Example: Using Task Notifications in a Component
 * 
 * This example shows how to integrate email notifications
 * into your TaskForm or any task-related component.
 */

import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { Task } from '@/types';
import { useState } from 'react';

export const TaskNotificationExample = () => {
  const { notifyTaskCreated, notifyNearlyDueTasks, isLoading, error } = useTaskNotifications();
  const [userEmail] = useState('user@example.com'); // Get from user context
  const [userName] = useState('User Name'); // Get from user context

  /**
   * Example: Send notification when creating a task
   */
  const handleCreateTaskWithNotification = async (task: Task) => {
    // 1. Create the task in Firebase (your existing code)
    // const taskId = await TaskService.createTask(userId, taskData);

    // 2. Send email notification
    await notifyTaskCreated(userEmail, userName, task);
  };

  /**
   * Example: Send batch notification for nearly due tasks
   */
  const handleSendNearlyDueNotification = async (tasks: Task[]) => {
    const nearlyDueTasks = tasks.filter(task => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= tomorrow && task.status !== 'completed';
    });

    if (nearlyDueTasks.length > 0) {
      await notifyNearlyDueTasks(userEmail, userName, nearlyDueTasks);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {isLoading && <div className="loading">Sending notification...</div>}
      {/* Your component JSX here */}
    </div>
  );
};

/**
 * Integration in TaskForm:
 * 
 * import { useTaskNotifications } from '@/hooks/useTaskNotifications';
 * 
 * export const TaskForm = () => {
 *   const { notifyTaskCreated } = useTaskNotifications();
 *   const [user] = useContext(UserContext);
 * 
 *   const handleSubmit = async (formData) => {
 *     // Create task
 *     const taskId = await TaskService.createTask(user.id, formData);
 *     const newTask = { ...formData, id: taskId };
 * 
 *     // Send notification
 *     await notifyTaskCreated(user.email, user.name, newTask);
 *   };
 * 
 *   return (
 *     // Your form JSX
 *   );
 * };
 */

/**
 * Integration in TaskCard (Status Change):
 * 
 * import { useTaskNotifications } from '@/hooks/useTaskNotifications';
 * 
 * export const TaskCard = ({ task, user }) => {
 *   const { notifyTaskStatusChanged } = useTaskNotifications();
 * 
 *   const handleStatusChange = async (newStatus) => {
 *     const oldStatus = task.status;
 * 
 *     // Update task
 *     await TaskService.updateTask(task.id, { status: newStatus });
 * 
 *     // Send notification
 *     await notifyTaskStatusChanged(
 *       user.email,
 *       user.name,
 *       task,
 *       oldStatus,
 *       newStatus
 *     );
 *   };
 * 
 *   return (
 *     // Your card JSX with status update handler
 *   );
 * };
 */
