import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightPadding?: number;
  page?: string;
  canAdvance?: () => boolean; // Optional validation function to check if user can proceed
}

interface TutorialStore {
  isActive: boolean;
  currentStepIndex: number;
  steps: TutorialStep[];
  hasCompletedTutorial: boolean;
  pageNavigator?: (page: string) => void;
  startTutorial: (steps: TutorialStep[]) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
  getCurrentStep: () => TutorialStep | null;
  getProgress: () => { current: number; total: number };
  setPageNavigator: (navigator: (page: string) => void) => void;
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStepIndex: 0,
      steps: [],
      hasCompletedTutorial: false,
      pageNavigator: undefined,

      startTutorial: (steps: TutorialStep[]) => {
        set({
          isActive: true,
          steps,
          currentStepIndex: 0,
          hasCompletedTutorial: false,
        });
      },

      nextStep: () => {
        const { currentStepIndex, steps, pageNavigator } = get();
        const nextIndex = currentStepIndex + 1;
        
        if (nextIndex < steps.length) {
          const nextStep = steps[nextIndex];
          // Navigate to the new page if it's different
          if (nextStep.page && pageNavigator) {
            pageNavigator(nextStep.page);
          }
          set({ currentStepIndex: nextIndex });
        } else {
          // Tutorial complete
          set({ isActive: false, hasCompletedTutorial: true });
        }
      },

      previousStep: () => {
        const { currentStepIndex, steps, pageNavigator } = get();
        if (currentStepIndex > 0) {
          const prevIndex = currentStepIndex - 1;
          const prevStep = steps[prevIndex];
          // Navigate to the previous page if it's different
          if (prevStep.page && pageNavigator) {
            pageNavigator(prevStep.page);
          }
          set({ currentStepIndex: prevIndex });
        }
      },

      skipTutorial: () => {
        set({ isActive: false, hasCompletedTutorial: true });
      },

      resetTutorial: () => {
        set({
          isActive: false,
          currentStepIndex: 0,
          steps: [],
          hasCompletedTutorial: false,
        });
      },

      getCurrentStep: () => {
        const { steps, currentStepIndex } = get();
        return steps[currentStepIndex] || null;
      },

      getProgress: () => {
        const { currentStepIndex, steps } = get();
        return {
          current: currentStepIndex + 1,
          total: steps.length,
        };
      },

      setPageNavigator: (navigator: (page: string) => void) => {
        set({ pageNavigator: navigator });
      },
    }),
    {
      name: 'tasksync-tutorial-store',
      partialize: (state) => ({
        hasCompletedTutorial: state.hasCompletedTutorial,
      }),
    }
  )
);
