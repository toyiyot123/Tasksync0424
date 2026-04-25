/**
 * Task Reminder Cloud Function
 * Sends scheduled email reminders for nearly-due and overdue tasks
 * 
 * Triggered by Cloud Scheduler (Cloud Tasks):
 * - 9:00 AM: Send nearly-due task reminders
 * - 5:00 PM: Send overdue task alerts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Configure Nodemailer transporter
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Format task for email display
 */
function formatTaskForEmail(task: any) {
  const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
  const now = new Date();
  const hoursUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  
  const priorityColor = task.priority === 'high' ? '#ef4444' : 
                       task.priority === 'medium' ? '#f59e0b' : '#22c55e';
  
  return `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: left;">
        <strong>${task.title}</strong><br/>
        <small style="color: #666;">${task.description || ''}</small>
      </td>
      <td style="padding: 12px; text-align: center;">
        <span style="background: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
          ${task.priority?.toUpperCase() || 'MEDIUM'}
        </span>
      </td>
      <td style="padding: 12px; text-align: center; color: #666;">
        ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString()}
      </td>
      <td style="padding: 12px; text-align: center; color: #666;">
        ${hoursUntilDue > 0 ? hoursUntilDue + ' hours' : 'Overdue'}
      </td>
    </tr>
  `;
}

/**
 * Send nearly-due task reminder
 * Triggered daily at 9:00 AM
 */
export const sendNearlyDueReminder = functions.pubsub
  .schedule('0 9 * * *') // 9:00 AM UTC every day
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('📧 Running scheduled nearly-due task reminder...');

    try {
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      
      if (usersSnapshot.empty) {
        console.log('ℹ️ No users found');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Process each user
      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;

        try {
          // Get user's tasks
          const tasksSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('tasks')
            .where('status', '!=', 'completed')
            .get();

          if (tasksSnapshot.empty) {
            console.log(`ℹ️ No tasks for user ${user.email}`);
            continue;
          }

          // Filter nearly-due tasks (due within 24 hours)
          const now = new Date();
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          
          const nearlyDueTasks = tasksSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(task => {
              const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
              return dueDate >= now && dueDate <= tomorrow && task.status !== 'completed';
            });

          if (nearlyDueTasks.length === 0) {
            console.log(`ℹ️ No nearly-due tasks for user ${user.email}`);
            continue;
          }

          // Build email
          const taskRows = nearlyDueTasks.map(task => formatTaskForEmail(task)).join('');
          
          const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h2 style="margin: 0; font-size: 24px;">📧 Task Reminders</h2>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">Tasks due within 24 hours</p>
              </div>
              
              <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p>Hi <strong>${user.displayName || 'there'}</strong>,</p>
                <p>You have <strong>${nearlyDueTasks.length}</strong> task(s) due within the next 24 hours.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                  <thead>
                    <tr style="background: #f3f4f6; font-weight: bold;">
                      <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Task</th>
                      <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Priority</th>
                      <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Due Date</th>
                      <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Time Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${taskRows}
                  </tbody>
                </table>
                
                <p style="text-align: center; margin-top: 24px;">
                  <a href="${process.env.FRONTEND_URL || 'https://your-app.com'}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    View All Tasks
                  </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                  This is an automated reminder from TaskSync. You can manage notification preferences in your settings.
                </p>
              </div>
            </div>
          `;

          // Send email
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.email,
            subject: `⏰ Reminder: ${nearlyDueTasks.length} task(s) due in 24 hours`,
            html: htmlContent,
          });

          console.log(`✅ Sent nearly-due reminder to ${user.email} (${nearlyDueTasks.length} tasks)`);
          successCount++;
        } catch (userError) {
          console.error(`❌ Error processing user ${user.email}:`, userError);
          errorCount++;
        }
      }

      console.log(`📊 Nearly-due reminder: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ Fatal error in nearly-due reminder:', error);
      throw error;
    }
  });

/**
 * Send overdue task alert
 * Triggered daily at 5:00 PM
 */
export const sendOverdueAlert = functions.pubsub
  .schedule('0 17 * * *') // 5:00 PM UTC every day
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('📧 Running scheduled overdue task alert...');

    try {
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      
      if (usersSnapshot.empty) {
        console.log('ℹ️ No users found');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Process each user
      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;

        try {
          // Get user's tasks
          const tasksSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('tasks')
            .where('status', '!=', 'completed')
            .get();

          if (tasksSnapshot.empty) {
            continue;
          }

          // Filter overdue tasks
          const now = new Date();
          const overdueTasks = tasksSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(task => {
              const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
              return dueDate < now && task.status !== 'completed';
            });

          if (overdueTasks.length === 0) {
            continue;
          }

          // Build email
          const taskRows = overdueTasks.map(task => formatTaskForEmail(task)).join('');
          
          const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h2 style="margin: 0; font-size: 24px;">🚨 Overdue Tasks Alert</h2>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">You have overdue tasks that need attention</p>
              </div>
              
              <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p>Hi <strong>${user.displayName || 'there'}</strong>,</p>
                <p>⚠️ You have <strong>${overdueTasks.length}</strong> overdue task(s) that need your attention.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                  <thead>
                    <tr style="background: #f3f4f6; font-weight: bold;">
                      <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Task</th>
                      <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Priority</th>
                      <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Due Date</th>
                      <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${taskRows}
                  </tbody>
                </table>
                
                <p style="text-align: center; margin-top: 24px;">
                  <a href="${process.env.FRONTEND_URL || 'https://your-app.com'}" style="background: #f5576c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    View Overdue Tasks
                  </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                  This is an automated alert from TaskSync. You can manage notification preferences in your settings.
                </p>
              </div>
            </div>
          `;

          // Send email
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.email,
            subject: `🚨 Alert: ${overdueTasks.length} overdue task(s)`,
            html: htmlContent,
          });

          console.log(`✅ Sent overdue alert to ${user.email} (${overdueTasks.length} tasks)`);
          successCount++;
        } catch (userError) {
          console.error(`❌ Error processing user ${user.email}:`, userError);
          errorCount++;
        }
      }

      console.log(`📊 Overdue alert: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ Fatal error in overdue alert:', error);
      throw error;
    }
  });
