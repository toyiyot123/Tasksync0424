/**
 * Task Notification Service
 * Handles email notifications for task events
 */

import emailClient from '@/utils/emailClient';
import { Task } from '@/types';

export class TaskNotificationService {
  // Note: EMAIL_SERVER_URL is available for future use

  /**
   * Check if email server is running
   */
  static async isEmailServerRunning(): Promise<boolean> {
    try {
      return await emailClient.checkServer();
    } catch {
      console.warn('⚠️ Email server is not running');
      return false;
    }
  }

  /**
   * Task creation notifications disabled
   */
  static async notifyTaskCreated(): Promise<void> {
    // Disabled
  }

  /**
   * Task status change notifications disabled
   */
  static async notifyTaskStatusChanged(): Promise<void> {
    // Disabled
  }

  /**
   * Send reminder for overdue tasks
   */
  static async notifyOverdueTasks(
    userEmail: string,
    userName: string,
    overdueTasks: Task[]
  ): Promise<void> {
    try {
      const isRunning = await this.isEmailServerRunning();
      if (!isRunning) return;

      if (overdueTasks.length === 0) return;

      console.log(`📧 Sending overdue tasks notification to ${userEmail}`);
      
      await emailClient.sendNotification(userEmail, userName, overdueTasks);
    } catch (error) {
      console.error('Error sending overdue tasks notification:', error);
    }
  }

  /**
   * Send reminder for nearly due tasks (within 24 hours)
   */
  static async notifyNearlyDueTasks(
    userEmail: string,
    userName: string,
    nearlyDueTasks: Task[]
  ): Promise<void> {
    try {
      const isRunning = await this.isEmailServerRunning();
      if (!isRunning) return;

      if (nearlyDueTasks.length === 0) return;

      console.log(`📧 Sending nearly-due tasks notification to ${userEmail}`);
      
      await emailClient.sendNotification(userEmail, userName, nearlyDueTasks);
    } catch (error) {
      console.error('Error sending nearly-due tasks notification:', error);
    }
  }

  /**
   * Helper: Get tasks due within 24 hours
   */
  static getNearlyDueTasks(tasks: Task[]): Task[] {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      if (!task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= tomorrow;
    });
  }

  /**
   * Helper: Get overdue tasks
   */
  static getOverdueTasks(tasks: Task[]): Task[] {
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      if (!task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      const dueDateAtMidnight = new Date(dueDate);
      dueDateAtMidnight.setHours(0, 0, 0, 0);
      
      return dueDateAtMidnight < todayAtMidnight;
    });
  }
}
