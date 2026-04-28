import { getFirestore, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';

/**
 * OverdueTaskService - Client-side service to update task statuses to 'overdue'
 * Works with tasks already loaded in the app
 * Tracks which tasks have been notified about
 */

// Track which tasks we've already sent notifications for (taskId -> timestamp)
const notifiedTaskIds = new Map<string, number>();

function normalizeDueDate(dueDate: any): Date {
  if (!dueDate) {
    return new Date(0);
  }

  if (dueDate instanceof Date) {
    return dueDate;
  }

  if (typeof dueDate === 'string') {
    return new Date(dueDate);
  }

  if (dueDate.toDate && typeof dueDate.toDate === 'function') {
    return dueDate.toDate();
  }

  return new Date(0);
}

/**
 * Send overdue notification via EmailJS
 */
async function sendOverdueNotificationEmail(
  userEmail: string,
  userName: string,
  overdueTasks: Task[]
): Promise<void> {
  try {
    console.log(`[OverdueTaskService] Starting to send notification...`);
    console.log(`  Recipient Email: ${userEmail}`);
    console.log(`  Recipient Name: ${userName}`);
    console.log(`  Tasks count: ${overdueTasks.length}`);

    if (!userEmail) {
      console.warn('[OverdueTaskService] ⚠️ No user email to send notification - EMAIL IS EMPTY/NULL');
      return;
    }

    const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
    const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_mjgbtih';
    const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_OVERDUE_TEMPLATE_ID || 'template_ztabchb';
    const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '9Dw-9GkNwVvoLmb1q';

    console.log(`[OverdueTaskService] Using EmailJS:`);
    console.log(`  Service ID: ${EMAILJS_SERVICE_ID}`);
    console.log(`  Template ID: ${EMAILJS_TEMPLATE_ID}`);

    const taskListHTML = overdueTasks.map(task => {
      const dueDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        : 'No due date';
      const priority = (task.priority || task.priority_manual || 'medium').toUpperCase();
      // Format as proper HTML table rows with better escaping handling
      return `
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd;">${task.title || 'Untitled'}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${priority}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${dueDate}</td>
        </tr>
      `;
    }).join('');

    console.log(`[OverdueTaskService] Sending email request to EmailJS...`);
    console.log(`  to_email param: ${userEmail}`);
    console.log(`  to_name param: ${userName}`);
    
    const response = await fetch(EMAILJS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: userEmail,
          user_name: userName || 'User',
          subject: `TaskSync Alert: ${overdueTasks.length} overdue task(s)`,
          tasks_list: taskListHTML,
          task_count: overdueTasks.length,
          app_link: window.location.origin
        }
      })
    });

    console.log(`[OverdueTaskService] EmailJS response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error('[OverdueTaskService] ❌ Failed to send notification email');
      console.error('[OverdueTaskService] Response status:', response.status);
      console.error('[OverdueTaskService] Response body:', text);
      return;
    }

    try {
      const result = await response.json();
      console.log(`📧 [OverdueTaskService] ✅ Sent overdue notification to ${userEmail}`, result);
    } catch (parseError) {
      // Sometimes EmailJS returns success with non-JSON response
      console.log(`📧 [OverdueTaskService] ✅ Sent overdue notification to ${userEmail} (response parse skipped)`);
    }
  } catch (error) {
    console.error('[OverdueTaskService] ❌ Error sending notification email:', error);
  }
}

/**
 * Get user email and name from Firestore, with Firebase Auth email as fallback
 */
async function getUserInfo(userId: string, fallbackEmail?: string): Promise<{ email: string; name: string } | null> {
  try {
    console.log(`[OverdueTaskService] Fetching user info for userId: ${userId}`);
    
    // PRIORITY 1: Use Firebase Auth email (most reliable)
    if (fallbackEmail) {
      console.log(`[OverdueTaskService] ✅ Using Firebase Auth email (priority):`, fallbackEmail);
      
      // Still try to get username from Firestore
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const name = data.username || data.displayName || 'User';
          console.log(`[OverdueTaskService] ✅ Found user info:`, { email: fallbackEmail, name });
          return { email: fallbackEmail, name };
        }
      } catch (err) {
        console.warn('[OverdueTaskService] Could not get Firestore data, using fallback only');
      }
      
      return { email: fallbackEmail, name: 'User' };
    }

    // PRIORITY 2: Try Firestore if no Firebase email available
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log(`[OverdueTaskService] User document data:`, data);
      
      const email = data.email || '';
      const name = data.username || data.displayName || 'User';
      
      if (!email) {
        console.warn(`[OverdueTaskService] ⚠️ No email found anywhere`);
        console.log(`[OverdueTaskService] Available Firestore fields:`, Object.keys(data));
      }
      
      console.log(`[OverdueTaskService] ✅ Found user info:`, { email, name });
      return { email, name };
    }
    
    console.log(`[OverdueTaskService] ⚠️ User document not found in /users/${userId}`);
    return null;
  } catch (error) {
    console.error('[OverdueTaskService] ❌ Error getting user info:', error);
    if (fallbackEmail) {
      console.log(`[OverdueTaskService] ℹ️ Using Firebase Auth email as fallback due to error`);
      return { email: fallbackEmail, name: 'User' };
    }
    return null;
  }
}

export class OverdueTaskService {
  /**
   * Check tasks and update status to 'overdue' if due date has passed
   * Works with tasks already loaded in app (not by direct Firestore query)
   */
  static async updateOverdueTasksFromAppState(userId: string, tasks: Task[], fallbackEmail?: string): Promise<number> {
    if (!userId) {
      console.warn('OverdueTaskService: userId not provided');
      return 0;
    }

    if (!tasks || tasks.length === 0) {
      console.log('[OverdueTaskService] No tasks provided to check');
      return 0;
    }

    try {
      const db = getFirestore();
      const now = new Date();
      let updated = 0;
      let checked = 0;
      const updatedTasks: Task[] = [];
      const alreadyOverdueNotified: Task[] = [];

      console.log(`\n[OverdueTaskService] ========================================`);
      // Get today's date at midnight for accurate date comparison
      const todayAtMidnight = new Date();
      todayAtMidnight.setHours(0, 0, 0, 0);

      console.log(`[OverdueTaskService] Checking ${tasks.length} tasks for overdue status...`);
      console.log(`[OverdueTaskService] Today's date (midnight): ${todayAtMidnight.toISOString()}`);
      console.log(`[OverdueTaskService] ========================================`);

      for (const task of tasks) {
        checked++;
        
        console.log(`\n[Task ${checked}/${tasks.length}] "${task.title}"`);
        console.log(`  Status: ${task.status}`);
        
        // Handle both dueDate and due_at field names
        const rawDueDate = task.dueDate || (task as any).due_at;
        console.log(`  Raw due date: ${rawDueDate}`);
        
        const dueDate = normalizeDueDate(rawDueDate);
        console.log(`  Normalized due date: ${dueDate.toISOString()}`);
        
        // Check if task is overdue (compare only dates, not times)
        // A task is overdue only if due date is BEFORE today (not today itself)
        const dueDateAtMidnight = new Date(dueDate);
        dueDateAtMidnight.setHours(0, 0, 0, 0);
        const isOverdue = Number.isFinite(dueDate.getTime()) && dueDateAtMidnight < todayAtMidnight;
        console.log(`  Is overdue (${dueDate.toISOString()} < ${now.toISOString()}): ${isOverdue}`);
        
        // Skip completed tasks
        if (task.status === 'completed') {
          console.log(`  → Skipped (completed)`);
          continue;
        }

        if (task.status === 'overdue') {
          console.log(`  → Already marked as overdue`);
          // Check if we haven't notified about this task yet
          if (!notifiedTaskIds.has(task.id)) {
            // IMPORTANT: Re-verify the task is actually still overdue before notifying
            if (isOverdue) {
              console.log(`  → 🔔 Not yet notified! Adding to notification list...`);
              alreadyOverdueNotified.push(task);
              notifiedTaskIds.set(task.id, now.getTime());
            } else {
              console.log(`  → Task marked overdue but due date is not actually past due, skipping notification`);
            }
          }
          continue;
        }

        if (isOverdue) {
          try {
            console.log(`  ⏳ Updating to 'overdue' in Firestore...`);
            
            await updateDoc(doc(db, 'tasks', task.id), {
              status: 'overdue',
              updated_at: serverTimestamp()
            });
            
            // Also update in Zustand store to keep UI in sync
            const store = useTaskStore.getState();
            store.updateTask(task.id, { status: 'overdue' });
            
            updated++;
            updatedTasks.push(task);
            notifiedTaskIds.set(task.id, now.getTime());
            console.log(`  ✅ Successfully updated!`);
          } catch (error) {
            console.error(`  ❌ Failed to update:`, error);
          }
        } else {
          console.log(`  → Not overdue yet`);
        }
      }

      console.log(`\n[OverdueTaskService] ========================================`);
      console.log(`[OverdueTaskService] Summary:`);
      console.log(`  Checked: ${checked} tasks`);
      console.log(`  Updated: ${updated} tasks`);
      console.log(`  Already overdue (not yet notified): ${alreadyOverdueNotified.length} tasks`);
      console.log(`[OverdueTaskService] ========================================\n`);

      // Combine updated tasks and already-overdue tasks that need notification
      const tasksToNotify = [...updatedTasks, ...alreadyOverdueNotified];

      // Send notification if there are overdue tasks
      if (tasksToNotify.length > 0) {
        console.log(`\n[OverdueTaskService] 🔔 Attempting to send overdue notification for ${tasksToNotify.length} task(s)...`);
        try {
          console.log(`[OverdueTaskService] Getting user info...`);
          const userInfo = await getUserInfo(userId, fallbackEmail);
          
          if (!userInfo) {
            console.warn(`[OverdueTaskService] ⚠️ Could not retrieve user info`);
          } else if (!userInfo.email) {
            console.warn(`[OverdueTaskService] ⚠️ User has no email address`);
          } else {
            console.log(`[OverdueTaskService] ✅ User info retrieved, sending notification...`);
            await sendOverdueNotificationEmail(userInfo.email, userInfo.name, tasksToNotify);
          }
        } catch (error) {
          console.error('[OverdueTaskService] ❌ Error sending notification:', error);
        }
      } else {
        console.log(`[OverdueTaskService] ℹ️ No new overdue tasks to notify about`);
      }

      return updated;
    } catch (error) {
      console.error('Error updating overdue tasks:', error);
      return 0;
    }
  }

  /**
   * Set up periodic checks for overdue tasks
   * Runs every 5 minutes while app is open
   */
  static setupPeriodicCheck(userId: string, tasks: Task[], intervalMinutes: number = 5): () => void {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Run once immediately
    this.updateOverdueTasksFromAppState(userId, tasks);

    // Then run periodically
    const intervalId = setInterval(() => {
      this.updateOverdueTasksFromAppState(userId, tasks);
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Manually update a specific task's status to overdue
   * Can be called from console: updateTaskToOverdue(taskId)
   */
  static async updateTaskToOverdue(userId: string, taskId: string, task?: Task): Promise<boolean> {
    if (!taskId) {
      console.error('updateTaskToOverdue: taskId required');
      return false;
    }

    try {
      const db = getFirestore();
      const taskRef = doc(db, 'tasks', taskId);
      
      console.log(`\n[OverdueTaskService] Manually updating task ${taskId} to overdue...`);
      
      await updateDoc(taskRef, {
        status: 'overdue',
        updated_at: serverTimestamp()
      });
      
      // Also update in Zustand store to keep UI in sync
      const store = useTaskStore.getState();
      store.updateTask(taskId, { status: 'overdue' });
      
      console.log(`✅ Task ${taskId} successfully updated to 'overdue' status!`);

      // Send notification if task info is available
      if (task) {
        console.log(`[OverdueTaskService] Sending notification for task ${taskId}...`);
        try {
          const userInfo = await getUserInfo(userId);
          if (userInfo && userInfo.email) {
            await sendOverdueNotificationEmail(userInfo.email, userInfo.name, [task]);
          }
        } catch (error) {
          console.error('[OverdueTaskService] Error sending notification:', error);
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to update task ${taskId}:`, error);
      return false;
    }
  }
}

