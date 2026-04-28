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

type TaskStatus = 'todo' | 'in-progress' | 'completed';

type ScheduledTask = {
  id: string;
  title?: string;
  description?: string;
  dueDate?: admin.firestore.Timestamp | string | Date;
  priority?: 'low' | 'medium' | 'high';
  status?: TaskStatus;
};

type TaskUser = {
  id: string;
  email?: string;
  displayName?: string;
  name?: string;
};

function normalizeDueDate(dueDate: ScheduledTask['dueDate']): Date {
  if (!dueDate) {
    return new Date(0);
  }

  if (dueDate instanceof Date) {
    return dueDate;
  }

  if (typeof dueDate === 'string') {
    return new Date(dueDate);
  }

  return dueDate.toDate();
}

function formatDueHours(task: ScheduledTask, now: Date): string {
  const dueDate = normalizeDueDate(task.dueDate);
  const hoursUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (!Number.isFinite(dueDate.getTime())) {
    return 'N/A';
  }

  if (hoursUntilDue < 0) {
    return `${Math.abs(hoursUntilDue)} overdue`;
  }

  return `${hoursUntilDue}`;
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
  // Build task list HTML table rows
  const taskListHTML = tasks.map(task => {
    const dueDate = formatDueDate(task);
    const priority = formatPriority(task);
    
    return `<tr style="background-color: #ffffff;">
<td style="padding: 16px; border-top: 1px solid #eeeeee;">
<span class="mobile-label" style="display: none;">Task</span>
<div style="font-weight: bold; margin-bottom: 5px;">${task.title || 'Untitled'}</div>
</td>
<td style="padding: 16px; border-top: 1px solid #eeeeee;">
<span class="mobile-label" style="display: none;">Priority</span>
<span style="display: inline-block; padding: 6px 14px; background-color: #ef4444; color: #ffffff; border-radius: 20px; font-size: 13px; font-weight: bold;">${priority}</span>
</td>
<td style="padding: 16px; border-top: 1px solid #eeeeee; color: #555555;">
<span class="mobile-label" style="display: none;">Due</span>
${dueDate}
</td>
</tr>`;
  }).join('');

  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: toEmail,
      to_name: toName,
      subject,
      user_name: toName,
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
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

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
          return dueDate >= now && dueDate <= tomorrow;
        }

        return dueDate < now;
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

