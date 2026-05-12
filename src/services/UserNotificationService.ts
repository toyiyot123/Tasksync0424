/**
 * User Notification Service
 * Fetches all users from Firebase and sends notifications about nearly-due tasks
 */

import { db } from '../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Task, UserProfile } from '../types';

export class UserNotificationService {
  private static readonly EMAIL_SERVER_URL = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:5000';
  private static readonly SERVER_SECRET = import.meta.env.VITE_SERVER_SECRET || '';

  /**
   * Get all users from Firebase
   */
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const usersCollection = collection(db, 'users');
      const snapshot = await getDocs(usersCollection);
      
      const users: UserProfile[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          name: data.displayName || data.name || 'User',
          email: data.email,
          preferences: data.preferences || {
            theme: 'light',
            workingHours: { start: 9, end: 17 },
            breakDuration: 15,
          },
        });
      });
      
      return users;
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get user's tasks that are nearly due (within 24 hours)
   */
  static async getUserNearlyDueTasks(userId: string): Promise<Task[]> {
    try {
      const tasksCollection = collection(db, 'users', userId, 'tasks');
      
      // Query for non-completed tasks
      const tasksQuery = query(
        tasksCollection,
        where('status', '!=', 'completed')
      );
      
      const snapshot = await getDocs(tasksQuery);
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const tasks: Task[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const dueDate = data.dueDate instanceof Timestamp 
          ? data.dueDate.toDate() 
          : new Date(data.dueDate);
        
        // Filter for nearly-due tasks
        if (dueDate >= now && dueDate <= tomorrow && data.status !== 'completed') {
          tasks.push({
            id: doc.id,
            title: data.title || 'Untitled',
            description: data.description || '',
            dueDate,
            priority: data.priority || 'medium',
            status: data.status,
            category: data.category || '',
            tags: data.tags || [],
            estimatedTime: data.estimatedTime || 0,
            actualTime: data.actualTime || 0,
            subtasks: data.subtasks || [],
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
          });
        }
      });
      
      return tasks;
    } catch (error) {
      console.error(`❌ Error fetching tasks for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Send notifications to all users about their nearly-due tasks
   */
  static async sendNotificationsToAllUsers(): Promise<void> {
    try {
      console.log('📧 Starting to send notifications to all users...\n');
      
      const users = await this.getAllUsers();
      console.log(`👥 Found ${users.length} user(s)\n`);
      
      if (users.length === 0) {
        console.log('ℹ️ No users to notify');
        return;
      }
      
      let successCount = 0;
      let totalTasksNotified = 0;
      
      for (const user of users) {
        try {
          console.log(`📨 Processing user: ${user.email}`);
          
          const nearlyDueTasks = await this.getUserNearlyDueTasks(user.id);
          
          if (nearlyDueTasks.length === 0) {
            console.log(`  ℹ️ No nearly-due tasks for ${user.email}\n`);
            continue;
          }
          
          console.log(`  📋 Found ${nearlyDueTasks.length} nearly-due task(s)`);
          
          // Send notification to this user
          const success = await this.sendNotificationToUser(user, nearlyDueTasks);
          
          if (success) {
            successCount++;
            totalTasksNotified += nearlyDueTasks.length;
            console.log(`  ✅ Notification sent to ${user.email}\n`);
          } else {
            console.log(`  ❌ Failed to send notification to ${user.email}\n`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing user ${user.email}:`, error);
        }
      }
      
      console.log(`\n✅ Completed! Sent notifications to ${successCount}/${users.length} user(s)`);
      console.log(`📊 Total tasks notified: ${totalTasksNotified}`);
    } catch (error) {
      console.error('❌ Error in sendNotificationsToAllUsers:', error);
    }
  }

  /**
   * Send notification to a specific user
   */
  private static async sendNotificationToUser(
    user: UserProfile,
    tasks: Task[]
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.EMAIL_SERVER_URL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-server-secret': this.SERVER_SECRET
        },
        body: JSON.stringify({
          toEmail: user.email,
          userName: user.name,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate.toISOString(),
            priority: task.priority,
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`    Error response: ${error.error}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`    Network error:`, error);
      return false;
    }
  }
}
