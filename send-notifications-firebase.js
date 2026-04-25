/**
 * Send Notifications to All Users - Firebase Web SDK Version
 * This script fetches real user data from Firebase and sends notifications
 * 
 * Note: This requires Firebase credentials in .env
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

dotenv.config();

// Initialize Firebase with your config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const EMAIL_SERVER_URL = process.env.EMAIL_SERVER_URL || 'http://localhost:5000';
const SERVER_SECRET = process.env.SERVER_SECRET;

/**
 * Get all users from Firestore
 */
async function getAllUsers() {
  try {
    console.log('👥 Fetching all users from Firebase...');
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);

    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        users.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName || data.name || 'User',
        });
      }
    });

    console.log(`✅ Found ${users.length} user(s) in Firebase\n`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return [];
  }
}

/**
 * Get nearly-due tasks for a user
 */
async function getUserNearlyDueTasks(userId) {
  try {
    const tasksCollection = collection(db, 'users', userId, 'tasks');
    const snapshot = await getDocs(tasksCollection);

    if (snapshot.empty) {
      return [];
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to Date
      let dueDate;
      if (data.dueDate instanceof Timestamp) {
        dueDate = data.dueDate.toDate();
      } else if (data.dueDate) {
        dueDate = new Date(data.dueDate);
      } else {
        return; // Skip if no due date
      }

      // Filter for nearly-due tasks (within 24 hours, not completed)
      if (dueDate >= now && dueDate <= tomorrow && data.status !== 'completed') {
        tasks.push({
          id: doc.id,
          title: data.title || 'Untitled',
          description: data.description || '',
          dueDate: dueDate.toISOString(),
          priority: data.priority || 'medium',
        });
      }
    });

    return tasks;
  } catch (error) {
    console.error(`❌ Error fetching tasks for user ${userId}:`, error.message);
    return [];
  }
}

/**
 * Send notification to a specific user
 */
async function sendNotificationToUser(user, tasks) {
  try {
    const response = await fetch(`${EMAIL_SERVER_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-server-secret': SERVER_SECRET,
      },
      body: JSON.stringify({
        toEmail: user.email,
        userName: user.displayName,
        tasks,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`    ❌ Error: ${error.error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`    ❌ Network error: ${error.message}`);
    return false;
  }
}

/**
 * Send notifications to all users
 */
async function sendNotificationsToAllUsers() {
  try {
    console.log('🔥 Firebase Email Notification System\n');
    console.log(`📧 Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
    console.log(`📤 Sender: ${process.env.SMTP_USER}`);
    console.log(`🖥️  Server: ${EMAIL_SERVER_URL}\n`);
    console.log('=' .repeat(60) + '\n');

    // Authenticate anonymously (if needed)
    try {
      await signInAnonymously(auth);
      console.log('🔐 Authenticated with Firebase\n');
    } catch (authError) {
      console.warn('⚠️ Anonymous auth skipped (public rules assumed)\n');
    }

    const users = await getAllUsers();

    if (users.length === 0) {
      console.log('ℹ️ No users to notify');
      console.log('💡 Create users in Firebase at: /users/{userId}');
      console.log('   Required fields: email, displayName');
      process.exit(0);
    }

    let successCount = 0;
    let totalTasksNotified = 0;

    for (const user of users) {
      try {
        console.log(`📨 Processing user: ${user.email}`);

        const nearlyDueTasks = await getUserNearlyDueTasks(user.id);

        if (nearlyDueTasks.length === 0) {
          console.log(`  ℹ️ No nearly-due tasks for ${user.email}`);
          console.log(`     💡 Create tasks with dueDate within 24 hours\n`);
          continue;
        }

        console.log(`  📋 Found ${nearlyDueTasks.length} nearly-due task(s):`);
        nearlyDueTasks.forEach(task => {
          console.log(`     • ${task.title} (${task.priority}) - Due: ${new Date(task.dueDate).toLocaleString()}`);
        });

        const success = await sendNotificationToUser(user, nearlyDueTasks);

        if (success) {
          successCount++;
          totalTasksNotified += nearlyDueTasks.length;
          console.log(`  ✅ Notification sent\n`);
        } else {
          console.log(`  ❌ Failed to send notification\n`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing user ${user.email}:`, error.message);
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n✅ Completed!`);
    console.log(`📊 Sent notifications to ${successCount}/${users.length} user(s)`);
    console.log(`📧 Total tasks notified: ${totalTasksNotified}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
sendNotificationsToAllUsers();
