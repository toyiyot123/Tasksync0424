import { TutorialStep } from '@/store/tutorialStore';
import { useTaskStore } from '@/store/taskStore';

// Function to check if user has created at least 6 tasks
const hasCreatedTask = () => {
  const tasks = useTaskStore.getState().getTasks();
  return tasks.length >= 6;
};

export const TOUR_STEPS: TutorialStep[] = [
  // Step 1: Dashboard Overview
  {
    id: 'dashboard-summary-cards',
    targetSelector: '[data-tour="summary-cards"]',
    title: '👋 Welcome to TaskSync!',
    message:
      'Meet your new task management companion! These summary cards are your quick glance dashboard. For example, if you have 8 total tasks, 3 in progress, and 1 overdue task, you\'ll see them all here at a glance. It\'s like having a personal task counter on your screen!',
    position: 'bottom',
    highlightPadding: 12,
    page: 'dashboard',
  },

  // Step 2: Create First Task
  {
    id: 'tasks-new-task-button',
    targetSelector: '[data-tour="new-task-button"]',
    title: '📝 Let\'s Add Your First Task',
    message:
      'Here\'s where the magic starts! Click this button to create your first task. Let\'s say you have a project deadline on Friday or a report to submit by tomorrow. The more tasks you add with their priority levels (High, Medium, Low), the smarter the AI becomes at understanding your work style.',
    position: 'bottom',
    highlightPadding: 2,
    page: 'tasks',
  },

  // Step 3: Create Task Form
  {
    id: 'task-form-creation',
    targetSelector: '[data-tour="task-form-container"]',
    title: '📋 Fill In Your Task Details',
    message:
      'Here\'s the task creation form! Fill in the essentials: Title (e.g., "Complete quarterly report"), add a description if needed, pick a category (Work, Personal, Health, etc.), and set Urgency & Importance levels. The AI uses these to prioritize your schedule. For example, "Fix critical bug" would be High urgency + High importance, while "Organize desk" might be Low/Low.',
    position: 'left',
    highlightPadding: 8,
    page: 'tasks',
    canAdvance: hasCreatedTask,
  },

  // Step 4: Task Action Buttons (moved from Step 5)
  {
    id: 'task-action-buttons',
    targetSelector: '[data-tour="task-play-button"]',
    title: '▶️ Start Working on Your Task',
    message:
      'Once you create tasks, you\'ll see them here with action buttons. Here are some example tasks you might add:\n• "Complete quarterly report" (High priority, Due Friday)\n• "Review project budget" (High priority, Due Tomorrow)\n• "Prepare presentation slides" (Medium priority, Due Next Week)\n• "Schedule team meeting" (Low priority, Due This Week)\n\nClick the play button on any task to change its status from "To Do" to "In Progress." As you work on tasks and mark them complete, the AI learns your actual work pace and patterns. It\'s like having a personal assistant that learns how you work over time!',
    position: 'bottom',
    highlightPadding: 6,
    page: 'tasks',
  },

  // Step 5: AI Schedule Reminder - Go to Settings (moved from Step 6)
  {
    id: 'ai-schedule-reminder-modal',
    targetSelector: '[data-tour="ai-schedule-go-to-settings"]',
    title: '⚙️ Personalize Your AI Settings',
    message:
      'A settings popup appeared! This is important for making the AI work best for you. Click "Go to Settings" to tell the AI about your work schedule. For example, if you work 9 AM to 5 PM and you\'re most productive mid-morning, this helps the AI schedule your toughest tasks when you\'re at your best.',
    position: 'left',
    highlightPadding: 6,
    page: 'dashboard',
  },

  // Step 6: Work Schedule Settings (moved from Step 7)
  {
    id: 'settings-work-schedule',
    targetSelector: '[data-tour="work-schedule"]',
    title: '🕐 Set Your Work Hours',
    message:
      'This is where you define your ideal work schedule. For example: Start at 9 AM, end at 6 PM, most productive from 10 AM to 1 PM. These settings help the AI schedule your important work during your peak hours. Think of it as telling the AI about your personal work rhythm!',
    position: 'bottom',
    highlightPadding: 12,
    page: 'settings',
  },

  // Step 7: Wellbeing & AI Behavior Settings (moved from Step 8)
  {
    id: 'settings-wellbeing-ai-behavior',
    targetSelector: '[data-tour="wellbeing-ai-behavior"]',
    title: '💪 Customize Your Workload Style',
    message:
      'Here\'s where you set your comfort level. If you\'re feeling stressed, set it to "High" and the AI will give you fewer tasks per day. Choose your scheduling style: "Balanced" spreads work throughout your day, "Focused" packs tasks into your peak hours for deep work, or "Flexible" lets you stay adaptable. What works best for you?',
    position: 'bottom',
    highlightPadding: 12,
    page: 'settings',
  },

  // Step 8: Click Continue Button
  {
    id: 'ai-schedule-reminder-continue',
    targetSelector: '[data-tour="ai-schedule-continue-button"]',
    title: '🎯 Generate Your Smart Schedule',
    message:
      'Now that the AI knows your schedule preferences, click "AI Schedule" again to generate your optimized schedule! The system will create a personalized plan that respects your work hours, peak productivity times, and stress level. Get ready to see your tasks organized in the smartest way possible!',
    position: 'right',
    highlightPadding: 6,
    page: 'dashboard',
  },

  // Step 9: Click AI Schedule Button
  {
    id: 'dashboard-ai-schedule-button',
    targetSelector: '[data-tour="ai-generated-schedule-modal"]',
    title: 'AI Generated Schedule',
    message:
      'Click here to see a preview of how the AI Scheduler works! You\'ll see your task intelligently scheduled with confidence scores and reasoning. For example, if your task is marked as "High Priority," the AI will schedule it during your peak productivity hours. After the tutorial, you can configure your work preferences in Settings to get even smarter scheduling!',
    position: 'bottom',
    highlightPadding: 2,
    page: 'dashboard',
  },

  // Step 10: Best Productivity Hours (moved from Step 9)
  {
    id: 'scheduler-best-hours',
    targetSelector: '[data-tour="scheduler-best-hours"]',
    title: '⭐ Your Best Productivity Hours',
    message:
      'Look at this insight! From analyzing 7 historical task records with an 86% overall success rate, your best productivity time is 9:00 PM - 10:00 PM with 86% success (shown on the left). These are your "power hours" when you consistently finish tasks fastest. The AI schedules your most important work here so you finish strong!',
    position: 'bottom',
    highlightPadding: 8,
    page: 'scheduler',
  },

  // Step 11: Lowest Productivity Hours
  {
    id: 'scheduler-lowest-hours',
    targetSelector: '[data-tour="scheduler-lowest-hours"]',
    title: '🚫 Your Lowest Productivity Hours',
    message:
      'The AI also identified your challenging times on the right side. In this example, 9:00 PM - 10:00 PM shows 86% success as your lowest productivity hour (your "challenge time"). Instead of forcing important work into these low-energy periods, the AI schedules lighter tasks here. This keeps you feeling good and prevents burnout!',
    position: 'bottom',
    highlightPadding: 8,
    page: 'scheduler',
  },

  // Step 12: Confidence Percentage
  {
    id: 'scheduler-confidence-score',
    targetSelector: '[data-tour="scheduler-confidence-score"]',
    title: '📊 AI Confidence Score',
    message:
      'See this percentage? It\'s the AI\'s confidence in its recommendation. Higher scores mean the AI really understands your patterns. As you complete more tasks, these scores improve!',
    position: 'left',
    highlightPadding: 10,
    page: 'scheduler',
  },

  // Step 13: Calendar View (moved from Step 13)
  {
    id: 'calendar-view',
    targetSelector: '[data-tour="calendar-grid"]',
    title: '📅 Your Visual Schedule',
    message:
      'The Calendar view is your big-picture overview. You might see: Monday (2 moderate tasks), Tuesday (2 busy tasks), Wednesday (2 medium tasks), Thursday (1 light task), Friday (2 moderate tasks with deadline). It\'s perfect for planning ahead and making sure you\'re not overwhelmed on any single day!',
    position: 'bottom',
    highlightPadding: 12,
    page: 'calendar',
  },

  // Step 14: Analytics Page (moved from Step 14)
  {
    id: 'analytics-completion-chart',
    targetSelector: '[data-tour="analytics-page"]',
    title: '📈 Watch Your Growth',
    message:
      'This is where you see your success story! You might see: 76% completion rate (34 of 45 tasks), 85% on-time completion, 86% high-priority completion, and productivity growing from 72% → 76% → 81% → 85% over 4 weeks! These insights help you celebrate wins and make improvements.',
    position: 'bottom',
    highlightPadding: 12,
    page: 'analytics',
  },

  // Step 15: Tutorial Help (moved from Step 15)
  {
    id: 'settings-redo-button',
    targetSelector: '[data-tour="redo-tutorial-button"]',
    title: '🎓 Keep Learning Anytime',
    message:
      'That\'s the complete tour! Don\'t worry if you want to revisit this walkthrough—you can always click the "Tutorial" button in the sidebar to start over. Whether you need a refresher or want to learn a feature you missed, the tutorial is here for you whenever you need it!',
    position: 'top',
    highlightPadding: 2,
    page: 'settings',
  },
];

// Tour steps for existing users - same 15 steps but without task creation requirement
export const EXISTING_USER_TOUR_STEPS: TutorialStep[] = TOUR_STEPS.map(step => {
  // Remove the canAdvance check from step 3 for existing users
  if (step.id === 'task-form-creation') {
    const { canAdvance, ...rest } = step;
    return rest;
  }
  return step;
});
