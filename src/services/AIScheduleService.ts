import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Task, AIScheduleSettings, DEFAULT_SCHEDULE_SETTINGS } from '@/types';
import { DQLSchedulerModel, DQLPrediction, DQLTrainingRecord } from './DQLModel';

export interface ScheduledTask {
  task: Task;
  startHour: number;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:30"
  durationMins: number;
  confidence: number; // 0-100
  reason: string;
  scheduledDate: Date; // the calendar day this task is scheduled on
}

export interface ProductivityInsight {
  bestHours: { hour: number; rate: number }[];
  worstHours: { hour: number; rate: number }[];
  overallSuccessRate: number;
  totalRecords: number;
}

export interface UnscheduledTask {
  task: Task;
  reason: string;
}

export interface AIScheduleResult {
  schedule: ScheduledTask[];
  unscheduled: UnscheduledTask[];
  insights: ProductivityInsight;
  generatedAt: Date;
}

interface TaskHistoryRecord {
  task_name: string;
  hour: number;
  completed: number; // 0 or 1
  duration: number;
  user_id?: string;
}

async function fetchTaskHistory(userId: string): Promise<TaskHistoryRecord[]> {
  // ── 1. Try dedicated task_history collection (populated by notebook / external tools) ──
  try {
    const ref = collection(db, 'task_history');
    const userQ = query(ref, where('user_id', '==', userId));
    const userSnap = await getDocs(userQ);

    if (!userSnap.empty) {
      const records = userSnap.docs
        .map(d => d.data() as Partial<TaskHistoryRecord>)
        .filter(d => d.task_name != null && d.hour != null && d.completed != null && d.duration != null) as TaskHistoryRecord[];
      if (records.length > 0) return records;
    }

    // Try without user_id filter (shared / demo data)
    const allSnap = await getDocs(ref);
    if (!allSnap.empty) {
      const records = allSnap.docs
        .map(d => d.data() as Partial<TaskHistoryRecord>)
        .filter(d => d.task_name != null && d.hour != null && d.completed != null && d.duration != null) as TaskHistoryRecord[];
      if (records.length > 0) return records;
    }
  } catch (e) {
    console.warn('[AISchedule] task_history collection unavailable:', e);
  }

  // ── 2. Fallback: derive patterns from the existing tasks collection ──
  // completed tasks → completed=1, hour from updated_at (when they were actually done)
  // overdue tasks  → completed=0, hour from due_at (when they were planned)
  // Pending future tasks are EXCLUDED — they aren't failures yet, so counting them
  // would deflate the user's success rate (e.g. 6 completed of 15 → false 40%).
  try {
    const tasksRef = collection(db, 'tasks');
    const tasksQ = query(tasksRef, where('user_id', '==', userId));
    const tasksSnap = await getDocs(tasksQ);

    if (tasksSnap.empty) return [];

    const now = new Date();
    return tasksSnap.docs
      .map(d => {
        const data = d.data();
        const isCompleted = data.status === 'completed';
        const dueDate: Date = data.due_at?.toDate?.() ?? new Date();
        const updatedAt: Date = data.updated_at?.toDate?.() ?? dueDate;
        const isOverdue = !isCompleted && dueDate.getTime() < now.getTime();
        // Skip non-resolved tasks (still pending, not yet due)
        if (!isCompleted && !isOverdue) return null;
        // For completed tasks use the hour they were finished; for overdue, the hour they were due
        const rawHour = isCompleted ? updatedAt.getHours() : dueDate.getHours();
        const estimatedMins: number = data.estimated_time ?? 60;
        return {
          task_name: data.title ?? 'Unknown',
          hour: Math.max(0, Math.min(23, rawHour)),
          completed: isCompleted ? 1 : 0,
          duration: estimatedMins / 60,
          user_id: userId,
        } as TaskHistoryRecord;
      })
      .filter((r): r is TaskHistoryRecord => r !== null);
  } catch (e) {
    console.warn('[AISchedule] tasks fallback fetch failed:', e);
    return [];
  }
}

async function countCompletedTasks(userId: string): Promise<number> {
  try {
    const tasksRef = collection(db, 'tasks');
    const tasksQ = query(tasksRef, where('user_id', '==', userId), where('status', '==', 'completed'));
    const tasksSnap = await getDocs(tasksQ);
    return tasksSnap.size;
  } catch (e) {
    console.warn('[AISchedule] Failed to count completed tasks:', e);
    return 0;
  }
}

function computeHourlyRates(records: TaskHistoryRecord[]): Map<number, { completed: number; total: number }> {
  const map = new Map<number, { completed: number; total: number }>();
  for (const r of records) {
    const hour = Math.max(0, Math.min(23, r.hour));
    const existing = map.get(hour) ?? { completed: 0, total: 0 };
    existing.total += 1;
    existing.completed += r.completed ? 1 : 0;
    map.set(hour, existing);
  }
  return map;
}

function rankHours(hourlyRates: Map<number, { completed: number; total: number }>): { hour: number; rate: number }[] {
  const result: { hour: number; rate: number }[] = [];
  // Fill all 24 hours. Hours with fewer than 2 recorded tasks are treated as 0% —
  // a single data point (1/1 = 100%) is not a reliable productivity signal and would
  // mislead the user into thinking that hour is always productive.
  const MIN_SAMPLES = 2;
  for (let h = 0; h < 24; h++) {
    const stats = hourlyRates.get(h);
    const rate = stats && stats.total >= MIN_SAMPLES ? Math.round((stats.completed / stats.total) * 100) : 0;
    result.push({ hour: h, rate });
  }
  return result.sort((a, b) => b.rate - a.rate);
}

