import React from 'react';
import { ArrowLeft, Clock, Sun, Coffee, Plus } from 'lucide-react';
import { DayColumn, Lesson } from '../types';
import { periodDefinitions } from '../data/timetableData';

interface SingleDayTimetableProps {
  day: DayColumn;
  dayLessons: Lesson[];
  selectedPeriod: {
    session: 'morning' | 'afternoon';
    period: number;
  };
  onSelectPeriod: (session: 'morning' | 'afternoon', period: number) => void;
  onBackToWeek: () => void;
  allDays: DayColumn[];
  onSelectDay: (dayIndex: number) => void;
}

export const SingleDayTimetable: React.FC<SingleDayTimetableProps> = ({
  day,
  dayLessons,
  selectedPeriod,
  onSelectPeriod,
  onBackToWeek,
  allDays,
  onSelectDay,
}) => {
  const getLesson = (session: 'morning' | 'afternoon', period: number) => {
    return dayLessons.find((l) => l.session === session && l.period === period);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm flex flex-col h-full overflow-hidden transition-all duration-200">
      {/* Top Header of the Day Column */}
      <div className="p-2 sm:p-3.5 border-b border-gray-200 bg-[#f8fbf8] flex flex-col gap-1.5 sm:gap-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToWeek}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
            title="Quay lại bảng lịch cả tuần"
          >
            <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Xem cả tuần</span>
            <span className="sm:hidden">Cả tuần</span>
          </button>

          <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Lịch ngày
          </span>
        </div>

        {/* Day Header with quick switcher between days */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-0.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight leading-none">
              {day.dayTitle}
            </h3>
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5">
              {day.dateStr}
            </div>
          </div>

          {/* Quick day switcher chips */}
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none py-0.5">
            {allDays.map((d) => {
              const isCur = d.dayIndex === day.dayIndex;
              return (
                <button
                  key={d.dayIndex}
                  onClick={() => onSelectDay(d.dayIndex)}
                  title={`${d.dayTitle} (${d.dateStr})`}
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    isCur
                      ? 'bg-[#183f2a] text-white shadow-2xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {d.dayIndex === 7 ? 'CN' : `T${d.dayIndex + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List of Periods for this Day */}
      <div className="flex-1 overflow-y-auto p-1.5 sm:p-3 space-y-2.5 sm:space-y-3.5">
        {/* BUỔI SÁNG */}
        <div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 px-0.5 sm:px-1">
            <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Buổi sáng (Tiết 1 – 5)</span>
            <span className="sm:hidden">Sáng (1-5)</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {periodDefinitions.morning.map((pDef) => {
              const lesson = getLesson('morning', pDef.period);
              const isSelected =
                selectedPeriod.session === 'morning' &&
                selectedPeriod.period === pDef.period;

              return (
                <div
                  key={`morning-${pDef.period}`}
                  onClick={() => onSelectPeriod('morning', pDef.period)}
                  className={`p-1.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                      : lesson
                      ? 'bg-white border-gray-200/90 hover:border-gray-300 hover:shadow-2xs'
                      : 'bg-[#fafbfa] border-dashed border-gray-200 hover:border-indigo-300 hover:bg-white'
                  }`}
                >
                  {/* Top line of period: Label & Class/Time */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`text-[11px] sm:text-xs font-bold shrink-0 ${
                          isSelected ? 'text-indigo-900' : 'text-gray-800'
                        }`}
                      >
                        T{pDef.period}
                      </span>
                      {lesson?.className && (
                        <span className="text-[9px] sm:text-[10px] font-bold bg-[#183f2a] text-white px-1 sm:px-1.5 py-0.2 rounded shadow-2xs truncate">
                          {lesson.className}
                        </span>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{pDef.timeSlot}</span>
                    </div>
                  </div>

                  {/* Bottom line: Subject & Room */}
                  {lesson ? (
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        {/* On mobile: show only subject or compact name. Detail is in 70% panel */}
                        <div
                          className={`text-[10px] sm:text-xs font-semibold truncate ${
                            isSelected ? 'text-indigo-800' : 'text-gray-800'
                          }`}
                        >
                          <span className="sm:hidden">{lesson.subject || lesson.lessonName}</span>
                          <span className="hidden sm:inline">{lesson.lessonName || lesson.subject}</span>
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono shrink-0">
                        {lesson.room}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-400 italic">
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">(Trống - Nhấn để soạn)</span>
                      <span className="sm:hidden">Trống</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BUỔI CHIỀU */}
        <div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1.5 px-0.5 sm:px-1">
            <Coffee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Buổi chiều (Tiết 1 – 3)</span>
            <span className="sm:hidden">Chiều (1-3)</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {periodDefinitions.afternoon.map((pDef) => {
              const lesson = getLesson('afternoon', pDef.period);
              const isSelected =
                selectedPeriod.session === 'afternoon' &&
                selectedPeriod.period === pDef.period;

              return (
                <div
                  key={`afternoon-${pDef.period}`}
                  onClick={() => onSelectPeriod('afternoon', pDef.period)}
                  className={`p-1.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                      : lesson
                      ? 'bg-white border-gray-200/90 hover:border-gray-300 hover:shadow-2xs'
                      : 'bg-[#fafbfa] border-dashed border-gray-200 hover:border-indigo-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`text-[11px] sm:text-xs font-bold shrink-0 ${
                          isSelected ? 'text-indigo-900' : 'text-gray-800'
                        }`}
                      >
                        T{pDef.period}
                      </span>
                      {lesson?.className && (
                        <span className="text-[9px] sm:text-[10px] font-bold bg-[#183f2a] text-white px-1 sm:px-1.5 py-0.2 rounded shadow-2xs truncate">
                          {lesson.className}
                        </span>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{pDef.timeSlot}</span>
                    </div>
                  </div>

                  {lesson ? (
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <div
                          className={`text-[10px] sm:text-xs font-semibold truncate ${
                            isSelected ? 'text-indigo-800' : 'text-gray-800'
                          }`}
                        >
                          <span className="sm:hidden">{lesson.subject || lesson.lessonName}</span>
                          <span className="hidden sm:inline">{lesson.lessonName || lesson.subject}</span>
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono shrink-0">
                        {lesson.room}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-400 italic">
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">(Trống - Nhấn để soạn)</span>
                      <span className="sm:hidden">Trống</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
