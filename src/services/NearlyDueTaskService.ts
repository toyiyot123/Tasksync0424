import { getFirestore, getDoc, doc } from 'firebase/firestore';
import { Task } from '@/types';

/**
 * NearlyDueTaskService - Client-side service to send notifications for tasks due in 1 day
 * Works with tasks already loaded in the app
 * Tracks which tasks have been notified about
 */

// Track which tasks we've already sent notifications for today, persisted to localStorage
// so page refreshes don't re-send the same email.
const NEARLY_DUE_STORAGE_KEY_PREFIX = 'tasksync_nearly_due_notified_';

function getTodayKeyNearlyDue(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
}

function getNotifiedToday(): Set<string> {
  try {
    const raw = localStorage.getItem(NEARLY_DUE_STORAGE_KEY_PREFIX + getTodayKeyNearlyDue());
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markTaskNotified(taskId: string): void {
  try {
    const set = getNotifiedToday();
    set.add(taskId);
    localStorage.setItem(NEARLY_DUE_STORAGE_KEY_PREFIX + getTodayKeyNearlyDue(), JSON.stringify([...set]));
  } catch { /* ignore storage errors */ }
}

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
 * Send nearly-due notification via EmailJS
 */
async function sendNearlyDueNotificationEmail(
  userEmail: string,
  userName: string,
  nearlyDueTasks: Task[]
): Promise<void> {
  try {
    console.log(`[NearlyDueTaskService] Starting to send notification...`);
    console.log(`  Recipient Email: ${userEmail}`);
    console.log(`  Recipient Name: ${userName}`);
    console.log(`  Tasks count: ${nearlyDueTasks.length}`);

    if (!userEmail) {
      console.warn('[NearlyDueTaskService] ⚠️ No user email to send notification - EMAIL IS EMPTY/NULL');
      return;
    }

    const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
    const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_oys4rrh';
    const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_NEARLY_DUE_TEMPLATE_ID || 'template_nx6ojrh';
    const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'yHIdKseofyA7jzjcF';

    console.log(`[NearlyDueTaskService] Using EmailJS:`);
    console.log(`  Service ID: ${EMAILJS_SERVICE_ID}`);
    console.log(`  Template ID: ${EMAILJS_TEMPLATE_ID}`);

    // Build complete table structure including headers
    const taskRows = nearlyDueTasks.map(task => {
      const dueDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        : 'No due date';
      const priority = (task.priority || 'medium').toUpperCase();
      return `<tr>
          <td style="padding: 12px; border: 1px solid #ddd;">${task.title || 'Untitled'}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${priority}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${dueDate}</td>
        </tr>`;
    }).join('');

    const taskListHTML = taskRows;

    console.log(`[NearlyDueTaskService] Sending email request to EmailJS...`);
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
          subject: `TaskSync Reminder: ${nearlyDueTasks.length} task(s) due in 24 hours`,
          tasks_list: taskListHTML,
          task_count: nearlyDueTasks.length,
          app_link: window.location.origin
        }
      })
    });

    console.log(`[NearlyDueTaskService] EmailJS response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error('[NearlyDueTaskService] ❌ Failed to send notification email');
      console.error('[NearlyDueTaskService] Response status:', response.status);
      console.error('[NearlyDueTaskService] Response body:', text);
      return;
    }

    try {
      const result = await response.json();
      console.log(`📧 [NearlyDueTaskService] ✅ Sent nearly-due notification to ${userEmail}`, result);
    } catch (parseError) {
      // Sometimes EmailJS returns success with non-JSON response
      console.log(`📧 [NearlyDueTaskService] ✅ Sent nearly-due notification to ${userEmail} (response parse skipped)`);
    }
  } catch (error) {
    console.error('[NearlyDueTaskService] ❌ Error sending notification email:', error);
  }
}

/**
 * Get user email and name from Firestore, with Firebase Auth email as fallback
 */
async function getUserInfo(userId: string, fallbackEmail?: string): Promise<{ email: string; name: string } | null> {
  try {
    console.log(`[NearlyDueTaskService] Fetching user info for userId: ${userId}`);
    
    // PRIORITY 1: Use Firebase Auth email (most reliable)
    if (fallbackEmail) {
      console.log(`[NearlyDueTaskService] ✅ Using Firebase Auth email (priority):`, fallbackEmail);
      
      // Still try to get username from Firestore
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const name = data.username || data.displayName || 'User';
          console.log(`[NearlyDueTaskService] ✅ Found user info:`, { email: fallbackEmail, name });
          return { email: fallbackEmail, name };
        }
      } catch (err) {
        console.warn('[NearlyDueTaskService] Could not get Firestore data, using fallback only');
      }
      
      return { email: fallbackEmail, name: 'User' };
    }

    // PRIORITY 2: Try Firestore if no Firebase email available
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log(`[NearlyDueTaskService] User document data:`, data);
      
      const email = data.email || '';
      const name = data.username || data.displayName || 'User';
      
      if (!email) {
        console.warn(`[NearlyDueTaskService] ⚠️ No email found anywhere`);
        console.log(`[NearlyDueTaskService] Available Firestore fields:`, Object.keys(data));
      }
      
      console.log(`[NearlyDueTaskService] ✅ Found user info:`, { email, name });
      return { email, name };
    }
    
    console.log(`[NearlyDueTaskService] ⚠️ User document not found in /users/${userId}`);
    return null;
  } catch (error) {
    console.error('[NearlyDueTaskService] ❌ Error getting user info:', error);
    if (fallbackEmail) {
      console.log(`[NearlyDueTaskService] ℹ️ Using Firebase Auth email as fallback due to error`);
      return { email: fallbackEmail, name: 'User' };
    }
    return null;
  }
}

export class NearlyDueTaskService {
  /**
   * Check tasks and send notification for tasks due in exactly 1 day
   * Works with tasks already loaded in app (not by direct Firestore query)
   */
  static async checkNearlyDueTasksFromAppState(userId: string, tasks: Task[], fallbackEmail?: string): Promise<number> {
    if (!userId) {
      console.warn('NearlyDueTaskService: userId not provided');
      return 0;
    }

    if (!tasks || tasks.length === 0) {
      console.log('[NearlyDueTaskService] No tasks provided to check');
      return 0;
    }

    try {
      const now = new Date();
      let found = 0;
      const nearlyDueTasks: Task[] = [];

      console.log(`\n[NearlyDueTaskService] ========================================`);
      // Get today's date at midnight for accurate date comparison
      const todayAtMidnight = new Date();
      todayAtMidnight.setHours(0, 0, 0, 0);
      
      // Get tomorrow's date at midnight
      const tomorrowAtMidnight = new Date(todayAtMidnight);
      tomorrowAtMidnight.setDate(tomorrowAtMidnight.getDate() + 1);
      
      // Get day after tomorrow at midnight
      const dayAfterTomorrowAtMidnight = new Date(tomorrowAtMidnight);
      dayAfterTomorrowAtMidnight.setDate(dayAfterTomorrowAtMidnight.getDate() + 1);

      console.log(`[NearlyDueTaskService] Checking ${tasks.length} tasks for nearly-due status...`);
      console.log(`[NearlyDueTaskService] Today's date (midnight): ${todayAtMidnight.toISOString()}`);
      console.log(`[NearlyDueTaskService] Tomorrow's date (midnight): ${tomorrowAtMidnight.toISOString()}`);
      console.log(`[NearlyDueTaskService] ========================================`);

      for (const task of tasks) {
        
        console.log(`\n[Task] "${task.title}"`);
        console.log(`  Status: ${task.status}`);
        
        // Skip completed tasks
        if (task.status === 'completed') {
          console.log(`  → Skipped (completed)`);
          continue;
        }

        // Handle both dueDate and due_at field names
        const rawDueDate = task.dueDate || (task as any).due_at;
        console.log(`  Raw due date: ${rawDueDate}`);
        
        const dueDate = normalizeDueDate(rawDueDate);
        console.log(`  Normalized due date: ${dueDate.toISOString()}`);
        
        // Check if task is due exactly tomorrow (not today, not 2+ days away)
        const dueDateAtMidnight = new Date(dueDate);
        dueDateAtMidnight.setHours(0, 0, 0, 0);
        const isNearlyDue = Number.isFinite(dueDate.getTime()) && 
                           dueDateAtMidnight >= tomorrowAtMidnight && 
                           dueDateAtMidnight < dayAfterTomorrowAtMidnight;
        console.log(`  Is nearly due (${dueDateAtMidnight.toISOString()} in range [${tomorrowAtMidnight.toISOString()}, ${dayAfterTomorrowAtMidnight.toISOString()})): ${isNearlyDue}`);

        if (isNearlyDue) {
          // Check if we haven't notified about this task yet today
          const notifiedToday = getNotifiedToday();
          if (!notifiedToday.has(task.id)) {
            console.log(`  → 🔔 Nearly-due task! Adding to notification list...`);
            nearlyDueTasks.push(task);
            markTaskNotified(task.id);
            found++;
          } else {
            console.log(`  → Already notified about this task today`);
          }
        } else {
          console.log(`  → Not nearly due`);
        }
      }

      console.log(`\n[NearlyDueTaskService] ========================================`);
      console.log(`[NearlyDueTaskService] Summary:`);
      console.log(`  Checked: ${tasks.length} tasks`);
      console.log(`  Nearly due: ${found} tasks`);
      console.log(`[NearlyDueTaskService] ========================================\n`);

      // Send notification if there are nearly-due tasks
      if (nearlyDueTasks.length > 0) {
        console.log(`\n[NearlyDueTaskService] 🔔 Attempting to send nearly-due notification for ${nearlyDueTasks.length} task(s)...`);
        try {
          console.log(`[NearlyDueTaskService] Getting user info...`);
          const userInfo = await getUserInfo(userId, fallbackEmail);
          
          if (!userInfo) {
            console.warn(`[NearlyDueTaskService] ⚠️ Could not retrieve user info`);
          } else if (!userInfo.email) {
            console.warn(`[NearlyDueTaskService] ⚠️ User has no email address`);
          } else {
            console.log(`[NearlyDueTaskService] ✅ User info retrieved, sending notification...`);
            await sendNearlyDueNotificationEmail(userInfo.email, userInfo.name, nearlyDueTasks);
          }
        } catch (error) {
          console.error('[NearlyDueTaskService] ❌ Error sending notification:', error);
        }
      } else {
        console.log(`[NearlyDueTaskService] ℹ️ No new nearly-due tasks to notify about`);
      }

      return found;
    } catch (error) {
      console.error('Error checking nearly-due tasks:', error);
      return 0;
    }
  }

  /**
   * Set up periodic checks for nearly-due tasks
   * Runs every 5 minutes while app is open
   */
  static setupPeriodicCheck(userId: string, tasks: Task[], fallbackEmail?: string, intervalMinutes: number = 5): () => void {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Run once immediately
    this.checkNearlyDueTasksFromAppState(userId, tasks, fallbackEmail);

    // Then run periodically
    const intervalId = setInterval(() => {
      this.checkNearlyDueTasksFromAppState(userId, tasks, fallbackEmail);
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Reset notified tasks for testing/debugging
   * Call from console: debugResetNearlyDueNotified()
   */
  static debugResetNotified(): void {
    try {
      const key = NEARLY_DUE_STORAGE_KEY_PREFIX + getTodayKeyNearlyDue();
      localStorage.removeItem(key);
      console.log(`[NearlyDueTaskService] ✅ All notified task IDs cleared from localStorage`);
    } catch {
      console.warn('[NearlyDueTaskService] Could not clear localStorage');
    }
  }
}
