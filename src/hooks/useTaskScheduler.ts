/**
 * useTaskScheduler Hook
 * Automatically starts scheduled email reminders when user logs in
 * 
 * Usage in App.tsx or LoginPage:
 * useTaskScheduler({ userId: user.uid, userEmail: user.email, userName: user.displayName });
 */

import { useEffect } from 'react';
import { TaskScheduler } from '@/services/TaskScheduler';

interface UseTaskSchedulerProps {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export const useTaskScheduler = ({
  userId,
  userEmail,
  userName,
}: UseTaskSchedulerProps) => {
  useEffect(() => {
    // Only initialize if user is logged in
    if (userId && userEmail && userName) {
      console.log('🚀 Starting task scheduler...');
      TaskScheduler.initialize(userId, userEmail, userName);
    }
  }, [userId, userEmail, userName]);
};
