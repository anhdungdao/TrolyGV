import React from 'react';
import { Calendar, Settings as SettingsIcon } from 'lucide-react';
import { WeekData, AppSettings } from '../types';

interface HeaderProps {
  weekData: WeekData;
  settings: AppSettings;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  weekData,
  settings,
  onOpenSettings,
}) => {
  return (
    <header className="bg-white border-b border-[#e2efe0] px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
      {/* Brand & Teacher/Subject Information */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1e4a31] text-white flex items-center justify-center font-bold text-lg shadow-2xs tracking-tight">
          Σ
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#183f2a] tracking-tight">
              EduPlan
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#edf7ec] text-[#1b5e20] border border-[#d2edd0]">
              {settings.subject || 'Toàn trường'}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            {settings.teacherName || 'Giáo viên'} • Năm học {settings.academicYear || '2025-2026'}
          </p>
        </div>
      </div>

      {/* Semester & Week Indicator */}
      <div className="hidden sm:flex items-center">
        <div className="inline-flex items-center gap-2 bg-[#edf7ec] border border-[#d2edd0] text-[#1d572e] px-4 py-1.5 rounded-full text-xs font-semibold shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#2e7d32]" />
          <span>
            {settings.semester || weekData.semester} • Tuần {weekData.weekNumber} ({weekData.startDate.slice(0, 5)} – {weekData.endDate.slice(0, 5)})
          </span>
        </div>
      </div>

      {/* Settings Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          title="Cài đặt hệ thống"
          className="px-3 py-2 text-xs font-semibold text-gray-700 hover:text-indigo-700 bg-gray-50 hover:bg-indigo-50 border border-gray-200/90 hover:border-indigo-300 rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
          <span>Cài đặt</span>
        </button>
      </div>
    </header>
  );
};
