# TaskSync Email Server Setup Guide

## Overview
This is a standalone Node.js + Express email server that powers TaskSync notifications. It handles sending task reminders and notifications using Nodemailer.

## Architecture

```
React Frontend (http://localhost:3001)
    ↓ (HTTP POST request)
Express Email Server (http://localhost:5000)
    ↓ (SMTP)
Gmail / Email Provider
    ↓
User's Email
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Gmail account with 2FA enabled
- Gmail App Password (not regular password)

## Setup Instructions

### 1. Get Gmail App Password

1. Go to [Google Account](https://myaccount.google.com/)
2. Click **Security** in the left sidebar
3. Enable **2-Step Verification** if not already enabled
4. Scroll down and find **App passwords**
5. Select "Mail" and "Windows Computer"
6. Google will generate a 16-character password
7. Copy this password

### 2. Configure Environment Variables

Edit `.env` file in the project root:

```env
# Email Server Configuration
SERVER_PORT=5000
SERVER_SECRET=your-super-secret-key-change-this
FRONTEND_URL=http://localhost:3001

# Gmail SMTP Configuration
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

**Important:**
- `SERVER_SECRET`: Change this to a random secure string (used to authenticate requests from frontend)
- `SMTP_USER`: Your Gmail address
- `SMTP_PASSWORD`: The 16-character app password from Google (NOT your regular password)

### 3. Install Dependencies

```bash
npm install
```

This will install Express, Nodemailer, CORS, and other required packages.

### 4. Run the Email Server

**Option A: Run server only**
```bash
npm run dev:server
```

**Option B: Run frontend + server together**
```bash
npm run dev:all
```

You should see:
```
🚀 TaskSync Email Server running on http://localhost:5000
📧 SMTP configured for: your-gmail@gmail.com
✅ Server is ready to send notifications
```

## API Endpoints

### Health Check
```bash
GET http://localhost:5000/health
```

### Send Notification Email
```bash
POST http://localhost:5000/send-notification
Headers:
  - Content-Type: application/json
  - x-server-secret: your-server-secret

Body:
{
  "toEmail": "user@example.com",
  "userName": "John Doe",
  "tasks": [
    {
      "id": "task-1",
      "title": "Complete project",
      "description": "Finish the dashboard",
      "dueDate": "2024-04-25T15:00:00Z",
      "priority": "high"
    }
  ]
}
```

### Send Task Reminder Email
```bash
POST http://localhost:5000/send-reminder
Headers:
  - Content-Type: application/json
  - x-server-secret: your-server-secret

Body:
{
  "toEmail": "user@example.com",
  "userName": "John Doe",
  "task": {
    "id": "task-1",
    "title": "Complete project",
    "description": "Finish the dashboard",
    "dueDate": "2024-04-25T15:00:00Z",
    "priority": "high"
  }
}
```

## Using from React Frontend

The frontend has a built-in email client at `src/utils/emailClient.ts`:

```typescript
import emailClient from '@/utils/emailClient';

// Send notification
await emailClient.sendNotification('user@example.com', 'John', tasks);

// Send reminder
await emailClient.sendReminder('user@example.com', 'John', task);

// Check if server is running
const isRunning = await emailClient.checkServer();
```

## Frontend Environment Variables

Add to `.env`:
```env
VITE_EMAIL_SERVER_URL=http://localhost:5000
VITE_SERVER_SECRET=your-super-secret-key-change-this
```

## Troubleshooting

### "SMTP credentials not configured"
- Check that `SMTP_USER` and `SMTP_PASSWORD` are set in `.env`
- Make sure you're using the 16-character app password, not your regular Gmail password

### "Unauthorized - Invalid secret"
- The `x-server-secret` header doesn't match `SERVER_SECRET` in `.env`
- Make sure both the frontend and backend use the same secret

### "Failed to connect to Gmail"
- Verify 2FA is enabled on your Gmail account
- Make sure you generated an app password (not a regular password)
- Check that the app password is correct (16 characters)

### "Email not received"
- Check spam/promotions folder
- Verify the recipient email address is correct
- Check server logs for any errors

### Server won't start
- Make sure port 5000 is not in use: `netstat -ano | findstr :5000`
- If in use, change `SERVER_PORT` in `.env`

## File Structure

```
project-root/
├── server.js                    # Main Express server
├── server-utils/
│   └── emailService.js          # Email sending functions
├── src/
│   └── utils/
│       └── emailClient.ts       # Frontend email client
└── .env                         # Environment configuration
```

## Security Best Practices

1. **Never commit `.env`** - Add it to `.gitignore`
2. **Use app passwords** - Never use your main Gmail password
3. **Change SERVER_SECRET** - Use a strong random string
4. **HTTPS in production** - Use HTTPS when deploying
5. **Validate emails** - Always validate user emails before sending

## Production Deployment

To deploy the email server:

1. Choose a platform: Heroku, Railway, Render, etc.
2. Set environment variables on the platform
3. Update `FRONTEND_URL` and server URL in `.env`
4. Use HTTPS URLs only
5. Monitor email sending and error logs

### Example: Deploying to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs: `npm run dev:server`
3. Test endpoints manually with curl or Postman
4. Check Gmail security settings

---

**Happy emailing! 📧**
