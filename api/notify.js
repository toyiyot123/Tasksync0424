import admin from 'firebase-admin';

let db;

function initializeFirebase() {
  if (!admin.apps.length) {
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (err) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', err);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
      }
    } else {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  return admin.firestore();
}

function normalizeDueDate(dueDate) {
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

function formatDueDate(task) {
  const dueDate = normalizeDueDate(task.dueDate || task.due_at);

  if (!Number.isFinite(dueDate.getTime())) {
    return 'No due date';
  }

  return dueDate.toLocaleString();
}

function formatPriority(task) {
  return (task.priority || task.priority_manual || 'medium').toUpperCase();
}

async function sendEmailWithEmailJS(
  toEmail,
  toName,
  subject,
  tasks,
  templateId
) {
  const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
  const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_mjgbtih';
  const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '9Dw-9GkNwVvoLmb1q';
  const APP_LINK = process.env.FRONTEND_URL || 'https://tasksync-70aa9.web.app';

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

async function getUsers() {
  const usersSnapshot = await db.collection('users').get();
  return usersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function getUserTasks(userId) {
  // Tasks are stored in root /tasks collection, filtered by user_id field
  const tasksSnapshot = await db.collection('tasks').where('user_id', '==', userId).get();
  return tasksSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function processNotifications(mode) {
  const EMAILJS_NEARLY_DUE_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_4dxvv8d';
  const EMAILJS_OVERDUE_TEMPLATE_ID = process.env.EMAILJS_OVERDUE_TEMPLATE_ID || 'template_ztabchb';

  const users = await getUsers();
  console.log(`📊 Found ${users.length} total users in Firestore`);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let sent = 0;
  let errors = 0;

  for (const user of users) {
    if (!user.email) {
      console.log(`⚠️ User ${user.id} has no email field, skipping...`);
      continue;
    }

    try {
      const allTasks = await getUserTasks(user.id);
      // Get today's date at midnight for accurate date comparison
      const todayAtMidnight = new Date();
      todayAtMidnight.setHours(0, 0, 0, 0);

      const matchingTasks = allTasks.filter((task) => {
        if (task.status === 'completed') {
          return false;
        }

        const dueDate = normalizeDueDate(task.dueDate || task.due_at);
        if (!Number.isFinite(dueDate.getTime())) {
          return false;
        }

        if (mode === 'nearly-due') {
          return dueDate >= now && dueDate <= tomorrow;
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
      console.log(`✅ Sent ${mode} notification to ${user.email}`);
    } catch (error) {
      errors += 1;
      console.error(`❌ Failed to send ${mode} notification to ${user.id}:`, error);
    }
  }

  return { sent, users: users.length, errors };
}

export default async function handler(req, res) {
  console.log('🚀 Notification scan started for mode:', req.query.mode);

  try {
    db = initializeFirebase();

    const mode = req.query.mode || 'nearly-due';
    if (mode !== 'nearly-due' && mode !== 'overdue') {
      return res.status(400).json({ error: 'Invalid mode parameter' });
    }

    const result = await processNotifications(mode);
    
    console.log(`✅ ${mode} notifications finished. sent=${result.sent} users=${result.users} errors=${result.errors}`);
    res.status(200).json({
      success: true,
      mode,
      message: `Sent ${result.sent} ${mode} notifications`,
      ...result
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: error.message || 'Unknown error'
    });
  }
}
