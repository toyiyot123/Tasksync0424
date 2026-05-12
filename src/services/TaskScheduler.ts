/**
 * Task Notification Scheduler
 * Automatically sends email reminders on a schedule
 * 
 * Runs in background after app starts
 */

import cron from 'node-cron';
import { TaskNotificationService } from './TaskNotificationService';
import { TaskService } from './TaskService';

export class TaskScheduler {
  private static initialized = false;

  /**
   * Initialize scheduled tasks
   * Call this once when app starts
   */
  static async initialize(userId: string, userEmail: string, userName: string) {
    if (this.initialized) return;

    console.log('📅 Initializing task scheduler...');

    // Send nearly-due reminder every day at 9 AM
    this.scheduleNearlyDueReminder(userId, userEmail, userName);

    // Send overdue alert every day at 5 PM
    this.scheduleOverdueAlert(userId, userEmail, userName);

    this.initialized = true;
    console.log('✅ Task scheduler initialized');
  }

  /**
   * Schedule nearly-due task reminders
   * Every day at 9:00 AM
   */
  private static scheduleNearlyDueReminder(
    userId: string,
    userEmail: string,
    userName: string
  ) {
    // Cron: "0 9 * * *" means every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('📧 Running scheduled nearly-due task reminder...');
        
        // Get all user tasks
        const tasks = await TaskService.getUserTasks(userId);
        
        // Get only nearly-due tasks
        const nearlyDueTasks = TaskNotificationService.getNearlyDueTasks(tasks);
        
        if (nearlyDueTasks.length > 0) {
          await TaskNotificationService.notifyNearlyDueTasks(
            userEmail,
            userName,
            nearlyDueTasks
          );
          console.log(`✅ Sent reminder for ${nearlyDueTasks.length} nearly-due task(s)`);
        } else {
          console.log('ℹ️ No nearly-due tasks to remind about');
        }
      } catch (error) {
        console.error('❌ Error sending scheduled reminder:', error);
      }
    });
  }

  /**
   * Schedule overdue task alerts
   * Every day at 5:00 PM
   */
  private static scheduleOverdueAlert(
    userId: string,
    userEmail: string,
    userName: string
  ) {
    // Cron: "0 17 * * *" means every day at 5:00 PM (17:00)
    cron.schedule('0 17 * * *', async () => {
      try {
        console.log('📧 Running scheduled overdue task alert...');
        
        // Get all user tasks
        const tasks = await TaskService.getUserTasks(userId);
        
        // Get only overdue tasks
        const overdueTasks = TaskNotificationService.getOverdueTasks(tasks);
        
        if (overdueTasks.length > 0) {
          await TaskNotificationService.notifyOverdueTasks(
            userEmail,
            userName,
            overdueTasks
          );
          console.log(`✅ Sent alert for ${overdueTasks.length} overdue task(s)`);
        } else {
          console.log('ℹ️ No overdue tasks');
        }
      } catch (error) {
        console.error('❌ Error sending scheduled alert:', error);
      }
    });
  }

  /**
   * Custom schedule - Set your own times
   * 
   * Example:
   * TaskScheduler.scheduleCustom('0 10 * * *', () => {
   *   // Runs every day at 10 AM
   * });
   */
  static scheduleCustom(cronExpression: string, callback: () => void) {
    cron.schedule(cronExpression, callback);
    console.log(`📅 Custom schedule added: ${cronExpression}`);
  }
}