// ── Learned feature inference ──
// When urgency/importance are at their default (5,5), infer representative values
// from the priority label so the model has a meaningful continuous signal.
// This mirrors how the DQL notebook encodes priority as a 1-10 numeric feature.
const PRIORITY_INFERRED: Record<Task['priority'], { urgency: number; importance: number }> = {
  high:   { urgency: 8.5, importance: 8.5 },
  medium: { urgency: 5.0, importance: 5.0 },
  low:    { urgency: 2.0, importance: 2.0 },
};

// Convert a task's priority to a numeric 1-10 score used as the DQL priority input.
// Matches the notebook's numeric encoding: high≈8, medium≈5, low≈2.
function toPriorityNum(task: Task): number {
  const u = task.urgency ?? 5;
  const i = task.importance ?? 5;
  if (u === 5 && i === 5) return { high: 8, medium: 5, low: 2 }[task.priority] ?? 5;
  return (u + i) / 2;
}

// Resolve the effective urgency/importance for a task.
// Uses the task's own values if they've been customised; otherwise infers from priority.
function resolveFeatures(task: Task): { urgency: number; importance: number } {
  const u = task.urgency ?? 5;
  const i = task.importance ?? 5;
  // If both are at the exact default, treat them as unset and infer from priority
  if (u === 5 && i === 5) {
    return PRIORITY_INFERRED[task.priority] ?? { urgency: 5, importance: 5 };
  }
  return { urgency: u, importance: i };
}

// Compute task intensity: geometric mean of urgency × importance, normalised 0-1.
// Pure input-driven — no lookup tables, no hardcoded ordering by label.
function computeTaskIntensity(task: Task): number {
  const { urgency, importance } = resolveFeatures(task);
  return Math.sqrt(urgency * importance) / 10; // 0-1
}

// Deadline score using exponential decay (natural, non-rule-based)
// k=0.099: 0 days→1.0, 7 days→0.50, 14 days→0.25, 30 days→0.05
function computeDeadlineScore(task: Task): number {
  const now = new Date();
  const daysUntilDeadline = (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilDeadline <= 0) return 1.0;
  return Math.exp(-0.099 * daysUntilDeadline);
}

// ── Data-driven weight learning ──
// Learns how much to weight intensity vs deadline from the user's own history.
// Mirrors the DQL's implicit learning of Q-value coefficients from observed rewards.
//
// Logic: compare completion rates in "early" hours (user planned ahead → priority-driven)
// vs "late" hours (user worked near deadline → deadline-driven).
// If deadlines drive the user → weight deadline more.
// If the user completes tasks regardless of deadline → weight intensity (priority) more.
function learnWeights(records: TaskHistoryRecord[]): { intensity: number; deadline: number } {
  if (records.length < 5) return { intensity: 0.65, deadline: 0.35 };

  // Early hours (8-12): tasks done proactively — correlate with intensity/priority
  // Late hours (16-21): tasks done under time pressure — correlate with deadline
  const early = records.filter(r => r.hour >= 8 && r.hour < 13);
  const late  = records.filter(r => r.hour >= 16 && r.hour <= 21);

  const earlyRate = early.length > 0 ? early.filter(r => r.completed).length / early.length : 0.5;
  const lateRate  = late.length  > 0 ? late.filter(r => r.completed).length  / late.length  : 0.5;

  // If the user completes more tasks in early hours they are priority-driven
  // If late hours have higher completion they are deadline-driven
  const priorityDriven = Math.max(0, earlyRate - lateRate); // 0-1
  const deadlineDriven = Math.max(0, lateRate - earlyRate); // 0-1

  // Blend: default intensity=0.65, slide toward whichever signal is stronger
  const intensityWeight = Math.min(0.85, Math.max(0.45, 0.65 + priorityDriven * 0.2 - deadlineDriven * 0.2));
  return { intensity: intensityWeight, deadline: 1 - intensityWeight };
}

// Final learned score: combines intensity and deadline with data-derived weights.
// This is the equivalent of the DQL's Q-value for "how urgently should this task be scheduled."
function computeLearnedScore(task: Task, weights: { intensity: number; deadline: number }): number {
  return computeTaskIntensity(task) * weights.intensity
       + computeDeadlineScore(task)  * weights.deadline;
}

function computeConfidence(
  task: Task,
  assignedHour: number,
  hourlyRates: Map<number, { completed: number; total: number }>,
  overallSuccessRate: number
): number {
  const hourRate = hourlyRates.get(assignedHour);
  const hourBase = hourRate
    ? Math.round((hourRate.completed / hourRate.total) * 100)
    : overallSuccessRate;

  const intensity = computeTaskIntensity(task);
  const intensityBonus = Math.round(intensity * 10);
  return Math.min(100, Math.max(10, hourBase + intensityBonus));
}

function formatTime(hour: number, minutes = 0): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

export class NotEnoughHistoryError extends Error {
  constructor(public readonly count: number) {
    super(`Not enough completed tasks: ${count} found. Complete more than 5 tasks to unlock AI recommendations.`);
    this.name = 'NotEnoughHistoryError';
  }
}

const MIN_COMPLETED_TASKS = 5; // Must have MORE than 5 completed tasks
const MIN_RECORDS_FOR_INSIGHTS = 10; // Need at least 10 historical records for reliable productivity insights

