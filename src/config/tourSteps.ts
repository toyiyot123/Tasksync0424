import { TutorialStep } from '@/store/tutorialStore';

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

  // Step 3: Click AI Schedule Button
  {
    id: 'dashboard-ai-schedule-button',
    targetSelector: '[data-tour="ai-schedule-button"]',
    title: '✨ Generate Your Personalized Schedule',
    message:
      'Once you\'ve added a few tasks, click here to let the AI work its magic! The system will analyze your tasks and create a smart schedule. For example, if your Friday deadline task is marked as "High Priority," the AI will schedule it earlier in your week to give you time to complete it.',
    position: 'bottom',
    highlightPadding: 2,
    page: 'dashboard',
  },

  // Step 3.5: Task Action Buttons
  {
    id: 'task-action-buttons',
    targetSelector: '[data-tour="task-todo-card"]',
    title: '▶️ Start Working on Your Task',
    message:
      'Click the play button to start a task. When you click it, the task status changes from "To Do" to "In Progress." As you work on tasks and mark them complete, the AI learns your actual work pace and patterns. It\'s like having a personal assistant that learns how you work over time!',
    position: 'bottom',
    highlightPadding: 10,
    page: 'tasks',
  },

  // Step 4: AI Schedule Reminder - Go to Settings
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

  // Step 5: Work Schedule Settings
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

  // Step 6: Wellbeing & AI Behavior Settings
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

  // Step 7: Click Continue Button
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

  // Step 8: Best Productivity Hours
  {
    id: 'scheduler-best-hours',
    targetSelector: '[data-tour="scheduler-best-hours"]',
    title: '⭐ Your Power Hours',
    message:
      'Here\'s a cool insight from the AI! For example, you might see: 10:00 AM - 11:30 AM (94% success rate) and 2:00 PM - 3:30 PM (87% success rate). These are your "power hours" when you consistently finish tasks fastest. The AI will schedule your most important work here so you finish strong!',
    position: 'bottom',
    highlightPadding: 10,
    page: 'scheduler',
  },

  // Step 9: Lowest Productivity Hours
  {
    id: 'scheduler-lowest-hours',
    targetSelector: '[data-tour="scheduler-lowest-hours"]',
    title: '🚫 Your Challenging Times',
    message:
      'The AI also learns when you struggle. Sample times might look like: 4:00 PM - 5:30 PM (45% success rate) or 1:00 PM - 2:00 PM (38% success rate). Instead of forcing important work into these low-energy times, the AI schedules lighter tasks here. This keeps you feeling good and prevents burnout!',
    position: 'bottom',
    highlightPadding: 10,
    page: 'scheduler',
  },

  // Step 10: Confidence Percentage
  {
    id: 'scheduler-confidence-score',
    targetSelector: '[data-tour="scheduler-confidence-score"]',
    title: '📊 AI Confidence Score',
    message:
      'See this percentage? It\'s the AI\'s confidence in its recommendation! For example: "Complete Project Report" might show 92% (high priority + morning availability), while "Code Review" shows 61% (low priority, flexible deadline). Higher scores mean the AI really understands your patterns. As you complete more tasks, these scores increase!',
    position: 'bottom',
    highlightPadding: 4,
    page: 'scheduler',
  },

  // Step 11: Calendar View
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

  // Step 12: Analytics Page
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

  // Step 13: Tutorial Help
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
