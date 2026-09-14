import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  FileText,
  HelpCircle,
  Edit3,
  Save,
} from 'lucide-react';
import { Lesson } from '../types';

interface LessonDetailModalProps {
  lesson: Lesson | null;
  onClose: () => void;
  onUpdateLesson: (updated: Lesson) => void;
  onAskAIWithContext: (prompt: string, lesson: Lesson) => void;
}

export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({
  lesson,
  onClose,
  onUpdateLesson,
  onAskAIWithContext,
}) => {
  if (!lesson) return null;

  const [activeTab, setActiveTab] = useState<'plan' | 'attendance' | 'notes'>('plan');
  const [isEditing, setIsEditing] = useState(false);
  const [editedLessonName, setEditedLessonName] = useState(lesson.lessonName);
  const [editedRoom, setEditedRoom] = useState(lesson.room);
  const [editedNotes, setEditedNotes] = useState(lesson.notes || '');
  const [attendanceCount, setAttendanceCount] = useState({
    present: 42,
    absentExcused: 1,
    absentUnexcused: 0,
  });

  const handleSave = () => {
    onUpdateLesson({
      ...lesson,
      lessonName: editedLessonName,
      room: editedRoom,
      notes: editedNotes,
    });
    setIsEditing(false);
  };

  const toggleStatusDone = () => {
    const nextStatus = lesson.status === 'passed' ? 'upcoming' : 'passed';
    onUpdateLesson({
      ...lesson,
      status: nextStatus,
      isDone: nextStatus === 'passed',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between gap-3 bg-[#fbfdfa]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1b4a2f] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {lesson.className.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Lớp {lesson.className}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {lesson.periodLabel}
                </span>
                {lesson.curriculumWeek && (
                  <span className="text-[11px] text-gray-500 font-medium">
                    Tiết PPCT: {lesson.periodIndexInCurriculum || 'N/A'}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                {lesson.subject}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleStatusDone}
              title={lesson.status === 'passed' ? 'Đánh dấu chưa dạy' : 'Đánh dấu đã dạy xong'}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                lesson.status === 'passed'
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lesson.status === 'passed' ? 'Đã hoàn thành' : 'Đánh dấu xong'}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata info strip */}
        <div className="px-5 py-2.5 bg-[#f4faf2] border-b border-[#e2efe0] flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-medium text-gray-800">{lesson.dayName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>{lesson.timeSlot}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-mono font-medium">{lesson.room}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] font-semibold text-emerald-800">
              Trạng thái: {lesson.badgeText || (lesson.status === 'passed' ? 'Đã dạy' : 'Sắp tới')}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('plan')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'plan'
                ? 'border-[#1b4a2f] text-[#1b4a2f]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kế hoạch bài dạy (Giáo án)</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'attendance'
                ? 'border-[#1b4a2f] text-[#1b4a2f]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sổ đầu bài & Điểm danh</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'notes'
                ? 'border-[#1b4a2f] text-[#1b4a2f]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ghi chú giảng dạy</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'plan' && (
            <div className="space-y-4">
              {/* Lesson Name Field */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wider">
                    Bài dạy / Chuyên đề
                  </span>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-emerald-700 hover:underline flex items-center gap-1 text-xs font-medium cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Chỉnh sửa
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      className="text-emerald-700 hover:underline flex items-center gap-1 text-xs font-bold cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Lưu thay đổi
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <input
                      type="text"
                      value={editedLessonName}
                      onChange={(e) => setEditedLessonName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 font-semibold text-sm"
                      placeholder="Tên bài dạy..."
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedRoom}
                        onChange={(e) => setEditedRoom(e.target.value)}
                        className="w-32 bg-white border border-gray-300 rounded-lg p-1.5 text-xs font-mono"
                        placeholder="Phòng học..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="font-bold text-gray-900 text-sm">
                    {lesson.lessonName || 'Chưa đặt tên bài'}
                  </div>
                )}
              </div>

              {/* Objectives & Activities */}
              <div className="space-y-3">
                <div className="border border-[#e4eae3] rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-gray-800 text-xs flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    Mục tiêu cần đạt (Theo CV 5512)
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1 leading-relaxed">
                    {lesson.lessonPlanOutline?.objectives?.map((item, i) => (
                      <li key={i}>{item}</li>
                    )) || (
                      <>
                        <li>Nắm vững kiến thức trọng tâm của bài {lesson.lessonName}</li>
                        <li>Rèn luyện kỹ năng giải toán và suy luận logic cho học sinh khối {lesson.className.slice(0, 2)}</li>
                        <li>Phát triển năng lực mô hình hóa toán học và giải quyết vấn đề</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="border border-[#e4eae3] rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-gray-800 text-xs flex items-center gap-1.5 mb-2">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Bài tập củng cố & Nhiệm vụ về nhà
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1 leading-relaxed">
                    {lesson.lessonPlanOutline?.homework?.map((hw, i) => (
                      <li key={i}>{hw}</li>
                    )) || (
                      <>
                        <li>Hoàn thành các bài tập trong SGK liên quan đến {lesson.lessonName}</li>
                        <li>Luyện tập phiếu bài tập trắc nghiệm trực tuyến trên hệ thống quản lý học tập</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* AI Quick Actions Bar */}
              <div className="bg-[#edf7ec] border border-[#cfebd0] rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Trợ Giảng AI Sư Phạm (Hỗ trợ Thầy An)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      onAskAIWithContext(
                        `Thầy cần soạn Kế hoạch bài dạy chuẩn Công văn 5512 cho bài: "${lesson.lessonName}" môn ${lesson.subject} lớp ${lesson.className}. Hãy chia rõ 4 hoạt động: Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng.`,
                        lesson
                      )
                    }
                    className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg transition-all shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡ Soạn giáo án 5512</span>
                  </button>
                  <button
                    onClick={() =>
                      onAskAIWithContext(
                        `Biên soạn cho thầy đề kiểm tra 15 phút (gồm 2 câu trắc nghiệm 4 lựa chọn, 1 câu trắc nghiệm đúng/sai và 1 câu trả lời ngắn) cho bài "${lesson.lessonName}" môn ${lesson.subject}.`,
                        lesson
                      )
                    }
                    className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg transition-all shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡ Tạo đề KT 15 phút</span>
                  </button>
                  <button
                    onClick={() =>
                      onAskAIWithContext(
                        `Gợi ý cho thầy 2 bài toán thực tế sinh động liên quan đến chủ đề "${lesson.lessonName}" để gây hứng thú cho học sinh lớp ${lesson.className}.`,
                        lesson
                      )
                    }
                    className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg transition-all shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡ Gợi ý ứng dụng thực tế</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-emerald-800">
                    {attendanceCount.present}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Có mặt
                  </div>
                </div>
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-amber-800">
                    {attendanceCount.absentExcused}
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                    Vắng có phép
                  </div>
                </div>
                <div className="bg-red-50/70 border border-red-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-red-800">
                    {attendanceCount.absentUnexcused}
                  </div>
                  <div className="text-[11px] text-red-700 font-medium mt-0.5">
                    Vắng không phép
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-2.5">
                <div className="font-bold text-gray-800">Đánh giá tiết học (Sổ đầu bài)</div>
                <div className="flex gap-2">
                  {['Tiết Tốt (Điểm A)', 'Tiết Khá (Điểm B)', 'Tiết Trung Bình'].map((grade, idx) => (
                    <button
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs border transition-colors ${
                        idx === 0
                          ? 'bg-[#1b4a2f] text-white border-[#1b4a2f]'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <label className="block font-semibold text-gray-700 text-xs">
                Ghi chú riêng của giáo viên cho tiết dạy:
              </label>
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={5}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none leading-relaxed"
                placeholder="Nhập nhận xét về học sinh, bài tập cần sửa thêm trong tiết sau..."
              />
              <button
                onClick={handleSave}
                className="bg-[#1b4a2f] hover:bg-[#153a25] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Lưu ghi chú
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-[#fbfdfa] flex items-center justify-between">
          <div className="text-[11px] text-gray-500 font-medium">
            Môn Toán • THPT Chuyên Lê Hồng Phong
          </div>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