export async function generateAISchedule(
  userId: string,
  pendingTasks: Task[],
  settings: AIScheduleSettings = DEFAULT_SCHEDULE_SETTINGS
): Promise<AIScheduleResult> {
  // Check if user has more than 5 completed tasks
  const completedCount = await countCompletedTasks(userId);
  if (completedCount <= MIN_COMPLETED_TASKS) {
    throw new NotEnoughHistoryError(completedCount);
  }

  const records = await fetchTaskHistory(userId);

  const hourlyRates = computeHourlyRates(records);
  const ranked = rankHours(hourlyRates);

  // Build insights — only populate if sufficient data exists
  const overallSuccessRate =
    records.length > 0
      ? Math.round((records.filter(r => r.completed).length / records.length) * 100)
      : 0;

  // Only show productivity hour insights if we have enough historical data
  // New users with few records will see empty arrays
  const hasReliableInsights = records.length >= MIN_RECORDS_FOR_INSIGHTS;

  const insights: ProductivityInsight = {
    bestHours: hasReliableInsights
      ? (() => {
          // Cap at half the distinct hours so worst list always has entries too
          const limit = Math.max(1, Math.ceil(ranked.length / 2));
          // Exclude 0% rates — they aren't meaningfully "best" productivity hours
          return ranked.slice(0, Math.min(3, limit)).filter(h => h.rate > 0);
        })()
      : [],
    worstHours: hasReliableInsights
      ? (() => {
          const limit = Math.max(1, Math.ceil(ranked.length / 2));
          const bestSet = new Set(ranked.slice(0, Math.min(3, limit)).map(h => h.hour));
          // Hours NOT in bestHours, sorted worst (lowest rate) first.
          // Exclude 0% rates — those represent hours with no recorded activity at all,
          // not genuinely poor productivity.
          const candidates = [...ranked].reverse().filter(h => !bestSet.has(h.hour) && h.rate > 0);
          return candidates.slice(0, 3);
        })()
      : [],
    overallSuccessRate,
    // Display the count of COMPLETED records only (what users mean by "historical task records").
    // The full `records` array (which also includes pending/non-completed tasks as negative
    // training signals) is still used internally for model training and success-rate math.
    totalRecords: records.filter(r => r.completed === 1).length,
  };

  // ════════════════════════════════════════════════════════════════════════════════════
  // ALL USER SETTINGS ARE APPLIED HERE — The AI follows your preferences
  // ════════════════════════════════════════════════════════════════════════════════════
  // 
  // workStart/workEnd:      Hard constraints — tasks NEVER scheduled outside this window
  // peakStart/peakEnd:      Used by "Focused" scheduling style to concentrate high-priority work
  // taskBlock:              Default task duration (minutes) when estimatedTime not provided
  // breakMinutes:           Not used when stress level is set — AI uses FIXED break times based on stress level:
  //                         - High stress: 35 minutes (maximum recovery time, lighter load)
  //                         - Moderate stress: 20 minutes (balanced breaks)
  //                         - Low stress: 10 minutes (shorter breaks, denser schedule)
  // stressLevel:            Controls task spacing/density via fixed break time durations
  // schedulingStyle:        How to choose task hours:
  //                         - Focused: use peak hours only (peakStart → peakEnd)
  //                         - Balanced: use historical best productivity hours within work window
  //                         - Flexible: use all available work hours
  // 
  // ════════════════════════════════════════════════════════════════════════════════════

  // ── Apply settings ──
  const WORK_START = settings.workStart;
  const WORK_END = settings.workEnd;

  // Helper to check if an hour is within work window (handles night shift wrap-around)
  const isHourInWorkWindow = (hour: number): boolean => {
    if (WORK_START <= WORK_END) {
      // Normal day shift: 9 AM to 5 PM
      return hour >= WORK_START && hour < WORK_END;
    } else {
      // Night shift: 9 PM to 7 AM (wraps past midnight)
      return hour >= WORK_START || hour < WORK_END;
    }
  };

  // Helper to convert hour to minutes within work window (handles night shift)
  const hourToMinutesInWorkWindow = (hour: number): number => {
    if (WORK_START <= WORK_END) {
      // Day shift: simple linear conversion
      return hour * 60;
    } else {
      // Night shift: need to account for wrap-around
      if (hour >= WORK_START) {
        // Hours from 21 to 23 (9 PM to 11 PM)
        return (hour - WORK_START) * 60;
      } else {
        // Hours from 0 to 6 (midnight to 6 AM)
        const hoursAfterMidnight = hour;
        const hoursBeforeMidnight = 24 - WORK_START;
        return (hoursBeforeMidnight + hoursAfterMidnight) * 60;
      }
    }
  };

  // Get work window duration in minutes
  const getWorkDurationMinutes = (): number => {
    if (WORK_START <= WORK_END) {
      return (WORK_END - WORK_START) * 60;
    } else {
      // Night shift: from WORK_START to end of day + beginning of next day to WORK_END
      return ((24 - WORK_START) + WORK_END) * 60;
    }
  };

  const WORK_DURATION = getWorkDurationMinutes();

  // Break times: directly from user's stress level setting
  // - Low: 10 min (denser schedule)
  // - Moderate: 20 min (balanced, default)
  // - High: 35 min (more recovery time)
  const getBreakTime = (stressLevel: AIScheduleSettings['stressLevel']): number => {
    return {
      'Low': 10,
      'Moderate': 20,
      'High': 35,
    }[stressLevel] ?? 20;
  };

  // ── Learn weights from user's history (used as DQL fallback) ──
  const learnedWeights = learnWeights(records);

  // Helper function to check if a task is missed (overdue and not completed)
  const isMissedTask = (task: Task): boolean => {
    if (task.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(task.dueDate);
    dueDay.setHours(0, 0, 0, 0);
    return dueDay < today;
  };

  // Only schedule tasks that are due TODAY or TOMORROW (NOT multi-week schedules)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  console.log(`[AISchedule] Today: ${today.toDateString()}`);
  console.log(`[AISchedule] Tomorrow: ${tomorrow.toDateString()}`);
  console.log(`[AISchedule] Total pending tasks: ${pendingTasks.length}`);

  // Only schedule overdue tasks, tasks due today, and tasks due tomorrow.
  // Tasks due further in the future are intentionally excluded from AI scheduling.
  const tasksForToday = pendingTasks.filter(t => {
    let taskDueDay: Date;
    try {
      taskDueDay = new Date(t.dueDate);
      if (Number.isNaN(taskDueDay.getTime())) return false;
      taskDueDay.setHours(0, 0, 0, 0);
    } catch (e) {
      console.error(`[AISchedule] Error parsing dueDate for "${t.title}":`, t.dueDate, e);
      return false;
    }
    const isOverdue = taskDueDay < today;
    const isToday = taskDueDay.getTime() === today.getTime();
    const isTomorrow = taskDueDay.getTime() === tomorrow.getTime();
    return isOverdue || isToday || isTomorrow;
  });

  console.log(`[AISchedule] Tasks after filter: ${tasksForToday.length}`);

  const focusedUnscheduled: UnscheduledTask[] = [];
  const effectiveTasks = tasksForToday;

  // ── DQL: train on task history, then predict best hour + priority Q-value per task ──
  // Mirrors AI.ipynb — Dense(64→64→32→14,linear), Bellman updates, experience replay.
  let dqlModel: DQLSchedulerModel | null = null;
  const taskPredictions = new Map<string, DQLPrediction>();

  try {
    // History records don't store priority metadata; default to medium (5).
    // The DQL learns time-of-day completion patterns from the reward signal (+10/-5).
    const trainingData: DQLTrainingRecord[] = records.map(r => ({
      hour: r.hour,
      priorityNum: 5,
      durationHrs: r.duration,
      completed: r.completed === 1,
    }));

    dqlModel = await DQLSchedulerModel.load(userId);
    await dqlModel.train(trainingData);
    await dqlModel.save(userId);

    // Generate per-task predictions using actual urgency/importance features.
    // maxQValue = how strongly the model expects this task to succeed → used for ranking.
    // The model predicts within 8-21 hour range, then the scheduler constrains to user's workStart/workEnd.
    for (const task of effectiveTasks) {
      const pred = await dqlModel.predict(
        toPriorityNum(task),
        (task.estimatedTime ?? 60) / 60,
        WORK_START
      );
      taskPredictions.set(task.id, pred);
    }
  } catch (e) {
    console.warn('[AISchedule] DQL unavailable, using learned weights:', e);
  }

  // Sort by DQL maxQValue (higher Q = model is more confident the task should be done first).
  // Falls back to learned intensity+deadline score if DQL training failed.
  // Secondary sort by due date: earlier-due tasks are processed first within the same Q-value tier,
  // ensuring tasks due today fill the work window before tasks due tomorrow.
  const useDQL = taskPredictions.size > 0;
  const sorted = [...effectiveTasks].sort((a, b) => {
    // Overdue tasks are ALWAYS first, regardless of scheduling style.
    const aOverdue = isMissedTask(a) ? 0 : 1;
    const bOverdue = isMissedTask(b) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    // Flexible: sort by due date only — spread evenly regardless of priority.
    // Overdue tasks already floated to top above.
    if (settings.schedulingStyle === 'Flexible') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    // Focused & Balanced: Q-score is the sole ordering factor — a high-priority task due tomorrow
    // beats a low-priority task due today.
    const primaryDiff = useDQL
      ? (taskPredictions.get(b.id)?.maxQValue ?? 0) - (taskPredictions.get(a.id)?.maxQValue ?? 0)
      : computeLearnedScore(b, learnedWeights) - computeLearnedScore(a, learnedWeights);
    return primaryDiff;
  });

  // ── Smart scheduling: group by day, reset clock per day ──
  const schedule: ScheduledTask[] = [];
  const unscheduled: UnscheduledTask[] = [];

  // Get best productivity hours filtered to work window
  let bestHours = ranked.length > 0
    ? ranked.map(r => r.hour).filter(h => isHourInWorkWindow(h))
    : [];
  
  // If no historical best hours, generate default work hours
  if (bestHours.length === 0) {
    if (WORK_START <= WORK_END) {
      // Day shift: generate hours from WORK_START to WORK_END
      bestHours = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);
    } else {
      // Night shift: generate hours from WORK_START to 23, then 0 to WORK_END
      const beforeMidnight = Array.from({ length: 24 - WORK_START }, (_, i) => WORK_START + i);
      const afterMidnight = Array.from({ length: WORK_END }, (_, i) => i);
      bestHours = [...beforeMidnight, ...afterMidnight];
    }
  }

  // Apply scheduling style preferences
  if (settings.schedulingStyle === 'Focused') {
    // Focused: schedule within peak productivity hours only (peakStart → peakEnd)
    // If no historical data in peak hours, still enforce peak hours (don't fall back)
    const isPeakHourInWindow = (h: number): boolean => {
      if (settings.peakStart <= settings.peakEnd) {
        return h >= settings.peakStart && h < settings.peakEnd;
      } else {
        // Peak also wraps around midnight
        return h >= settings.peakStart || h < settings.peakEnd;
      }
    };
    const peakHours = bestHours.filter(isPeakHourInWindow);
    if (peakHours.length > 0) {
      bestHours = peakHours;
    } else {
      // No historical data in peak window — generate all peak hours
      bestHours = Array.from(
        { length: settings.peakEnd - settings.peakStart },
        (_, i) => settings.peakStart + i
      );
    }
  } else if (settings.schedulingStyle === 'Balanced') {
    // Balanced: all work hours in chronological order — highest Q-score task starts at WORK_START
    if (WORK_START <= WORK_END) {
      bestHours = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);
    } else {
      const beforeMidnight = Array.from({ length: 24 - WORK_START }, (_, i) => WORK_START + i);
      const afterMidnight = Array.from({ length: WORK_END }, (_, i) => i);
      bestHours = [...beforeMidnight, ...afterMidnight];
    }
  } else if (settings.schedulingStyle === 'Flexible') {
    // Flexible: use ALL available work hours for maximum scheduling flexibility
    // Ignores productivity patterns, prioritizes fitting all tasks
    if (WORK_START <= WORK_END) {
      bestHours = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);
    } else {
      // Night shift wrap-around
      const beforeMidnight = Array.from({ length: 24 - WORK_START }, (_, i) => WORK_START + i);
      const afterMidnight = Array.from({ length: WORK_END }, (_, i) => i);
      bestHours = [...beforeMidnight, ...afterMidnight];
    }
  }
  // Balanced: uses top historical productivity hours within work window (default)

  // Ensure we have at least one best hour
  if (bestHours.length === 0) bestHours.push(WORK_START);

  // Group tasks by their scheduled day:
  // overdue tasks → today; upcoming tasks → their due date (date-only, no time).
  
  const getScheduleDay = (task: Task): string => {
    if (isMissedTask(task)) {
      return today.toDateString(); // overdue → schedule today
    }
    const d = new Date(task.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.toDateString();
  };

  // Group sorted tasks by day key, preserving order within each day
  const dayGroups = new Map<string, Task[]>();
  for (const task of sorted) {
    const key = getScheduleDay(task);
    if (!dayGroups.has(key)) dayGroups.set(key, []);
    dayGroups.get(key)!.push(task);
  }

  // Sort day keys chronologically
  const sortedDayKeys = [...dayGroups.keys()].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Continuous session: merge ALL tasks into one ordered run regardless of style.
  // Tomorrow's tasks fill today's remaining work window before spilling to tomorrow —
  // the cursor only rolls forward to the next calendar day when today's WORK_END is
  // reached. This applies to Balanced, Focused, and Flexible alike.
  const useContinuousFlow = true;

  const sessionEntries: [string, Task[]][] = useContinuousFlow
    ? [[
        sortedDayKeys[0] ?? today.toDateString(),
        sortedDayKeys.flatMap(k => dayGroups.get(k)!),
      ]]
    : sortedDayKeys.map(k => [k, dayGroups.get(k)!]);

  for (const [dayKey, dayTasks] of sessionEntries) {
    const scheduledDay = new Date(dayKey);
    // Mutable calendar day pointer — advances when day-shift continuous flow rolls over
    // from one day's WORK_END into the next day's WORK_START.
    let currentDay = new Date(scheduledDay);

    // Focused: start from peakStart to keep high-priority tasks inside peak hours.
    // Balanced & Flexible: start from WORK_START so the first task lands at the day's opening hour.
    const dayStartHour = settings.schedulingStyle === 'Focused'
      ? settings.peakStart
      : WORK_START;

    // Track every placed interval so no two tasks can share the same time slot.
    const dayIntervals: { start: number; end: number }[] = [];

    /**
     * Find the earliest free slot of `duration` minutes.
     *
     * Strategy varies by scheduling style:
     *  - Focused: only within peak window
     *  - Balanced: prioritize peak hours, then other work hours
     *  - Flexible: use all work hours equally
     *
     * Returns null only if the task cannot fit anywhere in the workday.
     */

    // Compute work window boundaries once — used both by the guard and inside findSlot.
    const fullStart = WORK_START <= WORK_END ? WORK_START * 60 : 0;
    const fullEnd = WORK_START <= WORK_END
      ? WORK_END * 60
      : ((24 - WORK_START) + WORK_END) * 60;

    const findSlot = (preferred: number, duration: number, task: Task): number | null => {
      const breakTime = getBreakTime(settings.stressLevel);
      // fullStart and fullEnd are defined in the outer scope (hoisted above findSlot).

      const sorted = [...dayIntervals].sort((a, b) => a.start - b.start);

      const tryFrom = (from: number, endLimit: number): number | null => {
        let slot = Math.max(from, fullStart);
        for (const iv of sorted) {
          if (slot + duration <= iv.start) break;   // fits before this interval
          if (slot < iv.end) slot = iv.end + breakTime; // jump past it + priority-based break
        }
        return slot + duration <= endLimit ? slot : null;
      };

      // Build allowed hour windows based on scheduling style
      let allowedHours: number[] = [];
      if (settings.schedulingStyle === 'Focused') {
        // Focused: peak window only — all tasks must land in peak productivity hours
        allowedHours = bestHours.filter(h => h >= settings.peakStart && h < settings.peakEnd);
      } else {
        // Balanced & Flexible: all work hours available in order
        allowedHours = bestHours;
      }

      // 1. Preferred spot (cursor position)
      const fromPreferred = tryFrom(preferred, fullEnd);
      if (fromPreferred !== null) return fromPreferred;

      // 2. Try allowed hours in order — but NEVER before the cursor (preferred).
      // Using Math.max(hourStart, preferred) ensures we don't jump backwards to
      // an earlier free slot that is already behind the sequential cursor.
      for (const hour of allowedHours) {
        const hourStart = WORK_START <= WORK_END ? hour * 60 : hourToMinutesInWorkWindow(hour);
        const slot = tryFrom(Math.max(hourStart, preferred), fullEnd);
        if (slot !== null) return slot;
      }

      // 3. Full-day fallback for Flexible — also respect the cursor.
      if (settings.schedulingStyle === 'Flexible') {
        return tryFrom(Math.max(fullStart, preferred), fullEnd);
      }

      return null;
    };

    // Sequential cursor: tasks flow one after another within the work window.
    // This prevents tasks from jumping to earlier free slots (e.g. 3 AM)
    // when prior tasks already filled up to 6:50 AM.
    // Higher Q-value tasks (sorted first) still get the earliest slots in the shift.
    let sessionCursor = hourToMinutesInWorkWindow(dayStartHour);

    // Normal day shift only: do not schedule today's tasks in a time slot that
    // has already passed. Future days still start at the configured work window,
    // and night-shift flow remains unchanged.
    if (WORK_START <= WORK_END && scheduledDay.toDateString() === today.toDateString()) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      // Advance to the current time OR configured work start, whichever is later
      sessionCursor = Math.max(sessionCursor, nowMins);
    }

    // Flexible (per-day only): pre-compute start times using only the stress-level break
    // between tasks. In continuous-flow mode, the natural cursor advance below
    // (endMins + breakTime) already produces the same evenly-spaced behaviour, so we
    // skip pre-computation to allow correct day rollover.
    const flexibleStartTimes = new Map<string, number>();
    if (settings.schedulingStyle === 'Flexible' && !useContinuousFlow) {
      const breakMins = getBreakTime(settings.stressLevel);
      let flexCursor = sessionCursor;
      for (const t of dayTasks) {
        flexibleStartTimes.set(t.id, flexCursor);
        flexCursor += Math.max(t.estimatedTime || settings.taskBlock || 60, 1) + breakMins;
      }
    }

    for (const task of dayTasks) {
      const durationMins = Math.max(task.estimatedTime || settings.taskBlock || 60, 1);
      // Flexible: jump cursor to the pre-computed evenly-spaced position for this task
      if (settings.schedulingStyle === 'Flexible' && flexibleStartTimes.has(task.id)) {
        sessionCursor = flexibleStartTimes.get(task.id)!;
      }

      // Pre-check: if the task duration alone exceeds the entire available work window,
      // it can never fit regardless of cursor position — mark unschedulable immediately.
      if (durationMins > (fullEnd - fullStart)) {
        const workStartLabel = formatTime(WORK_START);
        const workEndLabel = formatTime(WORK_END);
        unscheduled.push({
          task,
          reason: `This task cannot fit within your configured available timeframe (${workStartLabel} – ${workEndLabel}). Estimated duration (${durationMins} min) exceeds the total available work window.`,
        });
        continue;
      }

      // Guard: if the cursor has already reached or passed the end of the work window,
      // no further tasks can fit — skip immediately to the unscheduled list.
      if (sessionCursor >= fullEnd) {
        const workStartLabel = formatTime(WORK_START);
        const workEndLabel = formatTime(WORK_END);
        unscheduled.push({
          task,
          reason: `This task cannot fit within your configured available timeframe (${workStartLabel} – ${workEndLabel}). The schedule is full.`,
        });
        continue;
      }

      // Day-shift remaining-window check.
      // Continuous-flow styles (Balanced/Focused): roll the cursor over to the next
      // calendar day's WORK_START instead of unscheduling, so tomorrow's tasks land
      // tomorrow only when today truly has no remaining capacity.
      // Flexible (per-day): keep original behaviour — mark as unschedulable.
      if (WORK_START <= WORK_END && sessionCursor + durationMins > fullEnd) {
        if (useContinuousFlow) {
          // Roll over to the next calendar day, reset cursor + intervals
          currentDay = new Date(currentDay.getTime() + 24 * 60 * 60 * 1000);
          sessionCursor = fullStart;
          dayIntervals.length = 0;
          // After rollover, the new day must still have room for the task
          if (sessionCursor + durationMins > fullEnd) {
            const workStartLabel = formatTime(WORK_START);
            const workEndLabel = formatTime(WORK_END);
            unscheduled.push({
              task,
              reason: `This task cannot fit within your configured available timeframe (${workStartLabel} – ${workEndLabel}). Not enough time remaining in the work window.`,
            });
            continue;
          }
        } else {
          const workStartLabel = formatTime(WORK_START);
          const workEndLabel = formatTime(WORK_END);
          unscheduled.push({
            task,
            reason: `This task cannot fit within your configured available timeframe (${workStartLabel} – ${workEndLabel}). Not enough time remaining in the work window.`,
          });
          continue;
        }
      }

      // Always schedule from the current cursor — never jump to an earlier free slot.
      const startMins = findSlot(sessionCursor, durationMins, task);
      if (startMins === null) {
        // Task doesn't fit in the remaining work window — record it as unscheduled
        const workStartLabel = formatTime(WORK_START);
        const workEndLabel = formatTime(WORK_END);
        unscheduled.push({
          task,
          reason: `This task cannot fit within your configured available timeframe (${workStartLabel} – ${workEndLabel}). No available time slot remains.`,
        });
        continue;
      }

      const endMins = startMins + durationMins;

      // Day-shift safety boundary check: the placed slot must be fully within workStart–workEnd.
      // The guards above make this unreachable in normal operation, but this acts as a hard
      // defensive wall against any future regression that could produce an out-of-bounds slot.
      // Night-shift slots are in relative-minutes space and are not checked here.
      if (WORK_START <= WORK_END && (startMins < fullStart || endMins > fullEnd)) {
        const workStartLabel = formatTime(WORK_START);
        const workEndLabel = formatTime(WORK_END);
        unscheduled.push({
          task,
          reason: `This task cannot fit within your configured available timeframe (${workStartLabel} – ${workEndLabel}). No available time slot remains.`,
        });
        continue;
      }

      dayIntervals.push({ start: startMins, end: endMins });

      // Advance cursor so the next task starts after this one + break
      sessionCursor = endMins + getBreakTime(settings.stressLevel);

      // Convert slot minutes back to actual hour of day (handling night shift wrap-around)
      let assignedHour: number;
      let startMin: number;
      let endHour: number;
      let endMin: number;

      if (WORK_START <= WORK_END) {
        // Day shift: straightforward calculation from midnight
        assignedHour = Math.floor(startMins / 60);
        startMin = startMins % 60;
        endHour = Math.floor(endMins / 60);
        endMin = endMins % 60;
      } else {
        // Night shift: startMins is relative to WORK_START, convert back to hour of day
        const totalMinutesFromWorkStart = startMins;
        const minutesBeforeMidnight = (24 - WORK_START) * 60;
        
        if (totalMinutesFromWorkStart < minutesBeforeMidnight) {
          // Still in the evening (before midnight)
          assignedHour = WORK_START + Math.floor(totalMinutesFromWorkStart / 60);
          startMin = totalMinutesFromWorkStart % 60;
        } else {
          // After midnight
          const minutesAfterMidnight = totalMinutesFromWorkStart - minutesBeforeMidnight;
          assignedHour = Math.floor(minutesAfterMidnight / 60);
          startMin = minutesAfterMidnight % 60;
        }

        // Same for end time
        const totalMinutesEnd = endMins;
        if (totalMinutesEnd < minutesBeforeMidnight) {
          endHour = WORK_START + Math.floor(totalMinutesEnd / 60);
          endMin = totalMinutesEnd % 60;
        } else {
          const minutesAfterMidnight = totalMinutesEnd - minutesBeforeMidnight;
          endHour = Math.floor(minutesAfterMidnight / 60);
          endMin = minutesAfterMidnight % 60;
        }
      }

      const dqlPred = taskPredictions.get(task.id);
      const intensity = computeTaskIntensity(task);
      const deadlineScore = computeDeadlineScore(task);

      let confidence: number;
      let reason: string;

      // Use the exact scheduled start time (hour + minutes) in the reason text so it
      // matches the displayed startTime. formatTime(assignedHour, startMin) includes minutes.
      if (dqlPred) {
        // DQL-derived confidence: Q-value mapped to 0-100
        confidence = dqlPred.confidence;
        const maxQ = dqlPred.maxQValue.toFixed(1);
        if (confidence >= 70) {
          reason = `${confidence}% AI confidence at ${formatTime(assignedHour, startMin)} — Q-score ${maxQ}, intensity ${Math.round(intensity * 100)}%, deadline ${Math.round(deadlineScore * 100)}%`;
        } else {
          reason = `Scheduled at ${formatTime(assignedHour, startMin)} — AI Q-score ${maxQ}, intensity ${Math.round(intensity * 100)}%, deadline ${Math.round(deadlineScore * 100)}%`;
        }
      } else {
        // Fallback: hour-based completion rate + intensity bonus
        confidence = computeConfidence(task, assignedHour, hourlyRates, overallSuccessRate);
        if (records.length === 0) {
          reason = `Scheduled at ${formatTime(assignedHour, startMin)} — intensity ${Math.round(intensity * 100)}%, deadline urgency ${Math.round(deadlineScore * 100)}%`;
        } else if (confidence >= 70) {
          reason = `${confidence}% confidence at ${formatTime(assignedHour, startMin)} — intensity ${Math.round(intensity * 100)}%, deadline urgency ${Math.round(deadlineScore * 100)}% (priority weight ${Math.round(learnedWeights.intensity * 100)}%)`;
        } else {
          reason = `Scheduled at ${formatTime(assignedHour, startMin)} — intensity ${Math.round(intensity * 100)}%, deadline urgency ${Math.round(deadlineScore * 100)}% (consider peak hours)`;
        }
      }

      // For night shift: determine the actual calendar day based on assigned hour.
      // Hours from WORK_START to 23 → today; hours from 0 to WORK_END → tomorrow.
      // For day shift continuous flow: use currentDay (advances on rollover).
      // For day shift per-day (Flexible): use scheduledDay.
      const actualScheduledDate = WORK_START > WORK_END
        ? (assignedHour >= WORK_START ? new Date(today) : new Date(tomorrow))
        : (useContinuousFlow ? new Date(currentDay) : scheduledDay);

      schedule.push({
        task,
        startHour: assignedHour,
        startTime: formatTime(assignedHour, startMin),
        endTime: formatTime(endHour, endMin),
        durationMins,
        confidence,
        reason,
        scheduledDate: actualScheduledDate,
      });
    }
  }

  // Sort all days chronologically by scheduled time so breaks display correctly in the UI
  const todayDateString = today.toDateString();

  const todaySchedule = schedule
    .filter(s => s.scheduledDate.toDateString() === todayDateString)
    .sort((a, b) => hourToMinutesInWorkWindow(a.startHour) - hourToMinutesInWorkWindow(b.startHour));
  const futureSchedule = schedule.filter(s => s.scheduledDate.toDateString() !== todayDateString);

  // Sort future schedule by date, then time (respecting night shift order)
  futureSchedule.sort((a, b) => {
    const dateDiff = a.scheduledDate.getTime() - b.scheduledDate.getTime();
    return dateDiff !== 0 ? dateDiff : hourToMinutesInWorkWindow(a.startHour) - hourToMinutesInWorkWindow(b.startHour);
  });

  // Combine: today's tasks (in AI-priority order) first, then future tasks
  const finalSchedule = [...todaySchedule, ...futureSchedule];

  dqlModel?.dispose();
  return { schedule: finalSchedule, unscheduled: [...unscheduled, ...focusedUnscheduled], insights, generatedAt: new Date() };
}

