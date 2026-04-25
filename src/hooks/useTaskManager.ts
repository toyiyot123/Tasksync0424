/**
 * useTaskManager Hook
 * Automatically sends email notifications with task operations
 * 
 * Usage:
 * const { createTask, updateTaskStatus } = useTaskManager();
 * 
 * // When creating a task
 * await createTask(userId, taskData);
 * 
 * // When updating status
 * await updateTaskStatus(taskId, newStatus, currentTask);
 */

import { useCallback, useState } from 'react';
import { TaskServiceWithNotifications } from '@/services/TaskServiceWithNotifications';
import { Task } from '@/types';

interface UseTaskManagerProps {
  userEmail?: string;
  userName?: string;
}

export const useTaskManager = ({ userEmail = '', userName = '' }: UseTaskManagerProps = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new task (no email notification)
   */
  const createTask = useCallback(
    async (userId: string, taskData: any) => {
      try {
        setIsLoading(true);
        setError(null);

        const taskId = await TaskServiceWithNotifications.createTask(userId, taskData);
        return taskId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        console.error(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update task status (no email notification)
   */
  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: Task['status']) => {
      try {
        setIsLoading(true);
        setError(null);

        // await TaskService.updateTask(taskId, { status: newStatus });
        // Notifications handled via Firebase Cloud Functions
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update task';
        setError(message);
        console.error(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Send reminder for nearly due tasks
   */
  const sendNearlyDueReminder = useCallback(
    async (tasks: Task[]) => {
      if (!userEmail || !userName) {
        console.warn('User email or name not provided, skipping notifications');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        await TaskServiceWithNotifications.sendNearlyDueReminders(tasks, userEmail, userName);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send reminder';
        setError(message);
        console.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [userEmail, userName]
  );

  /**
   * Send alert for overdue tasks
   */
  const sendOverdueAlert = useCallback(
    async (tasks: Task[]) => {
      if (!userEmail || !userName) {
        console.warn('User email or name not provided, skipping notifications');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        await TaskServiceWithNotifications.sendOverdueAlerts(tasks, userEmail, userName);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send alert';
        setError(message);
        console.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [userEmail, userName]
  );

  return {
    createTask,
    updateTaskStatus,
    sendNearlyDueReminder,
    sendOverdueAlert,
    isLoading,
    error,
  };
};
