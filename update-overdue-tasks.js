/**
 * One-time migration script to mark all overdue tasks with status 'overdue'
 * 
 * SETUP INSTRUCTIONS:
 * 1. Get your Firebase Service Account JSON file:
 *    - Go to Firebase Console > Project Settings > Service Accounts
 *    - Click "Generate New Private Key"
 *    - This downloads a JSON file
 * 
 * 2. Run the script with:
 *    set FIREBASE_SERVICE_ACCOUNT="{paste entire JSON content here}"
 *    node update-overdue-tasks.js
 * 
 * OR alternatively, just deploy the Cloud Function which will run hourly:
 *    npm run deploy:functions
 */

import admin from 'firebase-admin';

let serviceAccount;

// Get service account from environment variable
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('\n❌ FIREBASE_SERVICE_ACCOUNT environment variable not set');
  console.error('\n📝 SETUP INSTRUCTIONS:');
  console.error('   1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('   2. Click "Generate New Private Key"');
  console.error('   3. Copy the entire JSON content');
  console.error('   4. Run one of these commands:\n');
  console.error('   Windows (PowerShell):');
  console.error('   $env:FIREBASE_SERVICE_ACCOUNT=\'...\'; node update-overdue-tasks.js\n');
  console.error('   Windows (CMD):');
  console.error('   set FIREBASE_SERVICE_ACCOUNT=...');
  console.error('   node update-overdue-tasks.js\n');
  console.error('   Linux/Mac:');
  console.error('   FIREBASE_SERVICE_ACCOUNT=\'...\' node update-overdue-tasks.js\n');
  console.error('💡 OR simply deploy the Cloud Function instead:');
  console.error('   npm run deploy:functions\n');
  process.exit(1);
}

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

function normalizeDueDate(dueDate) {
  if (!dueDate) {
    return new Date(0);
  }

  if (dueDate instanceof Date) {
    return dueDate;
  }

  if (typeof dueDate === 'string') {
    return new Date(dueDate);
  }

  if (dueDate.toDate && typeof dueDate.toDate === 'function') {
    return dueDate.toDate();
  }

  return new Date(0);
}

async function updateOverdueTasksOneTime() {
  console.log('Starting one-time migration to update overdue tasks...');
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const usersSnapshot = await db.collection('users').get();
    const now = new Date();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\nProcessing user: ${userId}`);

      try {
        const tasksSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('tasks')
          .get();

        for (const taskDoc of tasksSnapshot.docs) {
          const task = taskDoc.data();
          const taskId = taskDoc.id;

          // Skip if already completed or already marked as overdue
          if (task.status === 'completed' || task.status === 'overdue') {
            skipped++;
            continue;
          }

          // Get due date from either dueDate or due_at field
          const rawDueDate = task.dueDate || task.due_at;
          const dueDate = normalizeDueDate(rawDueDate);

          // Check if task is overdue (due date is in the past)
          if (Number.isFinite(dueDate.getTime()) && dueDate < now) {
            await db
              .collection('users')
              .doc(userId)
              .collection('tasks')
              .doc(taskId)
              .update({
                status: 'overdue',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

            updated++;
            console.log(`  ✓ Updated: ${task.title || 'Untitled'} (due: ${dueDate.toLocaleDateString()})`);
          } else {
            skipped++;
          }
        }
      } catch (userError) {
        errors++;
        console.error(`  ✗ Error processing user ${userId}:`, userError);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Updated: ${updated} tasks`);
    console.log(`Skipped: ${skipped} tasks`);
    console.log(`Errors: ${errors}`);

    await admin.app().delete();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await admin.app().delete();
    process.exit(1);
  }
}

updateOverdueTasksOneTime();