// ── Firestore persistence for AI schedule ──

function serializeScheduleResult(result: AIScheduleResult): object {
  return {
    generatedAt: result.generatedAt.toISOString(),
    insights: result.insights,
    unscheduled: (result.unscheduled ?? []).map(u => ({
      reason: u.reason,
      task: {
        ...u.task,
        dueDate: u.task.dueDate instanceof Date ? u.task.dueDate.toISOString() : u.task.dueDate,
        createdAt: u.task.createdAt instanceof Date ? u.task.createdAt.toISOString() : u.task.createdAt,
        updatedAt: u.task.updatedAt instanceof Date ? u.task.updatedAt.toISOString() : u.task.updatedAt,
        deletedAt: u.task.deletedAt instanceof Date ? u.task.deletedAt.toISOString() : (u.task.deletedAt ?? null),
      },
    })),
    schedule: result.schedule.map(s => ({
      startHour: s.startHour,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMins: s.durationMins,
      confidence: s.confidence,
      reason: s.reason,
      scheduledDate: s.scheduledDate instanceof Date ? s.scheduledDate.toISOString() : s.scheduledDate,
      task: {
        ...s.task,
        dueDate: s.task.dueDate instanceof Date ? s.task.dueDate.toISOString() : s.task.dueDate,
        createdAt: s.task.createdAt instanceof Date ? s.task.createdAt.toISOString() : s.task.createdAt,
        updatedAt: s.task.updatedAt instanceof Date ? s.task.updatedAt.toISOString() : s.task.updatedAt,
        deletedAt: s.task.deletedAt instanceof Date ? s.task.deletedAt.toISOString() : (s.task.deletedAt ?? null),
      },
    })),
  };
}

