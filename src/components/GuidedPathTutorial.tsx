import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTutorialStore } from '@/store/tutorialStore';
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
  const tasks = useTaskStore((state) => state.tasks);
  const [elementPosition, setElementPosition] = useState<ElementPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];
  const mobileTooltipMode = isMobile && currentStep ? `guided-path-mobile-${currentStep.id}` : '';
  
  // Step 3 only loops for brand-new users who had no real tasks before the tutorial.
  const isStep3 = currentStep?.id === 'task-form-creation';
  const tutorialTasks = tasks.filter(t => t.isFromTutorial);
  const realTasks = tasks.filter(t => !t.isFromTutorial);
  const createdTutorialTasks = tutorialTasks.length;
  const isNewUser = realTasks.length === 0;
  const shouldLoopStep3 = isStep3 && isNewUser;
  const hasCreatedSixTutorialTasks = createdTutorialTasks >= 6;
  // On Step 3: new users must create 6 tasks, old users can proceed. On other steps: always allow.
  const canProceedToStep4 = !isStep3 || !isNewUser || hasCreatedSixTutorialTasks;
  
  // Track mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isActive || !currentStep || !isMobile) return;

    document.body.classList.add('guided-path-mobile-active', mobileTooltipMode);

    return () => {
      document.body.classList.remove('guided-path-mobile-active', mobileTooltipMode);
    };
  }, [isActive, currentStep, isMobile, mobileTooltipMode]);
  
  // Hide sidebar on mobile during tutorial
  useEffect(() => {
    if (isActive && isMobile) {
      // Close sidebar on mobile during tutorial
      const sidebar = document.querySelector('aside[class*="fixed"]') as HTMLElement;
      const sidebarBackdrop = document.querySelector('button[class*="bg-black/20"]') as HTMLElement;

      if (sidebar && window.innerWidth < 768) {
        sidebar.style.visibility = 'hidden';
        sidebar.style.pointerEvents = 'none';
      }
      if (sidebarBackdrop && window.innerWidth < 768) {
        sidebarBackdrop.style.visibility = 'hidden';
        sidebarBackdrop.style.pointerEvents = 'none';
      }
    }
    return () => {
      const sidebar = document.querySelector('aside[class*="fixed"]') as HTMLElement;
      const sidebarBackdrop = document.querySelector('button[class*="bg-black/20"]') as HTMLElement;
      if (sidebar) {
        sidebar.style.visibility = 'visible';
        sidebar.style.pointerEvents = 'auto';
      }
      if (sidebarBackdrop) {
        sidebarBackdrop.style.visibility = 'visible';
        sidebarBackdrop.style.pointerEvents = 'auto';
      }
    };
  }, [isActive, isMobile]);

  // Navigate to the current step's page when tutorial starts or step changes
  useEffect(() => {
    if (!isActive || !currentStep || !currentStep.page || !pageNavigator) return;
    
    pageNavigator(currentStep.page);
  }, [isActive, currentStep, pageNavigator]);

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

  // Position tooltip to avoid going off-screen with mobile-aware positioning
  useEffect(() => {
    if (!elementPosition || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    let position = currentStep?.position || 'bottom';
    
    const screenPadding = isMobile ? 12 : 16;
    const gap = isMobile ? 12 : 16;

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

    // Mobile-specific adjustments
    let preferredPosition = position;
    const tooltipWidth = Math.min(Math.max(tooltipRect.width, 260), isMobile ? window.innerWidth - 24 : 380);
    const tooltipHeight = Math.max(tooltipRect.height, 100);

    if (isMobile && currentStep && elementPosition) {
      // Dynamically place tooltip on the opposite side of the highlighted element
      // so it never covers the content the user needs to see.
      const elementCenterY = elementPosition.top + elementPosition.height / 2;
      const centeredLeft = Math.max(
        screenPadding,
        Math.min((window.innerWidth - tooltipWidth) / 2, window.innerWidth - tooltipWidth - screenPadding)
      );

      // For the task form, the submit button is at the bottom of the form.
      // Always place the tooltip at the top so the create button remains accessible.
      const forceTop = currentStep.id === 'task-form-creation';

      if (forceTop || elementCenterY >= window.innerHeight / 2) {
        // Element in lower half (or forced) → tooltip at top
        setTooltipPosition({
          top: screenPadding,
          left: centeredLeft,
        });
      } else {
        // Element in upper half → tooltip at bottom
        setTooltipPosition({
          top: window.innerHeight - tooltipHeight - screenPadding,
          left: centeredLeft,
        });
      }
      return;
    }

    // Smart position selection based on available space
    // For mobile, prefer bottom first, then top, then center
    if (isMobile) {
      if (preferredPosition === 'left' || preferredPosition === 'right') {
        preferredPosition = spaceBottom > tooltipHeight + gap + screenPadding ? 'bottom' : 'top';
      }
    }

    // Smart fallback if preferred position doesn't fit
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
  }, [elementPosition, currentStep, isMobile]);

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
        className={`guided-path-tooltip ${isMobile ? 'guided-path-tooltip-mobile' : ''}`}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
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

        {/* Step 3 Progress: Show created task count for all users */}
        {isStep3 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900">
              Create 6 Tasks: {Math.min(createdTutorialTasks, 6)}/6
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {isNewUser 
                ? 'The form will stay open until you create all 6 tutorial tasks.'
                : 'You can create additional tasks or proceed to the next step.'}
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
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Step {progress} of {total}
          </span>

          {isStep3 && isNewUser && !hasCreatedSixTutorialTasks && (
            <div className="text-sm font-medium text-slate-600 md:hidden">
              {createdTutorialTasks === 0 
                ? 'Create your first task ->'
                : `${6 - createdTutorialTasks} more task${6 - createdTutorialTasks !== 1 ? 's' : ''} to create ->`}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 w-full md:w-auto">
            {currentStepIndex > 0 && (
              <button
                onClick={previousStep}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {isStep3 && isNewUser && !hasCreatedSixTutorialTasks && (
              <div className="hidden md:block text-sm font-medium text-slate-600">
                {createdTutorialTasks === 0 
                  ? 'Create your first task ->'
                  : `${6 - createdTutorialTasks} more task${6 - createdTutorialTasks !== 1 ? 's' : ''} to create ->`}
              </div>
            )}

            <button
              onClick={nextStep}
              disabled={!canProceedToStep4}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all flex-1 md:flex-none justify-center md:justify-start ${
                canProceedToStep4
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
