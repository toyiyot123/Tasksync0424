import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_URL = 'http://localhost:5000';
const SERVER_SECRET = process.env.SERVER_SECRET;

async function testNotification() {
  console.log('🔍 Testing NOTIFICATION email only...\n');
  
  try {
    const payload = {
      toEmail: 'tasksyncscheduler@gmail.com',
      userName: 'Test User',
      tasks: [
        {
          id: 'task-1',
          title: 'Complete Dashboard',
          description: 'Finish the task management dashboard',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        }
      ]
    };
    
    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));
    console.log('\nServer Secret:', SERVER_SECRET ? '✅ Present' : '❌ Missing');
    console.log('Server URL:', SERVER_URL);
    
    const response = await fetch(`${SERVER_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-server-secret': SERVER_SECRET
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('\n📊 Response Status:', response.status);
    console.log('📝 Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Notification sent successfully');
    } else {
      console.log('❌ Notification failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNotification();