function deserializeScheduleResult(data: Record<string, unknown>): AIScheduleResult {
  const rawSchedule = (data.schedule as Record<string, unknown>[]) ?? [];
  const rawUnscheduled = (data.unscheduled as Record<string, unknown>[]) ?? [];
  // Sanitize stale insights from older saved schedules:
  // historical documents could contain hours with rate=0 in best/worst lists.
  // Strip them on read so the UI never displays "0% success" rows.
  const rawInsights = (data.insights as ProductivityInsight) ?? {
    bestHours: [], worstHours: [], overallSuccessRate: 0, totalRecords: 0,
  };
  const insights: ProductivityInsight = {
    ...rawInsights,
    bestHours: (rawInsights.bestHours ?? []).filter(h => h.rate > 0),
    worstHours: (rawInsights.worstHours ?? []).filter(h => h.rate > 0),
  };
  return {
    generatedAt: new Date(data.generatedAt as string),
    insights,
    unscheduled: rawUnscheduled.map(u => {
      const rawTask = u.task as Record<string, unknown>;
      const task: Task = {
        ...(rawTask as unknown as Task),
        dueDate: new Date(rawTask.dueDate as string),
        createdAt: new Date(rawTask.createdAt as string),
        updatedAt: new Date(rawTask.updatedAt as string),
        deletedAt: rawTask.deletedAt ? new Date(rawTask.deletedAt as string) : undefined,
      };
      return { task, reason: u.reason as string } as UnscheduledTask;
    }),
    schedule: rawSchedule.map(s => {
      const rawTask = s.task as Record<string, unknown>;
      const task: Task = {
        ...(rawTask as unknown as Task),
        dueDate: new Date(rawTask.dueDate as string),
        createdAt: new Date(rawTask.createdAt as string),
        updatedAt: new Date(rawTask.updatedAt as string),
        deletedAt: rawTask.deletedAt ? new Date(rawTask.deletedAt as string) : undefined,
      };
      return {
        startHour: s.startHour as number,
        startTime: s.startTime as string,
        endTime: s.endTime as string,
        durationMins: s.durationMins as number,
        confidence: s.confidence as number,
        reason: s.reason as string,
        scheduledDate: new Date(s.scheduledDate as string),
        task,
      } as ScheduledTask;
    }),
  };
}

