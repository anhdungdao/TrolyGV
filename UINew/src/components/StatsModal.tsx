import React from 'react';
import { X, Award, PieChart, CheckCircle, Clock } from 'lucide-react';
import { WeekData, Lesson } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekData: WeekData;
  lessons: Lesson[];
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  weekData,
  lessons,
}) => {
  if (!isOpen) return null;

  // Breakdown by grade
  const gradeBreakdown = [
    { grade: 'Khối 12', count: 8, classes: '12A1 (5 tiết), 12A3 (3 tiết)', color: 'bg-emerald-600' },
    { grade: 'Khối 11', count: 4, classes: '11B2 (4 tiết)', color: 'bg-teal-600' },
    { grade: 'Khối 10', count: 2, classes: '10A2 (2 tiết)', color: 'bg-green-600' },
    { grade: 'Bồi dưỡng HSG', count: 2, classes: 'HSG 12 (2 tiết)', color: 'bg-amber-600' },
  ];

  const total = weekData.totalPeriods;
  const completed = weekData.completedPeriods;
  const completionRate = Math.round((completed / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#1b4a2f]">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">
                Thống Kê Tiến Độ Giảng Dạy
              </h3>
              <p className="text-xs text-gray-500">
                {weekData.semester} • Tuần {weekData.weekNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-[#f5faf3] border border-[#d2edd0] rounded-xl p-3 text-center">
            <div className="text-xs text-gray-600 font-medium">Tổng số tiết</div>
            <div className="text-2xl font-bold text-[#1b4a2f] mt-0.5">
              {weekData.totalPeriods}
            </div>
            <div className="text-[10px] text-gray-500">tiết / tuần</div>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
            <div className="text-xs text-emerald-800 font-medium">Đã giảng dạy</div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">
              {weekData.completedPeriods}
            </div>
            <div className="text-[10px] text-emerald-600">tiết hoàn thành</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-600 font-medium">Còn lại</div>
            <div className="text-2xl font-bold text-gray-800 mt-0.5">
              {weekData.remainingPeriods}
            </div>
            <div className="text-[10px] text-gray-500">tiết trong tuần</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-gray-700">Tiến độ tuần hiện tại:</span>
            <span className="text-emerald-700">{completionRate}% ({completed}/{total} tiết)</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Breakdown by Grade */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Phân bổ tiết dạy theo khối:
          </h4>
          <div className="space-y-2">
            {gradeBreakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
              >
                <div>
                  <div className="font-bold text-gray-800">{item.grade}</div>
                  <div className="text-[11px] text-gray-500">{item.classes}</div>
                </div>
                <span className="font-bold text-gray-800 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  {item.count} tiết
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-[#edf7ec] rounded-xl text-xs text-[#1e4e2b] flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Định mức chuẩn giáo viên THPT: 16-17 tiết/tuần. Thầy Nguyễn Văn An hiện đang đạt chuẩn phân công chuyên môn.
          </span>
        </div>
      </div>
    </div>
  );
};
