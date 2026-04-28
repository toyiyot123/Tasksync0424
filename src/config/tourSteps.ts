import { TutorialStep } from '@/store/tutorialStore';

export const TOUR_STEPS: TutorialStep[] = [
  // Step 1: Dashboard Overview
  {
    id: 'dashboard-summary-cards',
    targetSelector: '[data-tour="summary-cards"]',
    title: 'Real-Time Task Overview',
    message:
      'Welcome to TaskSync! These Summary Cards provide a real-time count of your total, in-progress, and overdue tasks. This helps you track your daily workload at a glance.',
    position: 'bottom',
    highlightPadding: 12,
    page: 'dashboard',
  },

  // Step 2: Create First Task
  {
    id: 'tasks-new-task-button',
    targetSelector: '[data-tour="new-task-button"]',
    title: 'Start Your First Task',
    message:
      'Adding a task with a specific priority level is the vital first step for the AI to begin its learning process. Click this button to create your first task and let the AI understand your preferences.',
    position: 'bottom',
    highlightPadding: 2,
    page: 'tasks',
  },

  // Step 3: Click AI Schedule Button
  {
    id: 'dashboard-ai-schedule-button',
    targetSelector: '[data-tour="ai-schedule-button"]',
    title: 'Generate Your AI Schedule',
    message:
      'After creating your tasks, click the "AI Schedule" button on the dashboard to let the AI analyze your tasks and create an optimized schedule based on your productivity patterns and preferences.',
    position: 'bottom',
    highlightPadding: 2,
    page: 'dashboard',
  },

  // Step 4: AI Schedule Reminder - Go to Settings
  {
    id: 'ai-schedule-reminder-modal',
    targetSelector: '[data-tour="ai-schedule-go-to-settings"]',
    title: 'Configure Your AI Settings',
    message:
      'The "AI Schedule Reminder" popup has appeared! Click "Go to Settings" to configure your work schedule and AI behavior preferences. This setup is quick and essential for the AI to create an optimized schedule tailored to your productivity patterns.',
    position: 'bottom',
    highlightPadding: 6,
    page: 'dashboard',
  },

  // Step 5: Work Schedule Settings
  {
    id: 'settings-work-schedule',
    targetSelector: '[data-tour="work-schedule"]',
    title: 'Set Your Work Schedule',
    message:
      'Define your work hours and peak productivity window. Use the sliders to set: Work Start (when you typically begin), Work End (when you stop), Peak Start (your most productive period), and Peak End. The AI uses these to schedule tasks during times when you\'re most effective.',
    position: 'bottom',
    highlightPadding: 12,
    page: 'settings',
  },

  // Step 6: Wellbeing & AI Behavior Settings
  {
    id: 'settings-wellbeing-ai-behavior',
    targetSelector: '[data-tour="wellbeing-ai-behavior"]',
    title: 'Personalize Your AI Behavior',
    message:
      'Set your Stress Level (Low, Moderate, High) - this controls how the AI distributes your workload. High stress means lighter task loads. Set your Scheduling Style: "Balanced" uses your best hours within your work window, "Focused" schedules only during peak hours for deep work, "Flexible" spreads tasks across all available hours. Choose what works best for your work style!',
    position: 'bottom',
    highlightPadding: 12,
    page: 'settings',
  },

  // Step 7: Click Continue Button
  {
    id: 'ai-schedule-reminder-continue',
    targetSelector: '[data-tour="ai-schedule-continue-button"]',
    title: 'Complete Your Setup',
    message:
      'Click the "AI Schedule" button again and when the reminder popup appears, click "Continue" to proceed. The AI will now use all your configured settings to create an intelligent schedule tailored to your productivity patterns.',
    position: 'bottom',
    highlightPadding: 6,
    page: 'dashboard',
  },

  // Step 8: Best Productivity Hours
  {
    id: 'scheduler-best-hours',
    targetSelector: '[data-tour="scheduler-best-hours"]',
    title: 'Your Best Productivity Hours',
    message:
      'Based on your work patterns, the AI shows your most productive time slots. These are the times when you consistently complete tasks successfully. Schedule your high-priority work during these peak windows for maximum productivity.',
    position: 'bottom',
    highlightPadding: 10,
    page: 'scheduler',
  },

  // Step 9: Lowest Productivity Hours
  {
    id: 'scheduler-lowest-hours',
    targetSelector: '[data-tour="scheduler-lowest-hours"]',
    title: 'Avoid Low Productivity Times',
    message:
      'These are your challenging hours with lower success rates. The AI helps you avoid scheduling important tasks during these times. Use these slots for routine work or breaks to maintain your wellbeing.',
    position: 'bottom',
    highlightPadding: 10,
    page: 'scheduler',
  },

  // Step 10: Confidence Percentage
  {
    id: 'scheduler-confidence-score',
    targetSelector: '[data-tour="scheduler-confidence-score"]',
    title: 'AI Confidence Score',
    message:
      'This percentage shows how confident the AI is about its scheduling recommendation for each task. The higher the score (closer to 100%), the better the AI understands your patterns and preferences. As you use the system, these scores improve!',
    position: 'bottom',
    highlightPadding: 4,
    page: 'scheduler',
  },

  // Step 11: Calendar View
  {
    id: 'calendar-view',
    targetSelector: '[data-tour="calendar-grid"]',
    title: 'Visualize Your Schedule',
    message:
      'The Calendar view shows all your tasks organized by date. You can see at a glance when tasks are due and how your workload is distributed. Use this to plan ahead and manage your time effectively across the month.',
    position: 'bottom',
    highlightPadding: 12,
    page: 'calendar',
  },

  // Step 12: Analytics Page
  {
    id: 'analytics-completion-chart',
    targetSelector: '[data-tour="analytics-page"]',
    title: 'Track Your Productivity Growth',
    message:
      'The Analytics page shows your productivity trends over time. You\'ll see your completion rate, priority distribution, and tasks by category. These insights help you understand your work patterns and make adjustments to improve your productivity.',
    position: 'bottom',
    highlightPadding: 12,
    page: 'analytics',
  },

  // Step 13: Tutorial Help
  {
    id: 'settings-redo-button',
    targetSelector: '[data-tour="redo-tutorial-button"]',
    title: 'Need a Refresher?',
    message:
      'If you ever feel lost or need a refresher on how TaskSync works, you can return to this spot in Settings to restart the entire guided tour from the beginning. Your learning journey is always here for you!',
    position: 'top',
    highlightPadding: 2,
    page: 'settings',
  },
];
