/**
 * useTaskNotifications Hook
 * NOTE: Notifications are now handled via Firebase Cloud Functions
 */

import { useCallback, useState } from 'react';

export const useTaskNotifications = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifyTaskCreated = useCallback(async () => {
    setIsLoading(false);
  }, []);

  const notifyTaskStatusChanged = useCallback(async () => {
    setIsLoading(false);
  }, []);

  const notifyNearlyDueTasks = useCallback(async () => {
    setIsLoading(false);
  }, []);

  const notifyOverdueTasks = useCallback(async () => {
    setIsLoading(false);
  }, []);

  const checkEmailServerStatus = useCallback(async (): Promise<boolean> => {
    return true;
  }, []);

  return {
    notifyTaskCreated,
    notifyTaskStatusChanged,
    notifyNearlyDueTasks,
    notifyOverdueTasks,
    checkEmailServerStatus,
    isLoading,
    error,
  };
};
