import { Task } from '@/types';
import { AIScheduleResult, ScheduledTask } from './AIScheduleService';

/**
 * Generates a mock AI schedule for tutorial purposes
 * Shows users what the AI Scheduler looks like with sample data
 */
export function generateMockAISchedule(tasks: Task[]): AIScheduleResult {
  const now = new Date();
  
  // Sample productivity insights for demo purposes
  const insights = {
    bestHours: [
      { hour: 21, rate: 86 },
    ],
    worstHours: [
      { hour: 21, rate: 86 },
    ],
    overallSuccessRate: 86,
    totalRecords: 7, // Shows example: 7 historical task records
  };

  // Create mock scheduled tasks from user's actual tasks
  const schedule: ScheduledTask[] = tasks.map((task, index) => {
    // Stagger tasks throughout the day
    const startHour = 9 + (index * 2); // Start at 9 AM, space 2 hours apart
    const durationMins = task.estimatedTime || 60;
    const endHour = Math.floor((durationMins / 60) * 100) / 100;
    
    const startTime = `${String(startHour).padStart(2, '0')}:00`;
    const endTimeHours = startHour + Math.ceil(durationMins / 60);
    const endTime = `${String(endTimeHours).padStart(2, '0')}:00`;

    // Calculate confidence based on task priority (urgency and importance are numbers 1-5)
    let confidence = 70;
    if (task.urgency === 5 && task.importance === 5) {
      confidence = 92;
    } else if (task.urgency === 5 || task.importance === 5) {
      confidence = 82;
    } else if (task.urgency === 4 || task.importance === 4) {
      confidence = 75;
    }

    const reasons = [
      'Scheduled during your peak productivity hours',
      'High priority task placed early in the day',
      'Medium priority task with flexible timing',
      'Low priority task placed later',
      'Balanced workload distribution',
    ];

    return {
      task,
      startHour,
      startTime,
      endTime,
      durationMins,
      confidence,
      reason: reasons[index % reasons.length],
      scheduledDate: now,
    };
  });

  return {
    schedule,
    insights,
    generatedAt: now,
  };
}
