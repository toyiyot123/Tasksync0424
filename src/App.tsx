import { useState, useEffect, useRef } from 'react';
import { Menu, Settings, Sparkles, X } from 'lucide-react';
import { Task, TaskCategory, DashboardStats, UserProfile } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { TaskCategoryService } from '@/services/TaskCategoryService';
import { TaskScheduleService } from '@/services/TaskScheduleService';
import { TaskService } from '@/services/TaskService';
import { TaskLogService } from '@/services/TaskLogService';
import { UserPerformanceService } from '@/services/UserPerformanceService';
import { PriorityScoreService } from '@/services/PriorityScoreService';
import { NearlyDueTaskService } from '@/services/NearlyDueTaskService';
import { OverdueTaskService } from '@/services/OverdueTaskService';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { generateAISchedule, AIScheduleResult, NotEnoughHistoryError, saveAIScheduleToFirestore, loadAIScheduleFromFirestore } from '@/services/AIScheduleService';
import { generateMockAISchedule } from '@/services/MockAIScheduleService';
import { DQLSchedulerModel } from '@/services/DQLModel';
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AIScheduleModal from '@/components/AIScheduleModal';
import AISchedulerPage from '@/components/AISchedulerPage';
import TaskForm from '@/components/TaskForm';
import DashboardStatistics from '@/components/DashboardStatistics';
import TaskTimeline from '@/components/TaskTimeline';
import UpcomingEvents from '@/components/UpcomingEvents';
import CalendarPage from '@/components/CalendarPage';
import TasksPage from '@/components/TasksPage';
import SettingsPage from '@/components/SettingsPage';
import AnalyticsPage from '@/components/AnalyticsPage';
import GuidedPathTutorial from '@/components/GuidedPathTutorial';
import { useTutorialStore } from '@/store/tutorialStore';
import { TOUR_STEPS } from '@/config/tourSteps';
import './App.css';

type FilterType = 'all' | 'todo' | 'in-progress' | 'completed' | 'overdue';

const attachCreatorMetadata = (
  tasks: Task[],
  user: User,
  fallbackName: string
): Task[] =>
  tasks.map((task) => ({
    ...task,
    createdByUid: task.createdByUid || user.uid,
    createdByName: task.createdByName || user.displayName || fallbackName || '',
    createdByEmail: task.createdByEmail || user.email || '',
  }));

const applyCategoryLabels = (tasks: Task[], categories: TaskCategory[]): Task[] =>
  tasks.map((task) => {
    const matchedCategory = categories.find(
      (category) => category.category_id === task.categoryId || category.name === task.category
    );

    if (!matchedCategory) {
      return task;
    }

    if (task.categoryId === matchedCategory.category_id && task.category === matchedCategory.name) {
      return task;
    }

    return {
      ...task,
      categoryId: matchedCategory.category_id,
      category: matchedCategory.name,
    };
  });

