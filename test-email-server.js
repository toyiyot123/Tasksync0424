/**
 * Test Email Server
 * Run this to test if the email server is working correctly
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_URL = 'http://localhost:5000';
const SERVER_SECRET = process.env.SERVER_SECRET;

async function testEmailServer() {
  console.log('🧪 Testing TaskSync Email Server...\n');

  // Test 1: Health check
  console.log('1️⃣ Testing health check...');
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check passed:', data);
    } else {
      console.log('❌ Health check failed with status:', response.status);
    }
  } catch (error) {
    console.log('❌ Could not connect to email server. Is it running?');
    console.log('   Run: npm run dev:server');
    return;
  }

  console.log('\n2️⃣ Testing notification email...');
  try {
    const response = await fetch(`${SERVER_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-server-secret': SERVER_SECRET
      },
      body: JSON.stringify({
        toEmail: 'tasksyncscheduler@gmail.com', // Replace with your email
        userName: 'Test User',
        tasks: [
          {
            id: 'task-1',
            title: 'Complete Dashboard',
            description: 'Finish the task management dashboard',
            dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
            priority: 'high'
          },
          {
            id: 'task-2',
            title: 'Review Code',
            description: 'Review the email service code',
            dueDate: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours from now
            priority: 'medium'
          }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Notification test passed:', data);
    } else {
      const error = await response.json();
      console.log('❌ Notification test failed:', error);
    }
  } catch (error) {
    console.log('❌ Error sending test notification:', error.message);
  }

  console.log('\n3️⃣ Testing reminder email...');
  try {
    const response = await fetch(`${SERVER_URL}/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-server-secret': SERVER_SECRET
      },
      body: JSON.stringify({
        toEmail: 'tasksyncscheduler@gmail.com', // Replace with your email
        userName: 'Test User',
        task: {
          id: 'task-3',
          title: 'Deploy to Production',
          description: 'Deploy the latest version to production',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          priority: 'high'
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Reminder test passed:', data);
    } else {
      const error = await response.json();
      console.log('❌ Reminder test failed:', error);
    }
  } catch (error) {
    console.log('❌ Error sending test reminder:', error.message);
  }

  console.log('\n📝 Test Summary:');
  console.log('- If tests passed, your email server is working!');
  console.log('- Check your email (test@example.com) for actual emails');
  console.log('- Update test@example.com with your real email address to receive test emails');
}

testEmailServer();
