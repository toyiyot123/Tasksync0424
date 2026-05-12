/**
 * Check Firebase Data
 * View users, tasks, and help add test data
 */

import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

dotenv.config();

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

async function checkFirebaseData() {
  try {
    console.log('\n🔥 Firebase Data Checker\n');
    console.log(`📊 Project: ${process.env.VITE_FIREBASE_PROJECT_ID}\n`);

    // Authenticate
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.warn('⚠️ Note: Public read access assumed');
    }

    // Get all users
    console.log('👥 Fetching users...\n');
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);

    if (usersSnapshot.empty) {
      console.log('❌ No users found in Firebase\n');
      console.log('📝 To test notifications, create a user at /users/{userId} with:');
      console.log('   {\n     "email": "user@example.com",\n     "displayName": "Test User"\n   }\n');
      process.exit(0);
    }

    console.log(`✅ Found ${usersSnapshot.size} user(s):\n`);

    let totalTasks = 0;
    let totalNearlyDue = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      console.log(`📌 ${userData.displayName || userData.name || 'Unknown'}`);
      console.log(`   Email: ${userData.email || '❌ No email'}`);
      console.log(`   ID: ${userId}`);

      // Get user's tasks
      try {
        const tasksCollection = collection(db, 'users', userId, 'tasks');
        const tasksSnapshot = await getDocs(tasksCollection);

        if (tasksSnapshot.empty) {
          console.log(`   Tasks: ℹ️ None\n`);
          continue;
        }

        console.log(`   Tasks: ${tasksSnapshot.size}`);

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        let nearlyDueCount = 0;

        tasksSnapshot.forEach(taskDoc => {
          const task = taskDoc.data();

          let dueDate;
          if (task.dueDate instanceof Timestamp) {
            dueDate = task.dueDate.toDate();
          } else if (task.dueDate) {
            dueDate = new Date(task.dueDate);
          }

          const isNearlyDue = dueDate && dueDate >= now && dueDate <= tomorrow && task.status !== 'completed';
          
          console.log(`     • ${task.title || 'Untitled'}`);
          console.log(`       Status: ${task.status || 'unknown'} | Priority: ${task.priority || 'medium'}`);
          if (dueDate) {
            console.log(`       Due: ${dueDate.toLocaleString()}${isNearlyDue ? ' 🔴 NEARLY DUE' : ''}`);
          }

          if (isNearlyDue) nearlyDueCount++;
          totalTasks++;
        });

        totalNearlyDue += nearlyDueCount;
        console.log('');
      } catch (error) {
        console.log(`   ❌ Error reading tasks: ${error.message}\n`);
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   👥 Total users: ${usersSnapshot.size}`);
    console.log(`   📋 Total tasks: ${totalTasks}`);
    console.log(`   🔴 Nearly-due tasks (within 24h): ${totalNearlyDue}`);
    console.log('');

    if (totalNearlyDue === 0) {
      console.log('💡 To test notifications, create tasks with dueDate within 24 hours');
      console.log('   Example: dueDate = now + 12 hours\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFirebaseData();