const isNewFirebaseAccount = (firebaseUser: User): boolean => {
  const createdAt = Date.parse(firebaseUser.metadata.creationTime || '');
  const lastSignInAt = Date.parse(firebaseUser.metadata.lastSignInTime || '');

  if (!Number.isFinite(createdAt) || !Number.isFinite(lastSignInAt)) {
    return false;
  }

  return Math.abs(lastSignInAt - createdAt) <= 5 * 60 * 1000;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [firestoreUsername, setFirestoreUsername] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [isNewUserTutorialEligible, setIsNewUserTutorialEligible] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState('dashboard');
const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiScheduleResult, setAIScheduleResult] = useState<AIScheduleResult | null>(null);
  const [showAIScheduleModal, setShowAIScheduleModal] = useState(false);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [showScheduleReminder, setShowScheduleReminder] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    clearTasks, 
    setTasks,
    getTasks,
    setUser: setStoreUser,
    currentSchedule,
    setCurrentSchedule,
    setAIScheduleResult: setStoreAIScheduleResult,
  } = useTaskStore();

  // Prevents saving empty state before remote tasks finish loading.
  const tasksReadyRef = useRef(false);
  const shouldResetTutorialTasksRef = useRef(false);
  const didHandleTutorialCompletionRef = useRef(false);

  // Set up tutorial page navigator
  useEffect(() => {
    const { setPageNavigator } = useTutorialStore.getState();
    setPageNavigator((page: string) => {
      setActiveTab(page as any);
    });
  }, []);

  // Auto-start tutorial only for brand-new users after tasks have finished loading.
  useEffect(() => {
    const shouldShowTutorial = user && tasksLoaded && isNewUserTutorialEligible;
    if (shouldShowTutorial) {
      // Use a small timeout to ensure tutorial store reset has completed
      const timeout = setTimeout(() => {
        const { hasCompletedTutorial, isActive, startTutorial } = useTutorialStore.getState();
        if (!hasCompletedTutorial && !isActive) {
          startTutorial(TOUR_STEPS);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [user, tasksLoaded, isNewUserTutorialEligible]);


  // Show reminder modal when tutorial reaches Step 4 or Step 7
  useEffect(() => {
    const handleTutorialChange = () => {
      const { isActive, currentStepIndex, steps } = useTutorialStore.getState();
      const currentStep = steps[currentStepIndex];
      
      // Show modal on Step 4 (ai-schedule-reminder-modal) and Step 7 (ai-schedule-reminder-continue)
      if (isActive && (currentStep?.id === 'ai-schedule-reminder-modal' || currentStep?.id === 'ai-schedule-reminder-continue')) {
        setShowScheduleReminder(true);
      } else {
        setShowScheduleReminder(false);
      }
    };

    // Subscribe to tutorial store changes
    const unsubscribe = useTutorialStore.subscribe(handleTutorialChange);
    
    // Check on mount
    handleTutorialChange();
    
    return () => unsubscribe();
  }, []);

  // Auto-open task form when tutorial reaches Step 3 (task-form-creation)
  useEffect(() => {
    const handleTutorialFormChange = () => {
      const { isActive, currentStepIndex, steps } = useTutorialStore.getState();
      const currentStep = steps[currentStepIndex];
      
      // Show form on Step 3 (task-form-creation)
      if (isActive && currentStep?.id === 'task-form-creation') {
        setShowForm(true);
      } else {
        setShowForm(false);
      }
    };

    // Subscribe to tutorial store changes
    const unsubscribe = useTutorialStore.subscribe(handleTutorialFormChange);
    
    // Check on mount
    handleTutorialFormChange();
    
    return () => unsubscribe();
  }, []);

  // DURING TUTORIAL: Prepare mock AI schedule for scheduler walkthrough steps.
  // AFTER TUTORIAL: Mock schedule is cleared by separate effect below
  useEffect(() => {
    const handleTutorialAIScheduleChange = () => {
      const { isActive, currentStepIndex, steps, hasCompletedTutorial } = useTutorialStore.getState();
      const currentStep = steps[currentStepIndex];
      
      // Don't show mock if tutorial is already completed
      if (hasCompletedTutorial) {
        return;
      }
      
      // SHOW MOCK: During scheduler tutorial steps when user has example tasks.
      if (isActive && currentStep?.page === 'scheduler' && tasks.length > 0) {
        const mockSchedule = generateMockAISchedule(tasks);
        setAIScheduleResult(mockSchedule);
        setStoreAIScheduleResult(mockSchedule);
        setShowAIScheduleModal(false);
        return;
      }
      
      // Hide the modal overlay during tutorial steps outside the removed schedule preview step.
      if (isActive && !hasCompletedTutorial) {
        setShowAIScheduleModal(false); // Hide modal overlay but keep schedule data visible
        return;
      }
      
      // CLEAR MOCK: Tutorial skipped before completion
      if (!isActive && !hasCompletedTutorial && aiScheduleResult && aiScheduleResult.insights.totalRecords <= 0) {
        setAIScheduleResult(null);
        setStoreAIScheduleResult(null);
        setShowAIScheduleModal(false);
        return;
      }
    };

    const unsubscribe = useTutorialStore.subscribe(handleTutorialAIScheduleChange);
    handleTutorialAIScheduleChange();
    return () => unsubscribe();
  }, [tasks, aiScheduleResult]);

  // When tutorial completes: delete tutorial tasks and handle AI schedule lock
  useEffect(() => {
    const unsubscribe = useTutorialStore.subscribe((state) => {
      if (state.hasCompletedTutorial && !didHandleTutorialCompletionRef.current) {
        didHandleTutorialCompletionRef.current = true;

        const shouldResetTasks = shouldResetTutorialTasksRef.current;
        const latestTasks = useTaskStore.getState().tasks;
        const tutorialTasks = latestTasks.filter(t => t.isFromTutorial);
        const realTasks = latestTasks.filter(t => !t.isFromTutorial);
        const visibleTasksAfterTutorial = shouldResetTasks ? [] : realTasks;
        const tasksToHide = shouldResetTasks ? latestTasks : tutorialTasks;
        const realCompletedCount = visibleTasksAfterTutorial.filter(t => t.status === 'completed').length;

        if (shouldResetTasks) {
          setTasks([]);
        }

        tasksToHide.forEach(taskToHide => {
          // Soft delete from Firestore (preserve for analysis but hide from user)
          TaskService.softDeleteTask(taskToHide.id).catch(e =>
            console.warn('Error soft-deleting tutorial task:', e)
          );
        });
        
        setAIScheduleResult(null);
        setStoreAIScheduleResult(null);
        setShowAIScheduleModal(false);
        
        // Lock AI Schedule after tutorial until the user has enough real completed task history.
        if (realCompletedCount < 6) {
          setScheduleError(`You need at least 6 completed task records to use AI Schedule. You currently have ${realCompletedCount}.`);
        }
      }
    });
    
    return () => unsubscribe();
  }, [setStoreAIScheduleResult, setTasks, tasks]);

  // When page loads after tutorial, show locked message only if user doesn't have enough real tasks
  useEffect(() => {
    const { hasCompletedTutorial, isActive } = useTutorialStore.getState();
    // Only show locked message if tutorial is NOT active AND tutorial is completed AND no schedule AND no error set
    if (!isActive && hasCompletedTutorial && !aiScheduleResult && !scheduleError) {
      const realTasks = tasks.filter(t => !t.isFromTutorial);
      const completedCount = realTasks.filter(t => t.status === 'completed').length;
      if (completedCount < 6) {
        setScheduleError(`You need at least 6 completed task records to use AI Schedule. You currently have ${completedCount}.`);
      }
    }
    // During tutorial, clear any error message so schedule displays
    if (isActive && scheduleError) {
      setScheduleError(null);
    }
  }, [tasks, aiScheduleResult, scheduleError]);

  useEffect(() => {
    const loadCategories = async () => {
      const categories = await TaskCategoryService.getCategories();
      setTaskCategories(categories);
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    if (taskCategories.length === 0 || tasks.length === 0) {
      return;
    }

    const normalizedTasks = applyCategoryLabels(tasks, taskCategories);
    const hasChanges = normalizedTasks.some(
      (task, index) => task.category !== tasks[index]?.category || task.categoryId !== tasks[index]?.categoryId
    );

    if (hasChanges) {
      setTasks(normalizedTasks);
    }
  }, [taskCategories, tasks, setTasks]);

  useEffect(() => {
    if (!user || !tasksReadyRef.current) {
      return;
    }

    void TaskScheduleService.syncUserSchedules(user.uid, tasks, currentSchedule);
  }, [user, tasks, currentSchedule]);

  // NOTE: Automatic notification checks disabled
  // Cloud Functions on Firebase handle email notifications automatically:
  // - sendNearlyDueReminder: 9:00 AM UTC daily
  // - sendOverdueAlert: 5:00 PM UTC daily  
  // - updateOverdueTasksStatus: Every hour
  // Using client-side checks caused duplicate emails on every app load.

  const mergeCategory = (category: TaskCategory | null) => {
    if (!category) {
      return;
    }

    setTaskCategories((current) => {
      const next = current.filter((existing) => existing.category_id !== category.category_id);
      next.push(category);
      next.sort((left, right) => left.name.localeCompare(right.name));
      return next;
    });
  };

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        tasksReadyRef.current = false;
        setTasksLoaded(false);
        setIsNewUserTutorialEligible(false);
        shouldResetTutorialTasksRef.current = false;
        didHandleTutorialCompletionRef.current = false;
        setActiveTab('dashboard');
        clearTasks();
        setAIScheduleResult(null);
        setStoreAIScheduleResult(null);
        // Reset tutorial when user logs out
        useTutorialStore.getState().resetTutorial();
      }
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsNewUserTutorialEligible(false);
        shouldResetTutorialTasksRef.current = false;
        didHandleTutorialCompletionRef.current = false;
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let resolvedName = firebaseUser.displayName || '';

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFirestoreUsername(userData.username || '');
            resolvedName = userData.username || resolvedName;
          }

          const storeUserProfile: UserProfile = {
            id: firebaseUser.uid,
            name: resolvedName,
            email: firebaseUser.email || '',
            preferences: {
              theme: 'light',
              workingHours: { start: 8, end: 18 },
              breakDuration: 15,
            },
          };

          setStoreUser(storeUserProfile);

          // Initialize user performance record if it doesn't exist
          const existingPerformance = await UserPerformanceService.getUserPerformance(firebaseUser.uid);
          if (!existingPerformance) {
            await UserPerformanceService.createUserPerformance(firebaseUser.uid);
          }

          // ===== IMPORTANT: Update overdue task statuses BEFORE loading tasks =====
          console.log('[App] Updating overdue task statuses...');
          // Load user's tasks from Firestore
          const firestoreTasks = await TaskService.getUserTasks(firebaseUser.uid);
          // Filter out soft-deleted tasks (those with deleted_at timestamp)
          const activeTasks = firestoreTasks.filter(task => !task.deleted_at);
          const shouldRunNewUserTutorial = isNewFirebaseAccount(firebaseUser) && activeTasks.length === 0;
          setIsNewUserTutorialEligible(shouldRunNewUserTutorial);
          shouldResetTutorialTasksRef.current = shouldRunNewUserTutorial;

          if (shouldRunNewUserTutorial) {
            useTutorialStore.getState().resetTutorial();
          }

          const convertedTasks = activeTasks.map(task => TaskService.firestoreToTask(task));
          const normalizedTasks = applyCategoryLabels(convertedTasks, taskCategories);
          const schedules = await TaskScheduleService.getUserSchedules(firebaseUser.uid);
          const scheduleMap = TaskScheduleService.toScheduleMap(schedules);
          
          // Attach creator metadata
          const tasksWithMetadata = attachCreatorMetadata(
            normalizedTasks,
            firebaseUser,
            firestoreUsername || ''
          );
          
          setTasks(tasksWithMetadata.length > 0 ? tasksWithMetadata : []);
          setCurrentSchedule(scheduleMap);

          // ===== NOW Update overdue task statuses (after tasks are loaded) =====
          console.log('[App] Updating overdue task statuses...');
          try {
            const updated = await OverdueTaskService.updateOverdueTasksFromAppState(firebaseUser.uid, tasksWithMetadata);
            console.log(`[App] OverdueTaskService completed: ${updated} tasks updated`);
            
            // Expose global functions for console debugging
            const userId = firebaseUser.uid;
            (window as any).updateOverdueTasksNow = async () => {
              console.log('[Console] Manually triggering OverdueTaskService...');
              // Get latest tasks from store
              const state = useTaskStore.getState();
              // Pass user email from Firebase Auth as fallback
              return OverdueTaskService.updateOverdueTasksFromAppState(userId, state.tasks, firebaseUser.email || undefined);
            };
            
            (window as any).updateTaskToOverdue = async (taskId: string) => {
              console.log(`[Console] Manually updating task ${taskId} to overdue...`);
              return OverdueTaskService.updateTaskToOverdue(userId, taskId);
            };

            // Diagnostic function to debug overdue tasks
            (window as any).debugOverdueTasks = () => {
              const state = useTaskStore.getState();
              const now = new Date();
              const todayAtMidnight = new Date();
              todayAtMidnight.setHours(0, 0, 0, 0);
              
              console.log('\n🔍 DEBUG: Overdue Tasks Analysis');
              console.log(`Current time: ${now.toISOString()}`);
              console.log(`Today's date (for comparison): ${todayAtMidnight.toISOString()}`);
              console.log(`Total tasks in store: ${state.tasks.length}`);
              console.log('─'.repeat(60));
              
              state.tasks.forEach((task, index) => {
                const dueDate = task.dueDate || (task as any).due_at;
                const parsedDueDate = dueDate ? new Date(dueDate) : null;
                const parsedDateAtMidnight = parsedDueDate ? new Date(parsedDueDate) : null;
                if (parsedDateAtMidnight) {
                  parsedDateAtMidnight.setHours(0, 0, 0, 0);
                }
                const isOverdue = parsedDateAtMidnight && parsedDateAtMidnight < todayAtMidnight;
                
                console.log(`\n[${index + 1}] "${task.title}"`);
                console.log(`  Status: ${task.status}`);
                console.log(`  Due Date: ${dueDate ? dueDate : 'No due date'}`);
                console.log(`  Parsed: ${parsedDueDate ? parsedDueDate.toISOString() : 'Invalid'}`);
                console.log(`  Parsed at midnight: ${parsedDateAtMidnight ? parsedDateAtMidnight.toISOString() : 'Invalid'}`);
                console.log(`  Overdue: ${isOverdue ? '✅ YES' : '❌ NO'}`);
              });
              
              console.log('\n' + '─'.repeat(60));
              const overdueCount = state.tasks.filter(t => {
                const dueDate = new Date(t.dueDate || (t as any).due_at);
                const dueDateAtMidnight = new Date(dueDate);
                dueDateAtMidnight.setHours(0, 0, 0, 0);
                return Number.isFinite(dueDate.getTime()) && dueDateAtMidnight < todayAtMidnight && t.status !== 'completed';
              }).length;
              console.log(`Total overdue tasks: ${overdueCount}`);
            };

            // Get user email for debugging
            (window as any).debugUserInfo = () => {
              console.log('\n🔍 DEBUG: User Info');
              console.log(`User ID: ${userId}`);
              console.log(`User Email (Firebase Auth): ${firebaseUser.email || 'Not set'}`);
              console.log(`Display Name: ${firebaseUser.displayName || 'Not set'}`);
              
              // Also show what's stored in Firestore
              const userDoc = doc(db, 'users', userId);
              getDoc(userDoc).then(snap => {
                if (snap.exists()) {
                  console.log('\n📄 Firestore User Document Data:');
                  const data = snap.data();
                  console.log(JSON.stringify(data, null, 2));
                } else {
                  console.warn('⚠️ User document not found in Firestore');
                }
              });
            };
            
            // Log these for user reference
            console.log('📝 Available console commands:');
            console.log('   updateOverdueTasksNow() - Check all tasks and update overdue ones');
            console.log('   updateTaskToOverdue(taskId) - Manually mark a specific task as overdue');
            console.log('   debugOverdueTasks() - Show detailed info about all tasks and due dates');
            console.log('   debugUserInfo() - Show user email and other info');
          } catch (error) {
            console.error('[App] Error in OverdueTaskService:', error);
          }

          // ===== Check for nearly-due tasks (tasks due in 1 day) =====
          console.log('[App] Checking nearly-due tasks...');
          try {
            const found = await NearlyDueTaskService.checkNearlyDueTasksFromAppState(firebaseUser.uid, tasksWithMetadata, firebaseUser.email || undefined);
            console.log(`[App] NearlyDueTaskService completed: ${found} tasks nearly due`);
            
            // Expose global functions for console debugging
            const userId = firebaseUser.uid;
            (window as any).checkNearlyDueTasksNow = async () => {
              console.log('[Console] Manually triggering NearlyDueTaskService...');
              // Get latest tasks from store
              const state = useTaskStore.getState();
              // Pass user email from Firebase Auth as fallback
              return NearlyDueTaskService.checkNearlyDueTasksFromAppState(userId, state.tasks, firebaseUser.email || undefined);
            };

            // Diagnostic function to debug nearly-due tasks
            (window as any).debugNearlyDueTasks = () => {
              const state = useTaskStore.getState();
              const now = new Date();
              const todayAtMidnight = new Date();
              todayAtMidnight.setHours(0, 0, 0, 0);
              
              const tomorrowAtMidnight = new Date(todayAtMidnight);
              tomorrowAtMidnight.setDate(tomorrowAtMidnight.getDate() + 1);
              
              const dayAfterTomorrowAtMidnight = new Date(tomorrowAtMidnight);
              dayAfterTomorrowAtMidnight.setDate(dayAfterTomorrowAtMidnight.getDate() + 1);
              
              console.log('\n🔍 DEBUG: Nearly-Due Tasks Analysis');
              console.log(`Current time: ${now.toISOString()}`);
              console.log(`Today's date (for comparison): ${todayAtMidnight.toISOString()}`);
              console.log(`Tomorrow's date: ${tomorrowAtMidnight.toISOString()}`);
              console.log(`Day after tomorrow: ${dayAfterTomorrowAtMidnight.toISOString()}`);
              console.log(`Total tasks in store: ${state.tasks.length}`);
              console.log('─'.repeat(60));
              
              state.tasks.forEach((task, index) => {
                const dueDate = task.dueDate || (task as any).due_at;
                const parsedDueDate = dueDate ? new Date(dueDate) : null;
                const parsedDateAtMidnight = parsedDueDate ? new Date(parsedDueDate) : null;
                if (parsedDateAtMidnight) {
                  parsedDateAtMidnight.setHours(0, 0, 0, 0);
                }
                const isNearlyDue = parsedDateAtMidnight && 
                                   parsedDateAtMidnight >= tomorrowAtMidnight && 
                                   parsedDateAtMidnight < dayAfterTomorrowAtMidnight;
                
                console.log(`\n[${index + 1}] "${task.title}"`);
                console.log(`  Status: ${task.status}`);
                console.log(`  Due Date: ${dueDate ? dueDate : 'No due date'}`);
                console.log(`  Parsed: ${parsedDueDate ? parsedDueDate.toISOString() : 'Invalid'}`);
                console.log(`  Parsed at midnight: ${parsedDateAtMidnight ? parsedDateAtMidnight.toISOString() : 'Invalid'}`);
                console.log(`  Nearly Due (due tomorrow): ${isNearlyDue ? '✅ YES' : '❌ NO'}`);
              });
              
              console.log('\n' + '─'.repeat(60));
              const nearlyDueCount = state.tasks.filter(t => {
                const dueDate = new Date(t.dueDate || (t as any).due_at);
                const dueDateAtMidnight = new Date(dueDate);
                dueDateAtMidnight.setHours(0, 0, 0, 0);
                return Number.isFinite(dueDate.getTime()) && 
                       dueDateAtMidnight >= tomorrowAtMidnight && 
                       dueDateAtMidnight < dayAfterTomorrowAtMidnight && 
                       t.status !== 'completed';
              }).length;
              console.log(`Total nearly-due tasks: ${nearlyDueCount}`);
            };

            // Reset notified tasks for testing
            (window as any).debugResetNearlyDueNotified = () => {
              console.log('[Console] Resetting nearly-due notification tracker...');
              NearlyDueTaskService.debugResetNotified();
            };
            
            // Log these for user reference
            console.log('📝 Additional console commands:');
            console.log('   checkNearlyDueTasksNow() - Check all tasks and send nearly-due notifications');
            console.log('   debugNearlyDueTasks() - Show detailed info about nearly-due tasks');
            console.log('   debugResetNearlyDueNotified() - Reset notification tracker for testing');
          } catch (error) {
            console.error('[App] Error in NearlyDueTaskService:', error);
          }

          // Restore persisted AI schedule so it survives logout / page refresh
          const persistedSchedule = await loadAIScheduleFromFirestore(firebaseUser.uid);
          if (persistedSchedule) {
            setAIScheduleResult(persistedSchedule);
            setStoreAIScheduleResult(persistedSchedule);
          }

          tasksReadyRef.current = true;
          setTasksLoaded(true);
        } catch (e) {
          console.warn('Failed to load user profile/tasks from Firestore:', e);
          tasksReadyRef.current = true;
          setTasksLoaded(true);
        }
      } else {
        setFirestoreUsername('');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [clearTasks, setTasks, setStoreUser]);


  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut(auth);
    }
  };

  // Update dashboard statistics
  useEffect(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const overdue = tasks.filter((t) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDay = new Date(t.dueDate);
      dueDay.setHours(0, 0, 0, 0);
      return dueDay < today && t.status !== 'completed';
    }).length;
    setDashboardStats({
      totalTasks: tasks.length,
      completedTasks: completed,
      inProgressTasks: inProgress,
      overdueTasks: overdue,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    });
  }, [tasks]);



  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowForm(true);
  };

  const handleFormSubmit = async (taskData: Partial<Task>) => {
    if (!user) return;

    const categoryName = (taskData.category || editingTask?.category || '').trim();
    const ensuredCategory = categoryName ? await TaskCategoryService.ensureCategoryExists(categoryName) : null;
    const normalizedCategoryName = ensuredCategory?.name || categoryName || 'Other';
    const normalizedCategoryId = ensuredCategory?.category_id || taskData.categoryId || editingTask?.categoryId;

    mergeCategory(ensuredCategory);
    
    if (editingTask) {
      // Update existing task
      updateTask(editingTask.id, {
        ...taskData,
        category: normalizedCategoryName,
        categoryId: normalizedCategoryId,
      });
      // Also update in Firestore
      try {
        await TaskService.updateTask(editingTask.id, {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority_manual: taskData.priority,
          due_at: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : undefined,
          category_id: normalizedCategoryId,
          estimated_time: taskData.estimatedTime,
        });
        // Record update event
        await TaskLogService.recordEvent(
          editingTask.id,
          'updated'
        );
        
        // Update user performance metrics when task is edited
        if (user) {
          const updatedTasks = getTasks();
          await UserPerformanceService.updateUserPerformance(user.uid, updatedTasks);
        }
        
        // Update priority score for edited task
        const editedTask = getTasks().find(t => t.id === editingTask.id);
        if (editedTask) {
          await PriorityScoreService.updatePriorityScore(editedTask);
        }
      } catch (error) {
        console.error('Error updating task in Firestore:', error);
      }
    } else {
      // Create new task in Firestore first so the task document ID becomes the canonical task_id.
      try {
        const isTutorialTask = useTutorialStore.getState().isActive;

        const firestoreTaskId = await TaskService.createTask(user.uid, {
          title: taskData.title || '',
          description: taskData.description || '',
          status: 'todo',
          priority_manual: taskData.priority || 'medium',
          due_at: Timestamp.fromDate(new Date(taskData.dueDate || new Date())),
          category_id: normalizedCategoryId,
          estimated_time: taskData.estimatedTime || 30,
          is_tutorial: isTutorialTask,
        });

        const newTask: Task = {
          id: firestoreTaskId,
          title: taskData.title || '',
          description: taskData.description || '',
          createdByUid: user?.uid,
          createdByName: user?.displayName || firestoreUsername || '',
          createdByEmail: user?.email || '',
          dueDate: taskData.dueDate || new Date(),
          priority: taskData.priority || 'medium',
          status: 'todo',
          category: normalizedCategoryName,
          categoryId: normalizedCategoryId,
          tags: taskData.tags || [],
          estimatedTime: taskData.estimatedTime || 30,
          actualTime: 0,
          subtasks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isFromTutorial: isTutorialTask, // Mark if created during active tutorial
        };

        addTask(newTask);
        // Record create event
        await TaskLogService.recordEvent(
          firestoreTaskId,
          'created'
        );
        
        // Create priority score for new task
        await PriorityScoreService.createPriorityScore(newTask);
      } catch (error) {
        console.error('Error saving task to Firestore:', error);
      }
    }
    
    // Handle tutorial progression: STEP 3 requires creating 6 tasks before advancing to STEP 4
    const { isActive, currentStepIndex, steps, nextStep } = useTutorialStore.getState();
    const currentStep = steps[currentStepIndex];
    
    if (isActive && currentStep?.id === 'task-form-creation') {
      // Get all tutorial tasks created so far
      const allTasks = getTasks();
      const createdTutorialTasks = allTasks.filter(
        t => t.isFromTutorial
      ).length;
      
      // Only proceed to step 4 if 6 tasks are created, otherwise form stays open
      if (createdTutorialTasks >= 6) {
        setShowForm(false);
        nextStep();
      } else {
        // Keep form open, don't close it
        setShowForm(true);
      }
    } else {
      setShowForm(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      // Get the task to retrieve its categoryId
      const taskToDelete = tasks.find(t => t.id === id);
      
      // Remove from app UI immediately
      deleteTask(id);
      
      // Soft delete in Firestore (mark as deleted but preserve data)
      try {
        // Record the deletion event first
        await TaskLogService.recordEvent(id, 'deleted');
        // Delete all related logs for this task
        await TaskLogService.deleteTaskLogs(id);
        // Delete all related schedules for this task
        await TaskScheduleService.deleteTaskSchedules(id);
        
        // Soft delete the task in Firestore (mark deleted_at timestamp)
        // This removes it from user view but preserves data for historical/AI analysis
        await TaskService.softDeleteTask(id);
        
        // Delete related priority score
        await PriorityScoreService.deletePriorityScore(id);
        
        // If task had a category, check if the category is still in use
        if (taskToDelete?.categoryId) {
          await TaskCategoryService.deleteCategoryIfUnused(taskToDelete.categoryId);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    updateTask(id, { status });
    
    // Also update in Firestore
    try {
      await TaskService.updateTaskStatus(id, status);
      // If changing to 'in-progress', record the actual start time
      if (status === 'in-progress' && user) {
        await TaskScheduleService.recordActualStartTime(user.uid, id);
      }
      // Record status change event
      await TaskLogService.recordEvent(
        id,
        'status_changed'
      );
      
      // Update user performance metrics whenever task status changes
      if (user) {
        const updatedTasks = getTasks();
        await UserPerformanceService.updateUserPerformance(user.uid, updatedTasks);
      }
      
      // Update priority score when task status changes
      const changedTask = getTasks().find(t => t.id === id);
      if (changedTask) {
        await PriorityScoreService.updatePriorityScore(changedTask);
      }
      
      // Incrementally train the DQL model when a task is completed
      // so it continuously learns from real outcomes without a full schedule regeneration.
      if (status === 'completed' && user) {
        const task = tasks.find(t => t.id === id);
        if (task) {
          const completedHour = new Date().getHours();
          const priorityNum = task.urgency != null && task.importance != null
            ? (task.urgency + task.importance) / 2
            : { high: 8, medium: 5, low: 2 }[task.priority] ?? 5;
          const model = await DQLSchedulerModel.load(user.uid);
          await model.trainOnSingleRecord({
            hour: Math.max(8, Math.min(21, completedHour)),
            priorityNum,
            durationHrs: (task.estimatedTime ?? 60) / 60,
            completed: status === 'completed',
          });
          await model.save(user.uid);
          model.dispose();
        }
      }
    } catch (error) {
      console.error('Error updating task status in Firestore:', error);
    }
  };

  const handleScheduleClick = () => {
    if (!user || schedulingLoading) return;
    
    const { isActive, hasCompletedTutorial } = useTutorialStore.getState();
    
    // DURING TUTORIAL: Show mock schedule (unlocked preview)
    if (isActive && !hasCompletedTutorial) {
      // Tutorial is active - mock schedule is already showing via effect
      return;
    }
    
    // AFTER TUTORIAL / NORMAL MODE: Show settings reminder before scheduling
    // Real schedule will be locked if user lacks task history
    setShowScheduleReminder(true);
  };

  const handleScheduleProceed = async () => {
    setShowScheduleReminder(false);
    if (!user || schedulingLoading) return;
    
    const { isActive, hasCompletedTutorial } = useTutorialStore.getState();
    
    // DURING TUTORIAL: Don't generate real schedule yet
    if (isActive && !hasCompletedTutorial) {
      if (tasks.length > 0) {
        const mockSchedule = generateMockAISchedule(tasks);
        setAIScheduleResult(mockSchedule);
        setStoreAIScheduleResult(mockSchedule);
      }
      useTutorialStore.getState().nextStep();
      return; // Tutorial shows mock schedule only
    }
    
    // AFTER TUTORIAL: Generate real schedule (locked by history requirement)
    setSchedulingLoading(true);
    setScheduleError(null);
    try {
      const pendingTasks = tasks.filter(t => t.status !== 'completed');
      const result = await generateAISchedule(user.uid, pendingTasks, useTaskStore.getState().scheduleSettings);
      setAIScheduleResult(result);
      setStoreAIScheduleResult(result);
      void saveAIScheduleToFirestore(user.uid, result);
      // Navigate to scheduler page
      setActiveTab('scheduler');
    } catch (err) {
      if (err instanceof NotEnoughHistoryError) {
        // LOCK: Require 6 completed tasks before allowing real schedule
        setScheduleError(`You need at least 6 completed task records to use AI Schedule. You currently have ${err.count}.`);
        setActiveTab('scheduler');
      } else {
        console.error('AI Schedule error:', err);
      }
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleScheduleGoToSettings = () => {
    setShowScheduleReminder(false);
    setActiveTab('settings');
    
    // Auto-advance tutorial to next step when user clicks "Go to Settings"
    const { isActive, hasCompletedTutorial } = useTutorialStore.getState();
    if (isActive && !hasCompletedTutorial) {
      useTutorialStore.getState().nextStep();
    }
  };

  const handleAllTasksClick = () => {
    setActiveTab('tasks');
    setFilter('all');
  };

  const pendingTasks = tasks.filter((t) => t.status === 'todo').length;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleViewAllSchedule = () => {
    setActiveTab('tasks');
    setFilter('all');
  };

  const handleStatsFilterNavigation = (selectedFilter: FilterType) => {
    setFilter(selectedFilter);
    setActiveTab('tasks');
  };

  // const handleTrackingComplete = async (taskId: string, actualTime: number) => {
  //   // Update task with actual time
  //   const taskIndex = tasks.findIndex(t => t.id === taskId);
  //   if (taskIndex !== -1) {
  //     const updatedTask = {
  //       ...tasks[taskIndex],
  //       actualTime,
  //     };
  //     // Update in local state
  //     const newTasks = [...tasks];
  //     newTasks[taskIndex] = updatedTask;
  //     setTasks(newTasks);
  //
  //     // Update in Firestore
  //     try {
  //       await TaskService.updateTask(user!.uid, updatedTask);
  //       // Log the tracking event
  //       await TaskLogService.recordEvent(taskId, 'updated');
  //     } catch (error) {
  //       console.error('Error saving tracking data:', error);
  //     }
  //   }
  // };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
<Sidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        onSignOut={handleSignOut}
        onOpenChange={setSidebarOpen}
        isOpen={sidebarOpen}
      />
      
      <div className="flex flex-col lg:ml-64 h-full overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="bg-indigo-600 text-white p-2 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-800">TaskSync</span>
        </div>
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 overflow-x-hidden pr-2">
          {activeTab !== 'calendar' && activeTab !== 'tasks' && activeTab !== 'scheduler' && activeTab !== 'settings' && activeTab !== 'analytics' && (
            <div className={activeTab === 'dashboard' ? 'tasks-page-enter' : undefined}>
              <Header onScheduleClick={handleScheduleClick} onAllTasksClick={handleAllTasksClick} userName={user?.displayName || firestoreUsername || undefined} schedulingLoading={schedulingLoading} />
            </div>
          )}
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
          {activeTab === 'calendar' ? (
            <div className="tasks-page-enter">
              <CalendarPage tasks={tasks} />
            </div>
          ) : activeTab === 'tasks' ? (
            <TasksPage
              tasks={tasks}
              categories={taskCategories}
              filter={filter}
              onFilterChange={setFilter}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onNewTask={handleCreateTask}
              onViewSchedule={(taskId) => {
                setSelectedTaskId(taskId);
                setActiveTab('scheduler');
              }}
            />
          ) : activeTab === 'scheduler' ? (
            <div className="tasks-page-enter">
              <AISchedulerPage 
                notEnoughDataMessage={
                  useTutorialStore.getState().isActive ? null : scheduleError
                } 
                selectedTaskId={selectedTaskId} 
              />
            </div>
          ) : activeTab === 'settings' ? (
            <SettingsPage />
          ) : activeTab === 'analytics' ? (
            <div className="tasks-page-enter">
              <AnalyticsPage tasks={tasks} />
            </div>
          ) : (
            <div className="tasks-page-enter space-y-8">
              {/* Statistics */}
              <DashboardStatistics 
                stats={dashboardStats} 
                pendingTasks={pendingTasks}
                onFilterChange={handleStatsFilterNavigation}
              />

              {/* Schedule - Today's wider + Upcoming side */}
              {/* Schedule - Equal height 70/30 */}
              <div className="tasks-page-section grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-8 items-stretch">
                <div className="lg:col-span-7">
                  <TaskTimeline tasks={tasks} onViewAllClick={handleViewAllSchedule} />
                </div>
                <div className="lg:col-span-3">
                  <UpcomingEvents tasks={tasks} />
                </div>
              </div>


            </div>
          )}
          </div>
        </main>
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
          initialTask={editingTask}
        />
      )}

      {/* AI Schedule Loading Overlay */}
      {schedulingLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-semibold">Generating your AI schedule…</p>
            <p className="text-gray-400 text-sm">Analysing your behaviour patterns</p>
          </div>
        </div>
      )}

      {/* AI Schedule Modal */}
      {aiScheduleResult && showAIScheduleModal && (
        <AIScheduleModal
          result={aiScheduleResult}
          onClose={() => setShowAIScheduleModal(false)}
        />
      )}

      {/* AI Schedule Reminder Modal */}
      {showScheduleReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowScheduleReminder(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative" onClick={e => e.stopPropagation()} data-tour="ai-schedule-reminder-modal">
            <button
              onClick={() => setShowScheduleReminder(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">AI Schedule Reminder</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Before generating your AI schedule, make sure you've configured your preferences in <span className="font-semibold text-indigo-600">Settings</span> — such as work hours, break duration, and stress level — for the best results.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleScheduleGoToSettings}
                data-tour="ai-schedule-go-to-settings"
                className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Go to Settings
              </button>
              <button
                onClick={handleScheduleProceed}
                data-tour="ai-schedule-continue-button"
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Path Tutorial */}
      <GuidedPathTutorial />
    </div>
  );
}

export default App;