const AI_SCHEDULE_LS_KEY = (userId: string) => `tasksync_ai_schedule_${userId}`;

export async function saveAIScheduleToFirestore(userId: string, result: AIScheduleResult): Promise<void> {
  // localStorage runs synchronously — persists immediately even when called with `void`.
  // This guarantees the schedule survives a page reload even if the Firestore write is
  // still in-flight or fails silently.
  try {
    localStorage.setItem(AI_SCHEDULE_LS_KEY(userId), JSON.stringify(serializeScheduleResult(result)));
  } catch (e) {
    console.warn('[AISchedule] Failed to save schedule to localStorage:', e);
  }
  // Firestore write for cross-device persistence.
  try {
    const ref = doc(db, 'ai_schedules', userId);
    await setDoc(ref, serializeScheduleResult(result));
  } catch (e) {
    console.warn('[AISchedule] Failed to save schedule to Firestore:', e);
  }
}

export async function loadAIScheduleFromFirestore(userId: string): Promise<AIScheduleResult | null> {
  // Try Firestore first (cross-device).
  try {
    const ref = doc(db, 'ai_schedules', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      // Discard schedules saved before the unscheduled-task feature was added.
      // Old documents lack the 'unscheduled' field, meaning overflow tasks are silently
      // scheduled at wrong times instead of showing a warning. Force regeneration.
      // Also discard schedules with empty worstHours (saved before 24-hour pool fix).
      const insights = data.insights as Record<string, unknown> | undefined;
      if (Array.isArray(data.unscheduled) && Array.isArray(insights?.worstHours) && (insights.worstHours as unknown[]).length > 0) {
        return deserializeScheduleResult(data);
      }
    }
  } catch (e) {
    console.warn('[AISchedule] Failed to load schedule from Firestore:', e);
  }
  // Fallback: localStorage (same device, always available).
  try {
    const raw = localStorage.getItem(AI_SCHEDULE_LS_KEY(userId));
    if (raw) {
      const data = JSON.parse(raw) as Record<string, unknown>;
      const insights = data.insights as Record<string, unknown> | undefined;
      if (Array.isArray(data.unscheduled) && Array.isArray(insights?.worstHours) && (insights.worstHours as unknown[]).length > 0) {
        return deserializeScheduleResult(data);
      }
    }
  } catch (e) {
    console.warn('[AISchedule] Failed to load schedule from localStorage:', e);
  }
  return null;
}

export async function clearAIScheduleFromFirestore(userId: string): Promise<void> {
  try {
    localStorage.removeItem(AI_SCHEDULE_LS_KEY(userId));
  } catch (e) {
    console.warn('[AISchedule] Failed to clear schedule from localStorage:', e);
  }
  try {
    const ref = doc(db, 'ai_schedules', userId);
    await deleteDoc(ref);
  } catch (e) {
    console.warn('[AISchedule] Failed to clear schedule from Firestore:', e);
  }
}
