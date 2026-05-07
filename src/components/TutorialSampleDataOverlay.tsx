import React from 'react';
import { SAMPLE_TUTORIAL_DATA } from '@/config/sampleTutorialData';

interface TutorialSampleDataOverlayProps {
  stepId: string;
  isVisible: boolean;
}

const TutorialSampleDataOverlay: React.FC<TutorialSampleDataOverlayProps> = ({ stepId, isVisible }) => {
  if (!isVisible) return null;

  const renderBestProductivityHours = () => {
    const data = SAMPLE_TUTORIAL_DATA.bestProductivityHours;
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">📊</span> {data.title}
        </h3>
        <p className="text-sm text-indigo-600 bg-indigo-50 p-2 rounded mb-4">{data.helperNote}</p>
        <div className="space-y-3 mb-4">
          {data.data.map((item, idx) => (
            <div key={idx} className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded">
              <div className="font-semibold text-gray-900">{item.timeSlot}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">{item.description}</span>
                <span className="text-lg font-bold text-green-600">{item.successRate}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.tasksCompleted} tasks completed</div>
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-600 italic">{data.cta}</div>
      </div>
    );
  };

  const renderLowestProductivityHours = () => {
    const data = SAMPLE_TUTORIAL_DATA.lowestProductivityHours;
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">📊</span> {data.title}
        </h3>
        <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded mb-4">{data.helperNote}</p>
        <div className="space-y-3 mb-4">
          {data.data.map((item, idx) => (
            <div key={idx} className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50 rounded">
              <div className="font-semibold text-gray-900">{item.timeSlot}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">{item.description}</span>
                <span className="text-lg font-bold text-orange-600">{item.successRate}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.tasksCompleted} tasks completed</div>
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-600 italic">{data.cta}</div>
      </div>
    );
  };

  const renderConfidenceScore = () => {
    const data = SAMPLE_TUTORIAL_DATA.aiConfidenceExamples;
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">🎯</span> {data.title}
        </h3>
        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded mb-4">{data.helperNote}</p>
        <div className="space-y-3 mb-4">
          {data.tasks.map((task, idx) => (
            <div key={idx} className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition">
              <div className="flex justify-between items-start mb-1">
                <div className="font-semibold text-gray-900">{task.name}</div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{task.confidence}</div>
                  <div className="text-xs text-gray-500">{task.priority} Priority</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">{task.deadline}</div>
              <div className="text-xs text-gray-500 italic">{task.reasoning}</div>
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-600 italic">{data.cta}</div>
      </div>
    );
  };

  const renderCalendarSample = () => {
    const data = SAMPLE_TUTORIAL_DATA.calendarSample;
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">📅</span> {data.title}
        </h3>
        <p className="text-sm text-green-600 bg-green-50 p-2 rounded mb-4">{data.helperNote}</p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {data.weekView.map((day, idx) => (
            <div key={idx} className="border rounded-lg p-3 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="font-semibold text-gray-900 text-sm mb-2">{day.day}</div>
              <div className="space-y-2">
                {day.tasks.map((task, taskIdx) => (
                  <div key={taskIdx} className="bg-white rounded p-1.5 text-xs border-l-2 border-blue-500">
                    <div className="font-medium text-gray-700 truncate">{task.name}</div>
                    <div className="text-gray-500 text-xs">{task.time}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs font-semibold text-gray-600 bg-white rounded px-2 py-1">
                {day.workload}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-600 italic">{data.cta}</div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const data = SAMPLE_TUTORIAL_DATA.analyticsSample;
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">📈</span> {data.title}
        </h3>
        <p className="text-sm text-purple-600 bg-purple-50 p-2 rounded mb-4">{data.helperNote}</p>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {data.metrics.map((metric, idx) => (
            <div key={idx} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
              <div className="text-sm text-gray-600 mb-1">{metric.label}</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{metric.percentage}</div>
                <div className="text-xs text-gray-500">{metric.value}</div>
              </div>
              <div className={`text-xs mt-2 font-semibold ${metric.trend === 'up' ? 'text-green-600' : 'text-blue-600'}`}>
                {metric.trend === 'up' ? '↗️ Trending up' : '→ Stable'}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 mb-4">
          <div className="text-sm font-semibold text-gray-900 mb-2">Completion Trend</div>
          <div className="text-sm text-gray-700">{data.chartDescription}</div>
        </div>

        <div className="text-center text-sm text-gray-600 italic">{data.cta}</div>
      </div>
    );
  };

  const renderContent = () => {
    switch (stepId) {
      case 'scheduler-best-hours':
        return renderBestProductivityHours();
      case 'scheduler-lowest-hours':
        return renderLowestProductivityHours();
      case 'scheduler-confidence-score':
        return renderConfidenceScore();
      case 'calendar-view':
        return renderCalendarSample();
      case 'analytics-completion-chart':
        return renderAnalytics();
      default:
        return null;
    }
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="pointer-events-auto max-h-[70vh] overflow-auto">
        {content}
      </div>
    </div>
  );
};

export default TutorialSampleDataOverlay;
