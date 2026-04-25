import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Initialize transporter
let transporter;

function initializeTransporter() {
  if (!transporter) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPassword) {
      throw new Error('❌ SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD in .env');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });
  }

  return transporter;
}

// Helper to format task data
function formatTaskRow(task) {
  let dueDate;
  if (task.due_at?.toDate) {
    dueDate = task.due_at.toDate();
  } else if (task.dueDate) {
    dueDate = new Date(task.dueDate);
  } else {
    dueDate = new Date();
  }

  const hoursUntilDue = Math.max(
    0,
    Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60))
  );

  const priority = (task.priority_manual || task.priority || 'medium').toUpperCase();
  const priorityColor =
    priority === 'HIGH' ? '#ef4444' :
    priority === 'LOW' ? '#22c55e' : '#f59e0b';

  return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <strong>${task.title || 'Untitled Task'}</strong>
        <br><span style="color: #666; font-size: 0.9em;">Due in ${hoursUntilDue} hour${hoursUntilDue !== 1 ? 's' : ''}</span>
      </td>
      <td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <span style="background:${priorityColor};color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${priority}</span>
      </td>
      <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #555;">
        ${dueDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
    </tr>
  `;
}

// Send notification for multiple nearly-due tasks
export async function sendTaskNotificationEmail(toEmail, userName, tasks) {
  try {
    console.log('📧 sendTaskNotificationEmail called with:', { toEmail, userName, tasksCount: tasks.length });
    const mail = initializeTransporter();

    const taskList = tasks.map(formatTaskRow).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
.header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 24px; text-align: center; }
.header h1 { margin: 0; font-size: 24px; }
.content { padding: 24px; }
.table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden; }
.cta { background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; }
.footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Nearly Due Tasks</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${userName}</strong>,</p>
      <p>You have <strong>${tasks.length}</strong> task(s) due in the next 24 hours:</p>
      <table class="table">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="padding: 12px 16px; text-align: left;">Task</th>
            <th style="padding: 12px 16px; text-align: center;">Priority</th>
            <th style="padding: 12px 16px; text-align: right;">Due</th>
          </tr>
        </thead>
        <tbody>
          ${taskList}
        </tbody>
      </table>
      <p style="font-size: 14px; color: #64748b;">Stay organized and manage your time effectively!</p>
      <a href="http://localhost:3001" class="cta">Open TaskSync</a>
    </div>
    <div class="footer">
      <p>TaskSync • Task Management Made Smart</p>
    </div>
  </div>
</body>
</html>`;

    await mail.sendMail({
      from: `"TaskSync" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_USER,
      to: toEmail,
      subject: `⏰ ${tasks.length} task(s) due soon`,
      html
    });

    console.log(`📧 Notification email sent successfully to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send notification to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Send reminder for a single task
export async function sendTaskReminderEmail(toEmail, userName, task) {
  try {
    const mail = initializeTransporter();

    let dueDate;
    if (task.due_at?.toDate) {
      dueDate = task.due_at.toDate();
    } else if (task.dueDate) {
      dueDate = new Date(task.dueDate);
    } else {
      dueDate = new Date();
    }

    const priority = (task.priority_manual || task.priority || 'medium').toUpperCase();
    const priorityColor =
      priority === 'HIGH' ? '#ef4444' :
      priority === 'LOW' ? '#22c55e' : '#f59e0b';

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
.header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 24px; text-align: center; }
.header h1 { margin: 0; font-size: 24px; }
.content { padding: 24px; }
.task-box { background: #f8fafc; border-left: 4px solid ${priorityColor}; padding: 16px; border-radius: 8px; margin: 20px 0; }
.priority-badge { background: ${priorityColor}; color: white; padding: 6px 14px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; }
.cta { background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; }
.footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Task Reminder</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${userName}</strong>,</p>
      <p>This is a reminder about your task:</p>
      <div class="task-box">
        <h2 style="margin: 0 0 12px 0; color: #1e293b;">${task.title || 'Untitled Task'}</h2>
        <p style="margin: 8px 0; color: #666;">${task.description || 'No description'}</p>
        <p style="margin: 12px 0 0 0;">
          <span class="priority-badge">${priority}</span>
          <span style="margin-left: 12px; color: #666; font-size: 14px;">
            Due: <strong>${dueDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
          </span>
        </p>
      </div>
      <p style="font-size: 14px; color: #64748b;">Don't forget to complete this task on time!</p>
      <a href="http://localhost:3001" class="cta">View in TaskSync</a>
    </div>
    <div class="footer">
      <p>TaskSync • Task Management Made Smart</p>
    </div>
  </div>
</body>
</html>`;

    await mail.sendMail({
      from: `"TaskSync" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_USER,
      to: toEmail,
      subject: `📌 Reminder: ${task.title || 'Your Task'}`,
      html
    });

    console.log(`📧 Reminder email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send reminder to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Send custom email
export async function sendCustomEmail(toEmail, subject, htmlContent) {
  try {
    const mail = initializeTransporter();

    await mail.sendMail({
      from: `"TaskSync" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_USER,
      to: toEmail,
      subject,
      html: htmlContent
    });

    console.log(`📧 Custom email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send custom email to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}
