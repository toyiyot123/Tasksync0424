/**
 * TaskServiceWithNotifications
 * Wraps TaskService to automatically send email notifications
 * 
 * Usage:
 * Instead of: TaskService.createTask(userId, data)
 * Use: TaskServiceWithNotifications.createTask(userId, data, userEmail, userName)
 */

import { TaskService } from './TaskService';
import { TaskNotificationService } from './TaskNotificationService';
import { Task } from '@/types';

export class TaskServiceWithNotifications {
  /**
   * Create task and send notification email
   */
  static async createTaskWithNotification(
    userId: string,
    taskData: any,
    userEmail: string,
    userName: string
  ): Promise<string> {
    try {
      console.log('📝 Creating task...');
      
      // 1. Create task in Firebase
      const taskId = await TaskService.createTask(userId, taskData);
      console.log(`✅ Task created: ${taskId}`);

      // 2. Create task object for notification
      const newTask: Partial<Task> = {
        id: taskId,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.due_at?.toDate?.() || new Date(taskData.due_at),
        priority: taskData.priority_manual || 'medium',
        createdAt: new Date(),
      };

      // 3. Email notifications disabled for task creation

      return taskId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update task status and send notification if important change
   */
  static async updateTaskStatusWithNotification(
    taskId: string,
    newStatus: Task['status'],
    currentTask: Task,
    userEmail: string,
    userName: string
  ): Promise<void> {
    try {
      const oldStatus = currentTask.status;
      console.log(`📝 Updating task status: ${oldStatus} → ${newStatus}`);

      // 1. Update in Firebase
      await TaskService.updateTask(taskId, { status: newStatus });
      console.log(`✅ Task status updated`);

      // 2. Email notifications disabled for status changes
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Send reminder for nearly due tasks
   */
  static async sendNearlyDueReminders(
    tasks: Task[],
    userEmail: string,
    userName: string
  ): Promise<void> {
    try {
      const nearlyDueTasks = TaskNotificationService.getNearlyDueTasks(tasks);
      
      if (nearlyDueTasks.length > 0) {
        console.log(`📧 Sending reminder for ${nearlyDueTasks.length} nearly-due task(s)`);
        
        await TaskNotificationService.notifyNearlyDueTasks(
          userEmail,
          userName,
          nearlyDueTasks
        );
        
        console.log('✅ Reminder sent');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw error;
    }
  }

  /**
   * Send alert for overdue tasks
   */
  static async sendOverdueAlerts(
    tasks: Task[],
    userEmail: string,
    userName: string
  ): Promise<void> {
    try {
      const overdueTasks = TaskNotificationService.getOverdueTasks(tasks);
      
      if (overdueTasks.length > 0) {
        console.log(`📧 Sending alert for ${overdueTasks.length} overdue task(s)`);
        
        await TaskNotificationService.notifyOverdueTasks(
          userEmail,
          userName,
          overdueTasks
        );
        
        console.log('✅ Alert sent');
      }
    } catch (error) {
      console.error('Error sending overdue alert:', error);
      throw error;
    }
  }
}
