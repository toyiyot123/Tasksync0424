import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTutorialStore, TutorialStep } from '@/store/tutorialStore';
import { useTaskStore } from '@/store/taskStore';
import './GuidedPathTutorial.css';

interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GuidedPathTutorial: React.FC = () => {
  const { isActive, currentStepIndex, steps, nextStep, previousStep, skipTutorial, pageNavigator } = useTutorialStore();
  const { getTasks } = useTaskStore();
  const [elementPosition, setElementPosition] = useState<ElementPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [canProceed, setCanProceed] = useState(true);
  const [taskCount, setTaskCount] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];

  // Navigate to the current step's page when tutorial starts or step changes
  useEffect(() => {
    if (!isActive || !currentStep || !currentStep.page || !pageNavigator) return;
    
    pageNavigator(currentStep.page);
    
    // Check if we can proceed to next step
    if (currentStep.canAdvance) {
      setCanProceed(currentStep.canAdvance());
    } else {
      setCanProceed(true);
    }

    // Update task count for step 3
    if (currentStep.id === 'task-form-creation') {
      setTaskCount(getTasks().length);
    }
  }, [isActive, currentStep, pageNavigator, getTasks]);

  // Monitor if canAdvance condition changes (e.g., task created)
  useEffect(() => {
    if (!isActive || !currentStep || !currentStep.canAdvance) return;

    // Check every 500ms if the condition is now met and update task count
    const checkInterval = setInterval(() => {
      setCanProceed(currentStep.canAdvance!());
      
      // Update task count for step 3
      if (currentStep.id === 'task-form-creation') {
        setTaskCount(getTasks().length);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [isActive, currentStep, getTasks]);

  // Update element position when step changes or window resizes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 50; // Try for up to 2.5 seconds
    const retryDelay = 50;
    let timeoutId: ReturnType<typeof setTimeout>;

    const updatePosition = () => {
      if (!isMounted) return;

      const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
      
      if (!element) {
        // Element not found yet, retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(updatePosition, retryDelay);
        }
        return;
      }

      // Scroll element into view first
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      // Wait for scroll to complete and element to fully render before measuring
      setTimeout(() => {
        if (!isMounted) return;
        
        const rect = element.getBoundingClientRect();
        const padding = currentStep.highlightPadding || 8;

        setElementPosition({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      }, 500);
    };

    // Wait for page animation to complete before showing step (typically 300ms for page transition)
    timeoutId = setTimeout(() => {
      if (!isMounted) return;
      updatePosition();
    }, 300);

    const resizeObserver = new ResizeObserver(() => {
      if (!isMounted) return;
      const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = currentStep.highlightPadding || 8;
        setElementPosition({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      }
    });

    const element = document.querySelector(currentStep?.targetSelector) as HTMLElement;
    if (element) resizeObserver.observe(element);

    const handleScroll = () => {
      const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = currentStep.highlightPadding || 8;
        setElementPosition({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      }
    };

    const handleResize = () => {
      const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = currentStep.highlightPadding || 8;
        setElementPosition({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, currentStep]);

  // Position tooltip to avoid going off-screen with perfect edge alignment
  useEffect(() => {
    if (!elementPosition || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = currentStep?.position || 'bottom';
    
    const screenPadding = 16; // Minimum distance from screen edges
    const gap = 16; // Gap between highlight and tooltip

    let top = 0;
    let left = 0;

    const highlightCenterX = elementPosition.left + elementPosition.width / 2;
    const highlightCenterY = elementPosition.top + elementPosition.height / 2;
    const highlightBottom = elementPosition.top + elementPosition.height;
    const highlightTop = elementPosition.top;
    const highlightLeft = elementPosition.left;
    const highlightRight = elementPosition.left + elementPosition.width;

    // Available space in each direction
    const spaceTop = elementPosition.top;
    const spaceBottom = window.innerHeight - highlightBottom;
    const spaceLeft = elementPosition.left;
    const spaceRight = window.innerWidth - highlightRight;

    // Try to position bottom by default
    let preferredPosition = position;
    const tooltipWidth = Math.max(tooltipRect.width, 280);
    const tooltipHeight = Math.max(tooltipRect.height, 100);

    // Smart position selection based on available space
    if (preferredPosition === 'bottom' && spaceBottom < tooltipHeight + gap + screenPadding) {
      preferredPosition = 'top';
    }
    if (preferredPosition === 'top' && spaceTop < tooltipHeight + gap + screenPadding) {
      preferredPosition = 'bottom';
    }
    if (preferredPosition === 'right' && spaceRight < tooltipWidth + gap + screenPadding) {
      preferredPosition = 'left';
    }
    if (preferredPosition === 'left' && spaceLeft < tooltipWidth + gap + screenPadding) {
      preferredPosition = 'right';
    }

    // Calculate position based on final preference
    switch (preferredPosition) {
      case 'bottom':
        top = highlightBottom + gap;
        left = highlightCenterX - tooltipWidth / 2;
        break;
      case 'top':
        top = highlightTop - tooltipHeight - gap;
        left = highlightCenterX - tooltipWidth / 2;
        break;
      case 'left':
        top = highlightCenterY - tooltipHeight / 2;
        left = highlightLeft - tooltipWidth - gap;
        break;
      case 'right':
        top = highlightCenterY - tooltipHeight / 2;
        left = highlightRight + gap;
        break;
      case 'center':
      default:
        top = window.innerHeight / 2 - tooltipHeight / 2;
        left = window.innerWidth / 2 - tooltipWidth / 2;
        break;
    }

    // Clamp to screen boundaries with padding
    left = Math.max(screenPadding, Math.min(left, window.innerWidth - tooltipWidth - screenPadding));
    top = Math.max(screenPadding, Math.min(top, window.innerHeight - tooltipHeight - screenPadding));

    setTooltipPosition({ top, left });
  }, [elementPosition, currentStep?.position]);

  if (!isActive || !currentStep) return null;

  const progress = currentStepIndex + 1;
  const total = steps.length;

  return (
    <>
      {/* Dark Overlay */}
      <div className="guided-path-overlay" />

      {/* Highlight Box with Pulsing Blue Arrow */}
      {elementPosition && (
        <div
          className="guided-path-highlight"
          style={{
            top: elementPosition.top,
            left: elementPosition.left,
            width: elementPosition.width,
            height: elementPosition.height,
          }}
        >
          {/* Pulsing Blue Arrow pointing to element */}
          <div className="guided-path-arrow">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 8L28 20H12L20 8Z"
                fill="#3b82f6"
                className="guided-path-arrow-icon"
              />
            </svg>
          </div>
        </div>
      )}

      {/* White Tooltip Bubble */}
      <div
        ref={tooltipRef}
        className="guided-path-tooltip"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-bold text-slate-900">{currentStep.title}</h3>
          <button
            onClick={skipTutorial}
            className="flex-shrink-0 rounded-lg p-1 hover:bg-slate-100 transition-colors"
            aria-label="Close tutorial"
          >
            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {currentStep.message}
        </p>

        {!canProceed && currentStep?.id === 'task-form-creation' && (
          <div className="mb-4 p-3 bg-black rounded-lg">
            <p className="text-sm text-yellow-300 font-semibold">
              ⏳ Create 6 tasks to continue the tutorial. ({taskCount}/6 created)
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-4 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Step {progress} of {total}
          </span>

          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={previousStep}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            <button
              onClick={nextStep}
              disabled={!canProceed}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                canProceed
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {currentStepIndex === total - 1 ? 'Finish' : 'Next'}
              {currentStepIndex < total - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidedPathTutorial;
