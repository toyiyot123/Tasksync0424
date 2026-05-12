import React from 'react';
import { X, Sparkles, Clock, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { AIScheduleResult } from '@/services/AIScheduleService';
import { useTaskStore } from '@/store/taskStore';

interface AIScheduleModalProps {
  result: AIScheduleResult;
  onClose: () => void;
}

// Format hour to 12-hour AM/PM format (matches AISchedulerPage)
const formatHour = (h: number) => {
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const confidenceColor = (pct: number) => {
  if (pct >= 75) return 'text-green-600';
  if (pct >= 50) return 'text-yellow-600';
  return 'text-red-500';
};

const confidenceBg = (pct: number) => {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-400';
};

// Parse "9:00 AM" / "5:30 PM" → total minutes from midnight
const parseTimeToMins = (time: string): number => {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const AIScheduleModal: React.FC<AIScheduleModalProps> = ({ result, onClose }) => {
  const { schedule, unscheduled, insights, generatedAt } = result;
  const scheduleSettings = useTaskStore((state) => state.scheduleSettings);

  // Returns true when a scheduled item's time falls outside the current work window.
  const isOutsideTimeframe = (startTime: string, endTime: string): boolean => {
    const startMins = parseTimeToMins(startTime);
    const endMins   = parseTimeToMins(endTime);
    const wsStart   = scheduleSettings.workStart * 60;
    const wsEnd     = scheduleSettings.workEnd   * 60;
    if (scheduleSettings.workStart <= scheduleSettings.workEnd) {
      return startMins < wsStart || endMins > wsEnd;
    }
    const inEveningBlock = startMins >= wsStart && endMins <= 24 * 60;
    const inMorningBlock = startMins >= 0 && endMins <= wsEnd;
    return !(inEveningBlock || inMorningBlock);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-tour="ai-schedule-reminder">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" data-tour="ai-generated-schedule-modal">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-bold">AI-Generated Schedule</h2>
          </div>
          <button onClick={handleClose} className="hover:bg-indigo-700 rounded-lg p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Insights banner */}
          {insights.totalRecords > 0 ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                <Zap className="w-4 h-4" />
                Personalized from {insights.totalRecords} historical records · {insights.overallSuccessRate}% overall success rate
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-green-700 mb-1">
                    <TrendingUp className="w-3 h-3" /> Best Productivity Hours
                  </div>
                  {insights.bestHours.map(({ hour, rate }) => (
                    <div key={hour} className="text-xs text-gray-700">
                      {formatHour(hour)} - {formatHour(hour + 1)} <span className="font-semibold text-green-600">{rate}% success</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-red-600 mb-1">
                    <TrendingDown className="w-3 h-3" /> Lowest Productivity Hours
                  </div>
                  {insights.worstHours.map(({ hour, rate }) => (
                    <div key={hour} className="text-xs text-gray-700">
                      {formatHour(hour)} - {formatHour(hour + 1)} <span className="font-semibold text-red-500">{rate}% success</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800">
                No task history found yet. Schedule is based on smart defaults. Complete tasks over time and the AI will personalise recommendations.
              </p>
            </div>
          )}

          {/* Unschedulable tasks warning */}
          {unscheduled && unscheduled.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {unscheduled.length === 1
                  ? '1 task cannot fit within your configured available timeframe'
                  : `${unscheduled.length} tasks cannot fit within your configured available timeframe`}
              </div>
              <div className="space-y-1.5">
                {unscheduled.map(u => (
                  <div key={u.task.id} className="bg-white border border-red-100 rounded-lg px-3 py-2">
                    <p className="font-medium text-gray-900 text-sm truncate">{u.task.title}</p>
                    <p className="text-xs text-red-600 mt-0.5">{u.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">Tip: Reduce the estimated duration or expand your work hours in Settings.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule list */}
          {schedule.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="font-medium">No pending tasks to schedule!</p>
              <p className="text-sm mt-1">Add some tasks to see your AI schedule.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">AI Schedule</h3>
              {(() => {
                const today = new Date(); today.setHours(0,0,0,0);
                let lastDateKey = '';
                return schedule.map((item, idx) => {
                  const dayKey = item.scheduledDate.toDateString();
                  const showHeader = dayKey !== lastDateKey;
                  lastDateKey = dayKey;
                  const isToday = item.scheduledDate.getTime() === today.getTime();
                  const dateLabel = isToday
                    ? 'Today'
                    : item.scheduledDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <div key={item.task.id}>
                      {showHeader && (
                        <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider pt-1 pb-1 border-b border-indigo-100 mb-2">
                          {dateLabel}
                        </div>
                      )}
                      {(() => {
                        const outside = isOutsideTimeframe(item.startTime, item.endTime);
                        return (
                          <div className={`border rounded-xl p-4 flex items-start gap-4 transition-colors ${
                            outside
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 hover:border-indigo-300'
                          }`}>
                            {/* Index / warning icon */}
                            <div className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                              outside ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {outside ? <AlertCircle className="w-4 h-4" /> : idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 truncate">{item.task.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[item.task.priority] ?? ''}`}>
                                  Priority: {item.task.priority.charAt(0).toUpperCase() + item.task.priority.slice(1)}
                                </span>
                              </div>

                              {outside ? (
                                <p className="text-xs text-red-600 font-medium mt-1">
                                  This task cannot fit within your configured available timeframe.
                                </p>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{item.startTime} – {item.endTime}</span>
                                    <span className="mx-1">·</span>
                                    <span>{item.durationMins} min</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{item.reason}</p>
                                </>
                              )}
                            </div>

                            {/* Confidence bar — hidden for out-of-timeframe tasks */}
                            {!outside && (
                              <div className="flex-shrink-0 text-right">
                                <div className={`text-sm font-bold ${confidenceColor(item.confidence)}`}>
                                  {item.confidence}%
                                </div>
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${confidenceBg(item.confidence)}`}
                                    style={{ width: `${item.confidence}%` }}
                                  />
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">confidence</div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Generated at {generatedAt.toLocaleTimeString()}</span>
          <button
            onClick={handleClose}
            data-tour="ai-schedule-reminder-continue"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIScheduleModal;
