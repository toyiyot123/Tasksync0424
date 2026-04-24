import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendTaskNotificationEmail, sendTaskReminderEmail } from './server-utils/emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'https://tasksync-70aa9.web.app'
  ],
  credentials: true
}));
app.use(express.json());

// Verify server secret middleware
const verifySecret = (req, res, next) => {
  const secret = req.headers['x-server-secret'];
  if (secret !== process.env.SERVER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized - Invalid secret' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Send task notification email
app.post('/send-notification', verifySecret, async (req, res) => {
  try {
    const { toEmail, userName, tasks } = req.body;

    if (!toEmail || !tasks || tasks.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: toEmail, tasks' });
    }

    const result = await sendTaskNotificationEmail(toEmail, userName || 'User', tasks);
    
    if (result.success) {
      res.json({ success: true, message: `Email sent to ${toEmail}` });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send task reminder email
app.post('/send-reminder', verifySecret, async (req, res) => {
  try {
    const { toEmail, userName, task } = req.body;

    if (!toEmail || !task) {
      return res.status(400).json({ error: 'Missing required fields: toEmail, task' });
    }

    const result = await sendTaskReminderEmail(toEmail, userName || 'User', task);
    
    if (result.success) {
      res.json({ success: true, message: `Reminder email sent to ${toEmail}` });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error sending reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send notifications to all users endpoint
app.post('/send-all-notifications', verifySecret, async (req, res) => {
  try {
    console.log('🚀 Triggering notifications to all users from Firebase...\n');
    
    // This endpoint will be called by a scheduled task or manually
    // In production, this would be called by Google Cloud Scheduler or similar
    
    res.json({
      success: true,
      message: 'Bulk notification process started. Check server logs for details.',
      note: 'For now, manually trigger: npm run notify-all-users'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskSync Email Server running on http://localhost:${PORT}`);
  console.log(`📧 SMTP configured for: ${process.env.SMTP_USER}`);
  console.log(`✅ Server is ready to send notifications`);
});

export default app;
