/**
 * Email Service Client
 * Send email requests from React frontend to the Node.js email server
 */

const EMAIL_SERVER_URL = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:5000';
const SERVER_SECRET = import.meta.env.VITE_SERVER_SECRET || '';

const emailClient = {
  /**
   * Send task notification email for nearly-due tasks
   */
  async sendNotification(toEmail: string, userName: string, tasks: any[]) {
    try {
      const response = await fetch(`${EMAIL_SERVER_URL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-server-secret': SERVER_SECRET
        },
        body: JSON.stringify({
          toEmail,
          userName,
          tasks
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      const result = await response.json();
      console.log('✅ Notification sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  },

  /**
   * Send task reminder email for a single task
   */
  async sendReminder(toEmail: string, userName: string, task: any) {
    try {
      const response = await fetch(`${EMAIL_SERVER_URL}/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-server-secret': SERVER_SECRET
        },
        body: JSON.stringify({
          toEmail,
          userName,
          task
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reminder');
      }

      const result = await response.json();
      console.log('✅ Reminder sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending reminder:', error);
      throw error;
    }
  },

  /**
   * Check if email server is running
   */
  async checkServer() {
    try {
      const response = await fetch(`${EMAIL_SERVER_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
};

export default emailClient;
