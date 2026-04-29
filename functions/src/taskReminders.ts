import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_mjgbtih';
const EMAILJS_NEARLY_DUE_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_4dxvv8d';
const EMAILJS_OVERDUE_TEMPLATE_ID = process.env.EMAILJS_OVERDUE_TEMPLATE_ID || 'template_ztabchb';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '9Dw-9GkNwVvoLmb1q';
const APP_LINK = process.env.FRONTEND_URL || 'https://tasksync-70aa9.web.app';

type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'overdue';

type ScheduledTask = {
  id: string;
  title?: string;
  description?: string;
  dueDate?: admin.firestore.Timestamp | string | Date;
  due_at?: admin.firestore.Timestamp | string | Date; // Support both field names
  priority?: 'low' | 'medium' | 'high';
  priority_manual?: 'low' | 'medium' | 'high'; // Support both field names
  status?: TaskStatus;
};

type TaskUser = {
  id: string;
  email?: string;
  displayName?: string;
  name?: string;
};

function normalizeDueDate(dueDate: ScheduledTask['dueDate'] | ScheduledTask['due_at']): Date {
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

function formatDueDate(task: ScheduledTask): string {
  const dueDate = normalizeDueDate(task.dueDate);

  if (!Number.isFinite(dueDate.getTime())) {
    return 'No due date';
  }

  return dueDate.toLocaleString();
}

function formatPriority(task: ScheduledTask): string {
  return (task.priority || 'medium').toUpperCase();
}

async function sendEmailWithEmailJS(
  toEmail: string,
  toName: string,
  subject: string,
  tasks: ScheduledTask[],
  templateId: string
): Promise<void> {
  // Build task table HTML with header row for consistent layout
  const taskRows = tasks.map(task => {
    const dueDate = formatDueDate(task);
    const priority = formatPriority(task);
    
    return `<tr style="background-color: #ffffff;">
      <td style="padding: 16px; border-top: 1px solid #eeeeee; width: 58%; vertical-align: top;">
        <span class="mobile-label" style="display: none;">Task</span>
        <div style="font-weight: bold; margin-bottom: 5px;">${task.title || 'Untitled'}</div>
      </td>
      <td style="padding: 16px; border-top: 1px solid #eeeeee; width: 21%; vertical-align: top;">
        <span class="mobile-label" style="display: none;">Priority</span>
        <span style="display: inline-block; padding: 6px 14px; background-color: #ef4444; color: #ffffff; border-radius: 20px; font-size: 13px; font-weight: bold;">${priority}</span>
      </td>
      <td style="padding: 16px; border-top: 1px solid #eeeeee; color: #555555; width: 21%; vertical-align: top;">
        <span class="mobile-label" style="display: none;">Due</span>
        ${dueDate}
      </td>
    </tr>`;
  }).join('');

  const taskListHTML = `<tbody>${taskRows}</tbody>`;

  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: toEmail,
      user_name: toName,
      subject: subject,
      task_count: String(tasks.length),
      tasks_list: taskListHTML,
      app_link: APP_LINK,
    },
  };

  const response = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`EmailJS failed: ${response.status} ${details}`);
  }
}

async function getUsers(): Promise<TaskUser[]> {
  const usersSnapshot = await db.collection('users').get();
  return usersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<TaskUser, 'id'>),
  }));
}

async function getUserTasks(userId: string): Promise<ScheduledTask[]> {
  const tasksSnapshot = await db.collection('users').doc(userId).collection('tasks').get();
  return tasksSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ScheduledTask, 'id'>),
  }));
}

