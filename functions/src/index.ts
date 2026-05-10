/**
 * Firebase Cloud Functions Entry Point
 * Exports all Cloud Functions for TaskSync
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { processSchedule } from './taskReminders';

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  sendNearlyDueReminder,
  sendNearlyDueOnTaskCreate,
  sendOverdueAlert,
} from './taskReminders';

/**
 * HTTP Endpoint for manual notification triggering
 * Call: /notify?mode=overdue or /notify?mode=nearly-due
 * Returns: JSON with sent count and results
 */
export const notify = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const mode = (req.query.mode as string) || 'nearly-due';

    if (mode !== 'nearly-due' && mode !== 'overdue') {
      res.status(400).json({ error: 'Invalid mode parameter. Use "nearly-due" or "overdue"' });
      return;
    }

    // Actually send the notifications
    const result = await processSchedule(mode as 'nearly-due' | 'overdue');

    res.status(200).json({
      success: true,
      mode,
      message: `Sent ${result.sent} notifications to ${result.users} users`,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in notify endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
