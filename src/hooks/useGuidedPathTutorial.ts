import { useEffect } from 'react';
import { useTutorialStore } from '@/store/tutorialStore';
import { TOUR_STEPS } from '@/config/tourSteps';

interface UseTutorialOptions {
  autoStart?: boolean;
  onComplete?: () => void;
}

/**
 * Custom hook to manage the guided path tutorial
 * Handles initialization, step management, and completion callbacks
 */
export const useGuidedPathTutorial = (options: UseTutorialOptions = {}) => {
  const { autoStart = false, onComplete } = options;
  const {
    isActive,
    currentStepIndex,
    startTutorial,
    skipTutorial,
    nextStep,
    previousStep,
    hasCompletedTutorial,
    steps,
  } = useTutorialStore();

  // Auto-start tutorial if specified and not yet completed
  useEffect(() => {
    if (autoStart && !isActive && !hasCompletedTutorial) {
      startTutorial(TOUR_STEPS);
    }
  }, [autoStart, isActive, hasCompletedTutorial, startTutorial]);

  // Call completion callback when tutorial finishes
  useEffect(() => {
    if (hasCompletedTutorial && onComplete) {
      onComplete();
    }
  }, [hasCompletedTutorial, onComplete]);

  return {
    isActive,
    currentStepIndex,
    totalSteps: steps.length,
    startTutorial: () => startTutorial(TOUR_STEPS),
    skipTutorial,
    nextStep,
    previousStep,
    hasCompletedTutorial,
  };
};

export default useGuidedPathTutorial;
