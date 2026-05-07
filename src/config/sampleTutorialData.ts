/**
 * Sample Tutorial Data for New Users
 * Displays realistic demo data during tutorial walkthrough
 * This helps new users understand what TaskSync looks like with real usage
 */

export const SAMPLE_TUTORIAL_DATA = {
  // Step 8: Best Productivity Hours - Example
  bestProductivityHours: {
    title: '📊 Sample: Your Best Productivity Hours',
    data: [
      {
        timeSlot: '10:00 AM - 11:30 AM',
        successRate: '94%',
        tasksCompleted: 18,
        description: 'Morning focus time - highest completion rate'
      },
      {
        timeSlot: '2:00 PM - 3:30 PM',
        successRate: '87%',
        tasksCompleted: 15,
        description: 'Post-lunch productivity peak'
      },
      {
        timeSlot: '9:00 AM - 10:00 AM',
        successRate: '82%',
        tasksCompleted: 12,
        description: 'Work startup period'
      }
    ],
    helperNote: '💡 This is sample data showing what your productivity patterns might look like after a few weeks of usage.',
    cta: 'Start adding tasks to generate your real productivity data'
  },

  // Step 9: Lowest Productivity Hours - Example
  lowestProductivityHours: {
    title: '📊 Sample: Your Challenging Hours',
    data: [
      {
        timeSlot: '4:00 PM - 5:30 PM',
        successRate: '45%',
        tasksCompleted: 5,
        description: 'End-of-day fatigue period'
      },
      {
        timeSlot: '1:00 PM - 2:00 PM',
        successRate: '38%',
        tasksCompleted: 3,
        description: 'Post-lunch energy dip'
      },
      {
        timeSlot: '11:30 AM - 12:30 PM',
        successRate: '42%',
        tasksCompleted: 4,
        description: 'Pre-lunch distraction window'
      }
    ],
    helperNote: '💡 Sample data showing times you struggle. The AI will avoid scheduling important tasks during these hours.',
    cta: 'The system learns from your real activity - keep working to refine these insights'
  },

  // Step 10: AI Confidence Score - Example
  aiConfidenceExamples: {
    title: '🎯 Sample: AI Confidence Scores',
    tasks: [
      {
        name: 'Complete Project Report',
        priority: 'High',
        deadline: 'Friday',
        confidence: '92%',
        reasoning: 'High priority tasks match your morning availability'
      },
      {
        name: 'Email Clients',
        priority: 'Medium',
        deadline: 'Today',
        confidence: '78%',
        reasoning: 'Medium tasks often compete with focus work'
      },
      {
        name: 'Team Meeting Prep',
        priority: 'High',
        deadline: 'Tomorrow',
        confidence: '85%',
        reasoning: 'Matches your peak productivity window'
      },
      {
        name: 'Code Review',
        priority: 'Low',
        deadline: 'Next Week',
        confidence: '61%',
        reasoning: 'Low priority tasks have more flexible scheduling'
      }
    ],
    helperNote: '💡 Higher confidence scores = AI understands your patterns better. These improve as you track your tasks.',
    cta: 'Complete tasks and mark them as done to increase AI confidence'
  },

  // Step 11: Calendar View - Example
  calendarSample: {
    title: '📅 Sample: Your Weekly Schedule',
    weekView: [
      {
        day: 'Monday',
        tasks: [
          { name: 'Complete Project Report', priority: 'High', time: '10:00 AM' },
          { name: 'Team Standup', priority: 'Medium', time: '2:00 PM' }
        ],
        workload: 'Moderate'
      },
      {
        day: 'Tuesday',
        tasks: [
          { name: 'Client Presentation', priority: 'High', time: '9:30 AM' },
          { name: 'Email Follow-ups', priority: 'Low', time: '3:00 PM' }
        ],
        workload: 'Busy'
      },
      {
        day: 'Wednesday',
        tasks: [
          { name: 'Code Review', priority: 'Medium', time: '10:00 AM' },
          { name: 'Documentation', priority: 'Medium', time: '2:00 PM' }
        ],
        workload: 'Moderate'
      },
      {
        day: 'Thursday',
        tasks: [
          { name: 'Product Planning', priority: 'High', time: '9:00 AM' }
        ],
        workload: 'Light'
      },
      {
        day: 'Friday',
        tasks: [
          { name: 'Submit Final Report', priority: 'High', time: '11:00 AM' },
          { name: 'Week Review', priority: 'Medium', time: '3:00 PM' }
        ],
        workload: 'Moderate'
      }
    ],
    helperNote: '💡 This is a sample calendar showing how the AI optimizes your schedule. Tasks are placed during your best hours.',
    cta: 'Add your tasks to see your personalized schedule'
  },

  // Step 12: Analytics Page - Example
  analyticsSample: {
    title: '📈 Sample: Your Productivity Analytics',
    metrics: [
      {
        label: 'Tasks Completed',
        value: '34/45',
        percentage: '76%',
        trend: 'up'
      },
      {
        label: 'On-Time Completion',
        value: '29/34',
        percentage: '85%',
        trend: 'up'
      },
      {
        label: 'High Priority Completion',
        value: '12/14',
        percentage: '86%',
        trend: 'up'
      },
      {
        label: 'Average Daily Tasks',
        value: '6.8',
        percentage: 'Optimal',
        trend: 'stable'
      }
    ],
    chartDescription: 'Completion rate over the past 4 weeks: 72% → 76% → 81% → 85% ↗️',
    helperNote: '💡 Sample analytics showing your productivity growth. Real data appears after you complete tasks.',
    cta: 'Start tracking your tasks to see your personal analytics'
  }
};

/**
 * Helper function to inject sample data into tutorial steps
 * This can be used to show sample UI overlays during tutorial
 */
export function getSampleDataForStep(stepId: string) {
  const stepMap: { [key: string]: any } = {
    'scheduler-best-hours': SAMPLE_TUTORIAL_DATA.bestProductivityHours,
    'scheduler-lowest-hours': SAMPLE_TUTORIAL_DATA.lowestProductivityHours,
    'scheduler-confidence-score': SAMPLE_TUTORIAL_DATA.aiConfidenceExamples,
    'calendar-view': SAMPLE_TUTORIAL_DATA.calendarSample,
    'analytics-completion-chart': SAMPLE_TUTORIAL_DATA.analyticsSample
  };

  return stepMap[stepId] || null;
}
