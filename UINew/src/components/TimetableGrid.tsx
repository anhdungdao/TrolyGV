import React, { useRef, useState, useEffect } from 'react';
import { Clock, Sun, Coffee, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { PeriodCard } from './PeriodCard';
import { DayColumn, Lesson } from '../types';
import { periodDefinitions } from '../data/timetableData';

interface TimetableGridProps {
  dayColumns: DayColumn[];
  lessons: Lesson[];
  selectedClass: string;
  onSelectSlot: (
    dayIndex: number,
    session: 'morning' | 'afternoon',
    period: number
  ) => void;
  activeSlot: {
    dayIndex: number;
    session: 'morning' | 'afternoon';
    period: number;
  } | null;
  isCompact?: boolean;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  dayColumns,
  lessons,
  selectedClass,
  onSelectSlot,
  activeSlot,
  isCompact = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeVisibleDay, setActiveVisibleDay] = useState<number>(() => {
    const today = dayColumns.find((d) => d.isToday);
    return today ? today.dayIndex : dayColumns[0]?.dayIndex ?? 1;
  });

  const getLesson = (
    dayIndex: number,
    session: 'morning' | 'afternoon',
    period: number
  ): Lesson | undefined => {
    return lessons.find(
      (l) => l.dayIndex === dayIndex && l.session === session && l.period === period
    );
  };

  const isClassMatch = (lesson: Lesson): boolean => {
    if (selectedClass === 'Tất cả') return true;
    return (
      lesson.className === selectedClass ||
      lesson.className.startsWith(selectedClass)
    );
  };

  const isSlotSelected = (dayIndex: number, session: 'morning' | 'afternoon', period: number) => {
    return (
      activeSlot?.dayIndex === dayIndex &&
      activeSlot?.session === session &&
      activeSlot?.period === period
    );
  };

  // Scroll smoothly to a specific day column on mobile
  const scrollToDay = (dayIndex: number) => {
    setActiveVisibleDay(dayIndex);
    if (!scrollContainerRef.current) return;
    const dayHeader = scrollContainerRef.current.querySelector(
      `[data-day-col="${dayIndex}"]`
    ) as HTMLElement | null;
    if (dayHeader) {
      // Calculate offset taking into account the sticky column
      const stickyColWidth = window.innerWidth < 640 ? 54 : 110;
      const left = dayHeader.offsetLeft - stickyColWidth;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, left),
        behavior: 'smooth',
      });
    }
  };

  // Listen to scroll to update current visible day dot on mobile
  const handleScroll = () => {
    if (!scrollContainerRef.current || window.innerWidth >= 1024) return;
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const stickyColWidth = window.innerWidth < 640 ? 54 : 110;

    for (let i = 0; i < dayColumns.length; i++) {
      const col = container.querySelector(
        `[data-day-col="${dayColumns[i].dayIndex}"]`
      ) as HTMLElement | null;
      if (col) {
        const colLeft = col.offsetLeft - stickyColWidth;
        const colWidth = col.offsetWidth;
        if (scrollLeft >= colLeft - 20 && scrollLeft < colLeft + colWidth - 20) {
          setActiveVisibleDay(dayColumns[i].dayIndex);
          break;
        }
      }
    }
  };

  // Initial scroll to today on mobile
  useEffect(() => {
    const today = dayColumns.find((d) => d.isToday);
    if (today && window.innerWidth < 768) {
      setTimeout(() => {
        scrollToDay(today.dayIndex);
      }, 100);
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#e2efe0] overflow-hidden shadow-xs transition-all duration-300 flex flex-col">
      {/* MOBILE QUICK DAY SELECTOR (Phương án C: Giúp chuyển ngày ngay tức thì và chỉ báo vị trí) */}
      <div className="lg:hidden border-b border-[#e2efe0] bg-[#f8fbf7] px-2 py-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 flex-1">
          {dayColumns.map((day) => {
            const isCur = activeVisibleDay === day.dayIndex;
            return (
              <button
                key={day.dayIndex}
                onClick={() => scrollToDay(day.dayIndex)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  isCur
                    ? 'bg-[#183f2a] text-white shadow-2xs scale-102'
                    : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 bg-white border border-gray-200/80'
                }`}
              >
                <span>{day.dayIndex === 7 ? 'CN' : `T${day.dayIndex + 1}`}</span>
                {day.isToday && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCur ? 'bg-[#7df38a]' : 'bg-emerald-600'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-gray-400 font-medium shrink-0 pl-1 flex items-center gap-0.5">
          <span>Vuốt ngang</span>
          <ChevronRight className="w-3 h-3 text-gray-400" />
        </div>
      </div>

      {/* HORIZONTAL SCROLL WITH FIXED TIẾT COLUMN */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-x-auto relative scrollbar-thin scroll-smooth snap-x snap-mandatory"
      >
        <table className="w-full border-collapse text-left min-w-[700px] sm:min-w-[850px] lg:min-w-[980px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-[#e2efe0] bg-[#fafdfa]">
              {/* STICKY TIẾT COLUMN HEADER */}
              <th
                className="sticky left-0 z-20 w-[54px] sm:w-[90px] lg:w-[110px] py-2.5 sm:py-3 px-1 sm:px-2 text-center border-r border-[#e2efe0] bg-[#f7fbf6] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold text-gray-700 tracking-wider">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                  <span>TIẾT</span>
                </div>
              </th>

              {/* Day Headers */}
              {dayColumns.map((day) => {
                const isHighlighted = day.isToday;
                const isPassed = day.isPassed;
                const isDayOfActiveSlot = activeSlot?.dayIndex === day.dayIndex;
                const isCurrentVisible = activeVisibleDay === day.dayIndex;

                return (
                  <th
                    key={day.dayIndex}
                    data-day-col={day.dayIndex}
                    className={`snap-start min-w-[125px] sm:min-w-[140px] py-2 sm:py-2.5 px-1.5 text-center border-r last:border-r-0 border-[#e8f1e6] transition-colors ${
                      isDayOfActiveSlot
                        ? 'bg-indigo-50/80 border-b-2 border-b-indigo-500'
                        : isHighlighted
                        ? 'bg-[#edf8f1] border-b-2 border-b-emerald-600'
                        : isCurrentVisible
                        ? 'bg-emerald-50/40'
                        : isPassed
                        ? 'bg-[#fafbfa]'
                        : 'bg-[#fafdfa]'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className={`text-xs sm:text-[13px] font-bold flex items-center gap-1 ${
                          isDayOfActiveSlot
                            ? 'text-indigo-900'
                            : isHighlighted
                            ? 'text-[#18482b]'
                            : isPassed
                            ? 'text-gray-500'
                            : 'text-gray-800'
                        }`}
                      >
                        <span>{day.dateStr}</span>
                        {day.isToday && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-1 py-0.2 rounded">
                            Nay
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[10px] sm:text-xs mt-0.5 font-medium ${
                          isDayOfActiveSlot
                            ? 'text-indigo-600 font-semibold'
                            : isHighlighted
                            ? 'text-[#205739] font-semibold'
                            : isPassed
                            ? 'text-gray-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {day.dayTitle}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* SECTION 1: BUỔI SÁNG (5 TIẾT) */}
            <tr className="bg-[#f5faf3] border-y border-[#dfeedb]">
              <td
                colSpan={7}
                className="py-1 px-2 sm:px-3 text-[10px] sm:text-xs font-bold text-[#1f502f] tracking-wide sticky left-0 z-10"
              >
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                  <span>BUỔI SÁNG (TIẾT 1 – 5)</span>
                </div>
              </td>
            </tr>

            {/* Morning Rows (1 to 5) */}
            {periodDefinitions.morning.map((periodDef) => (
              <tr
                key={`morning-${periodDef.period}`}
                className="border-b border-[#eaf2e8] hover:bg-[#fbfdfa]/50 transition-colors"
              >
                {/* FIXED STICKY PERIOD TIME COLUMN */}
                <td className="sticky left-0 z-10 p-1.5 sm:p-2.5 text-center border-r border-[#e2efe0] bg-[#fbfdfa] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] align-middle">
                  <div className="font-bold text-[11px] sm:text-xs text-gray-800">
                    <span className="sm:hidden">T{periodDef.period}</span>
                    <span className="hidden sm:inline">{periodDef.label}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-500 font-mono mt-0.5 leading-tight">
                    <span className="sm:hidden">
                      {periodDef.timeSlot.split(' - ')[0]}
                    </span>
                    <span className="hidden sm:inline">{periodDef.timeSlot}</span>
                  </div>
                </td>

                {/* Day Cells */}
                {dayColumns.map((day) => {
                  const lesson = getLesson(day.dayIndex, 'morning', periodDef.period);
                  const isFiltered = lesson ? !isClassMatch(lesson) : false;
                  const isSelected = isSlotSelected(day.dayIndex, 'morning', periodDef.period);

                  return (
                    <td
                      key={`morning-${day.dayIndex}-${periodDef.period}`}
                      data-day-col={day.dayIndex}
                      className={`snap-start p-1 sm:p-1.5 align-top border-r last:border-r-0 border-[#eaf2e8] h-full transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : day.isToday
                          ? 'bg-[#f4fbf5]/40'
                          : day.isPassed
                          ? 'bg-[#fafbfa]/50'
                          : 'bg-white'
                      }`}
                    >
                      {lesson ? (
                        <PeriodCard
                          lesson={lesson}
                          onSelect={() =>
                            onSelectSlot(day.dayIndex, 'morning', periodDef.period)
                          }
                          isFilteredOut={isFiltered}
                          isSelectedInSplitView={isSelected}
                        />
                      ) : (
                        <div
                          onClick={() =>
                            onSelectSlot(day.dayIndex, 'morning', periodDef.period)
                          }
                          className={`h-full min-h-[64px] sm:min-h-[86px] rounded-xl border border-dashed flex flex-col items-center justify-center p-1.5 sm:p-2 transition-all cursor-pointer group ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50/80 shadow-xs'
                              : 'border-[#dfe8dc] bg-[#fafcf9] hover:border-indigo-300 hover:bg-indigo-50/30'
                          }`}
                          title="Tiết trống - Nhấn để soạn giáo án"
                        >
                          <Plus
                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${
                              isSelected
                                ? 'text-indigo-600 scale-110'
                                : 'text-indigo-400 group-hover:scale-110'
                            }`}
                          />
                          <span
                            className={`text-[9px] sm:text-[10px] mt-0.5 font-medium ${
                              isSelected
                                ? 'text-indigo-700 font-bold'
                                : 'text-gray-400 group-hover:text-indigo-600'
                            }`}
                          >
                            {isSelected ? 'Đang chọn' : 'Trống'}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* SECTION 2: BUỔI CHIỀU (3 TIẾT) */}
            <tr className="bg-[#f5faf3] border-y border-[#dfeedb]">
              <td
                colSpan={7}
                className="py-1 px-2 sm:px-3 text-[10px] sm:text-xs font-bold text-[#1f502f] tracking-wide sticky left-0 z-10"
              >
                <div className="flex items-center gap-1.5">
                  <Coffee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                  <span>BUỔI CHIỀU (TIẾT 1 – 3)</span>
                </div>
              </td>
            </tr>

            {/* Afternoon Rows (1 to 3) */}
            {periodDefinitions.afternoon.map((periodDef) => (
              <tr
                key={`afternoon-${periodDef.period}`}
                className="border-b border-[#eaf2e8] hover:bg-[#fbfdfa]/50 transition-colors"
              >
                {/* FIXED STICKY PERIOD TIME COLUMN */}
                <td className="sticky left-0 z-10 p-1.5 sm:p-2.5 text-center border-r border-[#e2efe0] bg-[#fbfdfa] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] align-middle">
                  <div className="font-bold text-[11px] sm:text-xs text-gray-800">
                    <span className="sm:hidden">C{periodDef.period}</span>
                    <span className="hidden sm:inline">{periodDef.label} (Chiều)</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-500 font-mono mt-0.5 leading-tight">
                    <span className="sm:hidden">
                      {periodDef.timeSlot.split(' - ')[0]}
                    </span>
                    <span className="hidden sm:inline">{periodDef.timeSlot}</span>
                  </div>
                </td>

                {/* Day Cells */}
                {dayColumns.map((day) => {
                  const lesson = getLesson(day.dayIndex, 'afternoon', periodDef.period);
                  const isFiltered = lesson ? !isClassMatch(lesson) : false;
                  const isSelected = isSlotSelected(day.dayIndex, 'afternoon', periodDef.period);

                  return (
                    <td
                      key={`afternoon-${day.dayIndex}-${periodDef.period}`}
                      data-day-col={day.dayIndex}
                      className={`snap-start p-1 sm:p-1.5 align-top border-r last:border-r-0 border-[#eaf2e8] h-full transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : day.isToday
                          ? 'bg-[#f4fbf5]/40'
                          : day.isPassed
                          ? 'bg-[#fafbfa]/50'
                          : 'bg-white'
                      }`}
                    >
                      {lesson ? (
                        <PeriodCard
                          lesson={lesson}
                          onSelect={() =>
                            onSelectSlot(day.dayIndex, 'afternoon', periodDef.period)
                          }
                          isFilteredOut={isFiltered}
                          isSelectedInSplitView={isSelected}
                        />
                      ) : (
                        <div
                          onClick={() =>
                            onSelectSlot(day.dayIndex, 'afternoon', periodDef.period)
                          }
                          className={`h-full min-h-[64px] sm:min-h-[86px] rounded-xl border border-dashed flex flex-col items-center justify-center p-1.5 sm:p-2 transition-all cursor-pointer group ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50/80 shadow-xs'
                              : 'border-[#dfe8dc] bg-[#fafcf9] hover:border-indigo-300 hover:bg-indigo-50/30'
                          }`}
                          title="Tiết trống - Nhấn để soạn giáo án"
                        >
                          <Plus
                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${
                              isSelected
                                ? 'text-indigo-600 scale-110'
                                : 'text-indigo-400 group-hover:scale-110'
                            }`}
                          />
                          <span
                            className={`text-[9px] sm:text-[10px] mt-0.5 font-medium ${
                              isSelected
                                ? 'text-indigo-700 font-bold'
                                : 'text-gray-400 group-hover:text-indigo-600'
                            }`}
                          >
                            {isSelected ? 'Đang chọn' : 'Trống'}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
