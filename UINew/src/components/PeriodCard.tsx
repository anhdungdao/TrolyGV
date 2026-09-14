import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Lesson } from '../types';

interface PeriodCardProps {
  lesson: Lesson;
  onSelect: (lesson: Lesson) => void;
  isFilteredOut?: boolean;
  isSelectedInSplitView?: boolean;
}

export const PeriodCard: React.FC<PeriodCardProps> = ({
  lesson,
  onSelect,
  isFilteredOut = false,
  isSelectedInSplitView = false,
}) => {
  const { status, className, subject, lessonName, room, badgeText } = lesson;

  // Visual container based on status
  let containerClasses = '';
  let isDarkActive = false;

  if (status === 'active') {
    isDarkActive = true;
    containerClasses =
      'bg-[#1b4a2f] border border-[#143d25] text-white shadow-sm ring-1 ring-emerald-600/30';
  } else if (status === 'passed') {
    containerClasses =
      'bg-[#f8faf8] border border-[#e4eae3] text-gray-500 hover:bg-white hover:border-gray-300';
  } else if (status === 'exam') {
    containerClasses =
      'bg-white border border-[#fcd8c4] hover:border-[#f97316] shadow-2xs hover:shadow-xs';
  } else {
    containerClasses =
      'bg-white border border-[#e1ece1] hover:border-emerald-400 shadow-2xs hover:shadow-xs';
  }

  return (
    <div
      onClick={() => onSelect(lesson)}
      className={`relative rounded-xl p-1.5 sm:p-2.5 transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-h-[64px] sm:min-h-[86px] ${containerClasses} ${
        isFilteredOut ? 'opacity-25 grayscale pointer-events-none' : 'opacity-100'
      } ${
        isSelectedInSplitView
          ? 'ring-2 ring-indigo-500 ring-offset-2 scale-[1.02] shadow-md border-indigo-400'
          : ''
      }`}
    >
      {/* Top Header in Card */}
      <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
        {/* Class Badge: Compact on mobile, standard on sm */}
        {isDarkActive ? (
          <span className="bg-[#317751] text-white text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-2xs">
            {className}
          </span>
        ) : status === 'upcoming-today' ? (
          <span className="bg-[#1b4a2f] text-white text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-2xs">
            {className}
          </span>
        ) : status === 'passed' ? (
          <span className="text-gray-500 text-[9px] sm:text-[11px] font-bold tracking-tight">
            {className}
          </span>
        ) : status === 'exam' ? (
          <span className="text-[#1b4a2f] font-bold text-[9px] sm:text-[11px] bg-[#edf7ec] px-1.5 sm:px-2 py-0.5 rounded">
            {className}
          </span>
        ) : status === 'meeting' ? (
          <span className="text-[#1d39c4] font-bold text-[9px] sm:text-[11px] bg-[#f0f5ff] px-1.5 sm:px-2 py-0.5 rounded">
            {className}
          </span>
        ) : (
          <span className="text-[#1b4a2f] font-bold text-[9px] sm:text-[11px] bg-[#edf7ec] px-1.5 sm:px-2 py-0.5 rounded">
            {className}
          </span>
        )}

        {/* Right Status / Badge in Card: Hidden on mobile to avoid overcrowding */}
        {status === 'passed' && (
          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
        )}

        {isDarkActive && badgeText && (
          <span className="hidden sm:inline-block bg-white/20 text-white border border-white/30 text-[9px] sm:text-[10px] font-medium px-1.5 py-0.2 rounded-full backdrop-blur-xs whitespace-nowrap">
            {badgeText}
          </span>
        )}

        {status === 'upcoming-today' && badgeText && (
          <span className="hidden sm:inline-block text-[10px] sm:text-[11px] font-semibold text-gray-500 whitespace-nowrap">
            {badgeText}
          </span>
        )}

        {status === 'exam' && badgeText && (
          <span className="hidden sm:inline-block bg-[#fff2e8] text-[#d4380d] border border-[#ffbb96] text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded whitespace-nowrap">
            {badgeText}
          </span>
        )}

        {status === 'meeting' && badgeText && (
          <span className="hidden sm:inline-block bg-[#f0f5ff] text-[#1d39c4] border border-[#adc6ff] text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded whitespace-nowrap">
            {badgeText}
          </span>
        )}

        {status === 'upcoming' && badgeText && (
          <span className="hidden sm:inline-block text-[9px] sm:text-[10px] text-gray-400 font-medium whitespace-nowrap">
            {badgeText}
          </span>
        )}
      </div>

      {/* Main Content: On mobile show Subject only; on desktop show full lesson title */}
      <div className="my-0.5">
        <h4
          className={`text-[10px] sm:text-xs font-bold tracking-tight line-clamp-1 ${
            isDarkActive
              ? 'text-white'
              : status === 'passed'
              ? 'text-gray-600'
              : 'text-gray-900'
          }`}
        >
          {subject}
        </h4>

        {/* Detailed lesson name hidden on mobile, shown on tablet/desktop */}
        {lessonName && (
          <p
            className={`hidden sm:block text-[10px] sm:text-[11px] mt-0.5 line-clamp-1 ${
              isDarkActive
                ? 'text-[#c6e9d0]'
                : status === 'passed'
                ? 'text-gray-400'
                : 'text-gray-600'
            }`}
          >
            {lessonName}
          </p>
        )}
      </div>

      {/* Footer / Room */}
      <div className="flex items-center justify-between mt-0.5 sm:mt-1 pt-0.5">
        {isSelectedInSplitView ? (
          <span className="text-[8px] sm:text-[9px] font-bold text-indigo-600 uppercase tracking-wider">
            Mở
          </span>
        ) : (
          <span />
        )}
        <span
          className={`text-[9px] sm:text-[10px] font-medium ${
            isDarkActive
              ? 'bg-[#123620] text-[#a4d8b2] px-1 sm:px-1.5 py-0.2 rounded font-mono font-semibold'
              : status === 'passed'
              ? 'text-gray-400 font-mono'
              : 'text-gray-500 font-mono font-medium'
          }`}
        >
          {room}
        </span>
      </div>
    </div>
  );
};
