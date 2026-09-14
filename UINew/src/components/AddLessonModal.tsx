import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, BookOpen, MapPin } from 'lucide-react';
import { Lesson, ClassName, LessonStatus } from '../types';
import { dayColumns, periodDefinitions } from '../data/timetableData';

interface AddLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newLesson: Lesson) => void;
  initialSlot?: { dayIndex: number; period: number } | null;
}

export const AddLessonModal: React.FC<AddLessonModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialSlot,
}) => {
  if (!isOpen) return null;

  const [dayIndex, setDayIndex] = useState(initialSlot?.dayIndex ?? 1);
  const [period, setPeriod] = useState(initialSlot?.period ?? 1);
  const [className, setClassName] = useState<ClassName>('12A1');
  const [subject, setSubject] = useState('Toán Giải Tích 12');
  const [lessonName, setLessonName] = useState('');
  const [room, setRoom] = useState('P.302');
  const [status, setStatus] = useState<LessonStatus>('upcoming');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedDay = dayColumns.find((d) => d.dayIndex === dayIndex);
    const allPeriods = [...periodDefinitions.morning, ...periodDefinitions.afternoon];
    const selectedPeriodDef = allPeriods.find((p) => p.period === period);

    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      dayIndex,
      dayName: selectedDay?.dayTitle || 'Thứ Hai',
      period,
      periodLabel: selectedPeriodDef?.label || `Tiết ${period}`,
      timeSlot: selectedPeriodDef?.timeSlot || '07:00-07:45',
      session: period >= 6 ? 'afternoon' : 'morning',
      className,
      subject,
      lessonName: lessonName.trim() || 'Bài học chuyên đề',
      room: room.trim() || 'P.302',
      status,
      badgeText: status === 'exam' ? 'KT 15p' : status === 'meeting' ? 'Chuyên môn' : 'Sắp tới',
    };

    onAdd(newLesson);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#1b4a2f]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">
                Thêm Tiết Dạy Mới
              </h3>
              <p className="text-xs text-gray-500">
                Lên lịch dạy bù, phụ đạo hoặc kiểm tra
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Thứ trong tuần
              </label>
              <select
                value={dayIndex}
                onChange={(e) => setDayIndex(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-medium"
              >
                {dayColumns.map((day) => (
                  <option key={day.dayIndex} value={day.dayIndex}>
                    {day.dayTitle} ({day.dateStr})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Tiết học
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-medium"
              >
                {[...periodDefinitions.morning, ...periodDefinitions.afternoon].map((p) => (
                  <option key={p.period} value={p.period}>
                    {p.label} ({p.timeSlot})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Lớp học
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="VD: 12A1, 11B2..."
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Phòng học
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="VD: P.302, P.204..."
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-mono font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Phân môn / Tên môn học
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="VD: Toán Giải Tích 12, Toán Đại Số 11..."
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Tên bài dạy / Chuyên đề
            </label>
            <input
              type="text"
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              placeholder="VD: Khảo sát đồ thị hàm số, Bất PT bậc hai..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Tính chất tiết học
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('upcoming')}
                className={`p-2 rounded-xl border text-center font-medium transition-all ${
                  status === 'upcoming'
                    ? 'bg-[#1b4a2f] text-white border-[#1b4a2f]'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Tiết chuẩn
              </button>
              <button
                type="button"
                onClick={() => setStatus('exam')}
                className={`p-2 rounded-xl border text-center font-medium transition-all ${
                  status === 'exam'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Kiểm tra 15p
              </button>
              <button
                type="button"
                onClick={() => setStatus('meeting')}
                className={`p-2 rounded-xl border text-center font-medium transition-all ${
                  status === 'meeting'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Chuyên môn
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1b4a2f] hover:bg-[#133c23] text-white font-semibold rounded-xl shadow-xs"
            >
              Lưu vào TKB
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
