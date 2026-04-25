/**
 * Add Test Tasks to Firebase Users
 * Creates sample tasks with due dates to test notifications
 */

import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc, Timestamp } from 'firebase/firestore';
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

const testUserIds = [
  '23wxX6n2ERdK5NIsTktNla63VsM2',
  '5XEvruCUVcPbGptakyewplb3VQF2',
  '9BGrDIwaoqS8rpUUeYlvzxaDAfn1',
];

async function addTestTasks() {
  try {
    console.log('\n📝 Adding Test Tasks to Firebase\n');

    // Authenticate
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.warn('⚠️ Note: Public write access assumed\n');
    }

    let tasksAdded = 0;

    for (const userId of testUserIds) {
      try {
        console.log(`📌 Adding tasks for user: ${userId}`);

        // Create tasks with different due times
        const tasks = [
          {
            id: `task-${Date.now()}-1`,
            title: 'Complete Project Report',
            description: 'Finish the quarterly project report',
            dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
            priority: 'high',
            status: 'todo',
            category: 'Work',
            tags: ['urgent'],
            estimatedTime: 120,
            actualTime: 0,
            subtasks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: `task-${Date.now()}-2`,
            title: 'Review Code Changes',
            description: 'Review pull requests from team members',
            dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
            priority: 'medium',
            status: 'in-progress',
            category: 'Development',
            tags: ['review'],
            estimatedTime: 90,
            actualTime: 30,
            subtasks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: `task-${Date.now()}-3`,
            title: 'Update Documentation',
            description: 'Update API documentation with new endpoints',
            dueDate: new Date(Date.now() + 20 * 60 * 60 * 1000), // 20 hours from now
            priority: 'medium',
            status: 'todo',
            category: 'Documentation',
            tags: ['docs'],
            estimatedTime: 60,
            actualTime: 0,
            subtasks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        // Add tasks to Firebase
        for (const task of tasks) {
          try {
            const taskRef = doc(db, 'users', userId, 'tasks', task.id);
            await setDoc(taskRef, {
              ...task,
              dueDate: Timestamp.fromDate(task.dueDate),
              createdAt: Timestamp.fromDate(task.createdAt),
              updatedAt: Timestamp.fromDate(task.updatedAt),
            });

            console.log(`   ✅ Added: ${task.title}`);
            tasksAdded++;
          } catch (error) {
            console.error(`   ❌ Failed to add task: ${error.message}`);
          }
        }

        console.log('');
      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error.message);
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n✅ Added ${tasksAdded} test tasks\n`);
    console.log('📧 To send notifications:');
    console.log('   npm run notify-all-users\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestTasks();
