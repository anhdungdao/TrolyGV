import React from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { WeekData } from '../types';

interface FilterBarProps {
  weekData: WeekData;
  selectedClass: string;
  onSelectClass: (className: string) => void;
  classList: string[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  weekData,
  selectedClass,
  onSelectClass,
  classList,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
}) => {
  return (
    <div className="bg-white border border-[#e2efe0] rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs mb-3.5 transition-all">
      {/* Week Navigator */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <button
            onClick={onPrevWeek}
            title="Tuần trước"
            className="p-1.5 px-2 hover:bg-gray-100 text-gray-600 transition-colors border-r border-gray-100 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-xs font-bold text-gray-800 tracking-tight whitespace-nowrap">
            {weekData.formattedRange}
          </span>
          <button
            onClick={onNextWeek}
            title="Tuần sau"
            className="p-1.5 px-2 hover:bg-gray-100 text-gray-600 transition-colors border-l border-gray-100 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onCurrentWeek}
          className="bg-[#d2f3b3] hover:bg-[#c4ec9e] text-[#1e4e2b] font-semibold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          Hôm nay
        </button>
      </div>

      {/* Class Filters */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full pb-0.5 sm:pb-0 scrollbar-none">
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 mr-1 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
          <span className="hidden sm:inline">Lớp:</span>
        </div>
        {classList.map((cls) => {
          const isActive = selectedClass === cls;
          return (
            <button
              key={cls}
              onClick={() => onSelectClass(cls)}
              className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#183f2a] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {cls}
            </button>
          );
        })}
      </div>
    </div>
  );
};