async function processSchedule(mode: 'nearly-due' | 'overdue'): Promise<{ sent: number; users: number; errors: number }> {
  const users = await getUsers();
  const now = new Date();
  const todayAtMidnight = new Date();
  todayAtMidnight.setHours(0, 0, 0, 0);

  let sent = 0;
  let errors = 0;

  for (const user of users) {
    if (!user.email) {
      continue;
    }

    try {
      const allTasks = await getUserTasks(user.id);
      
      const matchingTasks = allTasks.filter((task) => {
        if (task.status === 'completed') {
          return false;
        }

        const dueDate = normalizeDueDate(task.dueDate);
        if (!Number.isFinite(dueDate.getTime())) {
          return false;
        }

        if (mode === 'nearly-due') {
          // For nearly-due: check if task is due EXACTLY 1 day from today (not today, not 2+ days)
          // Get tomorrow's date at midnight
          const tomorrowAtMidnight = new Date(todayAtMidnight);
          tomorrowAtMidnight.setDate(tomorrowAtMidnight.getDate() + 1);
          
          // Get day after tomorrow at midnight
          const dayAfterTomorrowAtMidnight = new Date(tomorrowAtMidnight);
          dayAfterTomorrowAtMidnight.setDate(dayAfterTomorrowAtMidnight.getDate() + 1);
          
          // Convert task due date to midnight for comparison
          const dueDateAtMidnight = new Date(dueDate);
          dueDateAtMidnight.setHours(0, 0, 0, 0);
          
          // Include only if due date is tomorrow (not today, not 2+ days away)
          return dueDateAtMidnight >= tomorrowAtMidnight && dueDateAtMidnight < dayAfterTomorrowAtMidnight;
        }

        // For overdue: compare only dates (not times)
        // A task is overdue only if due date is BEFORE today (not today itself)
        const dueDateAtMidnight = new Date(dueDate);
        dueDateAtMidnight.setHours(0, 0, 0, 0);
        return dueDateAtMidnight < todayAtMidnight;
      });

      if (matchingTasks.length === 0) {
        continue;
      }

      const toName = user.displayName || user.name || 'TaskSync User';
      const subject = mode === 'nearly-due'
        ? `TaskSync Reminder: ${matchingTasks.length} task(s) due in 24 hours`
        : `TaskSync Alert: ${matchingTasks.length} overdue task(s)`;
      const templateId = mode === 'nearly-due'
        ? EMAILJS_NEARLY_DUE_TEMPLATE_ID
        : EMAILJS_OVERDUE_TEMPLATE_ID;

      await sendEmailWithEmailJS(
        user.email,
        toName,
        subject,
        matchingTasks,
        templateId
      );
      sent += matchingTasks.length;
    } catch (error) {
      errors += 1;
      console.error(`Schedule ${mode} failed for user ${user.id}:`, error);
    }
  }

  return { sent, users: users.length, errors };
}

export const sendNearlyDueReminder = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const result = await processSchedule('nearly-due');
    console.log(`sendNearlyDueReminder finished. sent=${result.sent} users=${result.users} errors=${result.errors}`);
    return null;
  });

export const sendOverdueAlert = functions.pubsub
  .schedule('0 17 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const result = await processSchedule('overdue');
    console.log(`sendOverdueAlert finished. sent=${result.sent} users=${result.users} errors=${result.errors}`);
    return null;
  });

/**
 * Automatically update task status to 'overdue' if due date has passed
 * Runs every hour to keep tasks in sync with current date/time
 */
export const updateOverdueTasksStatus = functions.pubsub
  .schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async () => {
    let updated = 0;
    let errors = 0;
    
    try {
      const users = await getUsers();
      const now = new Date();

      for (const user of users) {
        try {
          const allTasks = await getUserTasks(user.id);

          for (const task of allTasks) {
            // Skip if already completed or already overdue
            if (task.status === 'completed' || task.status === 'overdue') {
              continue;
            }

            // Handle both dueDate and due_at field names
            const rawDueDate = task.dueDate || task.due_at;
            const dueDate = normalizeDueDate(rawDueDate);

            // Check if task is overdue (compare only dates, not times)
            // A task is overdue only if due date is BEFORE today (not today itself)
            const todayAtMidnight = new Date();
            todayAtMidnight.setHours(0, 0, 0, 0);
            const dueDateAtMidnight = new Date(dueDate);
            dueDateAtMidnight.setHours(0, 0, 0, 0);
            
            if (Number.isFinite(dueDate.getTime()) && dueDateAtMidnight < todayAtMidnight) {
              // Update task status to overdue
              await db
                .collection('users')
                .doc(user.id)
                .collection('tasks')
                .doc(task.id)
                .update({
                  status: 'overdue',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

              updated += 1;
            }
          }
        } catch (error) {
          errors += 1;
          console.error(`Failed to update overdue tasks for user ${user.id}:`, error);
        }
      }

      console.log(`updateOverdueTasksStatus finished. updated=${updated} errors=${errors}`);
      return null;
    } catch (error) {
      console.error('updateOverdueTasksStatus failed:', error);
      return null;
    }
  });

