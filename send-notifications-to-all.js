/**
 * Send Notifications to All Users
 * This script fetches all users from Firebase and sends them notifications
 * about their nearly-due tasks
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK not initialized. Using unauthenticated mode.');
}

const db = admin.firestore();
const EMAIL_SERVER_URL = process.env.EMAIL_SERVER_URL || 'http://localhost:5000';
const SERVER_SECRET = process.env.SERVER_SECRET;

/**
 * Get all users from Firestore
 */
async function getAllUsers() {
  try {
    const snapshot = await db.collection('users').get();
    const users = [];

    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName || doc.data().name || 'User',
      });
    });

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
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .where('status', '!=', 'completed')
      .get();

    if (snapshot.empty) {
      return [];
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const dueDate = data.dueDate instanceof admin.firestore.Timestamp
        ? data.dueDate.toDate()
        : new Date(data.dueDate);

      // Filter for nearly-due tasks
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
    console.log('📧 Starting to send notifications to all users...\n');

    const users = await getAllUsers();
    console.log(`👥 Found ${users.length} user(s)\n`);

    if (users.length === 0) {
      console.log('ℹ️ No users to notify');
      return;
    }

    let successCount = 0;
    let totalTasksNotified = 0;

    for (const user of users) {
      try {
        console.log(`📨 Processing user: ${user.email}`);

        const nearlyDueTasks = await getUserNearlyDueTasks(user.id);

        if (nearlyDueTasks.length === 0) {
          console.log(`  ℹ️ No nearly-due tasks for ${user.email}\n`);
          continue;
        }

        console.log(`  📋 Found ${nearlyDueTasks.length} nearly-due task(s)`);

        const success = await sendNotificationToUser(user, nearlyDueTasks);

        if (success) {
          successCount++;
          totalTasksNotified += nearlyDueTasks.length;
          console.log(`  ✅ Notification sent to ${user.email}\n`);
        } else {
          console.log(`  ❌ Failed to send notification to ${user.email}\n`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing user ${user.email}:`, error.message);
      }
    }

    console.log(`\n✅ Completed! Sent notifications to ${successCount}/${users.length} user(s)`);
    console.log(`📊 Total tasks notified: ${totalTasksNotified}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error in sendNotificationsToAllUsers:', error);
    process.exit(1);
  }
}

// Run the script
sendNotificationsToAllUsers();
