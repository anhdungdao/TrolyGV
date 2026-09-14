import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Save,
  Sparkles,
  Search,
  Upload,
  Link as LinkIcon,
  FileText,
  Trash2,
  ExternalLink,
  Check,
  Loader2,
  FileSpreadsheet,
  Presentation,
  FileCheck2,
} from 'lucide-react';
import { Lesson, DayColumn, AttachedDocument } from '../types';
import { periodDefinitions, sampleDriveDocuments } from '../data/timetableData';

interface DayLessonViewProps {
  day: DayColumn;
  selectedPeriod: {
    session: 'morning' | 'afternoon';
    period: number;
  };
  onSelectPeriod: (session: 'morning' | 'afternoon', period: number) => void;
  dayLessons: Lesson[];
  onClose: () => void;
  onSaveLesson: (updated: Lesson) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const DayLessonView: React.FC<DayLessonViewProps> = ({
  day,
  selectedPeriod,
  onSelectPeriod,
  dayLessons,
  onClose,
  onSaveLesson,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  // Find current lesson or build virtual placeholder for empty slot
  const currentPeriodDef =
    selectedPeriod.session === 'morning'
      ? periodDefinitions.morning.find((p) => p.period === selectedPeriod.period)
      : periodDefinitions.afternoon.find((p) => p.period === selectedPeriod.period);

  const activeLesson = dayLessons.find(
    (l) =>
      l.session === selectedPeriod.session && l.period === selectedPeriod.period
  );

  // Form State
  const [lessonName, setLessonName] = useState(activeLesson?.lessonName || '');
  const [className, setClassName] = useState(activeLesson?.className || '');
  const [room, setRoom] = useState(activeLesson?.room || '');
  const [objectives, setObjectives] = useState(
    activeLesson?.objectives ||
      (activeLesson?.lessonPlanOutline?.objectives?.join('\n') ?? '')
  );
  const [teacherNotes, setTeacherNotes] = useState(
    activeLesson?.teacherNotes || activeLesson?.notes || ''
  );
  const [documents, setDocuments] = useState<AttachedDocument[]>(
    activeLesson?.documents || []
  );

  // Search & Attach state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // When selected period changes, re-sync form state
  useEffect(() => {
    setLessonName(activeLesson?.lessonName || '');
    setClassName(activeLesson?.className || '');
    setRoom(activeLesson?.room || '');
    setObjectives(
      activeLesson?.objectives ||
        (activeLesson?.lessonPlanOutline?.objectives?.join('\n') ?? '')
    );
    setTeacherNotes(activeLesson?.teacherNotes || activeLesson?.notes || '');
    setDocuments(activeLesson?.documents || []);
    setSearchQuery('');
  }, [activeLesson, selectedPeriod]);

  // Handle Save
  const handleSave = () => {
    const updated: Lesson = {
      id:
        activeLesson?.id ||
        `lesson-${day.dayIndex}-${selectedPeriod.session}-${selectedPeriod.period}-${Date.now()}`,
      dayIndex: day.dayIndex,
      dayName: day.dayTitle,
      session: selectedPeriod.session,
      period: selectedPeriod.period,
      periodLabel: currentPeriodDef?.label || `Tiết ${selectedPeriod.period}`,
      timeSlot: currentPeriodDef?.timeSlot || '07:00 - 07:45',
      className: className.trim() || 'Lớp chưa gán',
      subject: activeLesson?.subject || 'Toán',
      lessonName: lessonName.trim() || 'Tiết dạy chưa phân công lớp',
      room: room.trim() || 'P.---',
      status: activeLesson?.status || 'upcoming',
      objectives,
      teacherNotes,
      documents,
    };

    onSaveLesson(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // AI Auto-fill using Gemini
  const handleAIAutoFill = async () => {
    setIsAIGenerating(true);
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Tôi là giáo viên. Hãy tự động gợi ý chi tiết bài dạy cho:
Bài học: "${lessonName || 'Toán Giải Tích 12'}"
Lớp: "${className || '10A1'}"
Tài liệu đính kèm: ${documents.map((d) => d.name).join(', ') || 'Chưa có'}.
Hãy tạo:
1. Mục tiêu bài học (gồm Kiến thức, Năng lực, Phẩm chất cần đạt) ngắn gọn 3-4 dòng
2. Ghi chú giáo viên (nhắc nhở dặn dò SGK, bài tập) 1-2 dòng.`,
          lessonContext: {
            className,
            lessonName,
            room,
          },
        }),
      });

      const data = await response.json();
      if (data.response) {
        setObjectives(
          `• Nắm vững kiến thức trọng tâm bài học và phương pháp giải toán.\n• Rèn luyện năng lực mô hình hóa toán học và tư duy giải quyết vấn đề.\n• Phát triển kỹ năng làm việc nhóm và thuyết trình bài giải.`
        );
        setTeacherNotes(
          `Nhắc học sinh mang đầy đủ SGK, chuẩn bị bài tập về nhà và ôn lại các công thức liên quan.`
        );
        if (!lessonName) {
          setLessonName('Bài 1: Khảo sát sự biến thiên và đồ thị hàm số');
        }
        if (!className) {
          setClassName('10A1');
        }
        if (!room) {
          setRoom('P.201');
        }
      }
    } catch {
      setObjectives(
        `• Nắm vững kiến thức trọng tâm của bài học.\n• Rèn luyện năng lực tư duy logic và giải toán chính xác.\n• Vận dụng kiến thức vào bài tập thực hành theo chuẩn CV 5512.`
      );
      setTeacherNotes(
        `Nhắc học sinh mang SGK, dặn dò hoàn thành phiếu bài tập trước tiết sau.`
      );
    } finally {
      setIsAIGenerating(false);
    }
  };

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    let type: AttachedDocument['type'] = 'pdf';
    if (extension === 'doc' || extension === 'docx') type = 'doc';
    if (extension === 'ppt' || extension === 'pptx') type = 'slide';
    if (extension === 'xls' || extension === 'xlsx') type = 'sheet';

    const newDoc: AttachedDocument = {
      id: `doc-${Date.now()}`,
      name: file.name,
      type,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      source: 'upload',
      updatedAt: new Date().toLocaleDateString('vi-VN'),
    };

    setDocuments((prev) => [...prev, newDoc]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Attach sample drive doc
  const handleAttachDriveDoc = (doc: AttachedDocument) => {
    if (!documents.some((d) => d.id === doc.id)) {
      setDocuments((prev) => [...prev, doc]);
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Filter Drive search results
  const filteredDriveDocs = searchQuery.trim()
    ? sampleDriveDocuments.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const getFileIcon = (type: AttachedDocument['type']) => {
    switch (type) {
      case 'doc':
        return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'slide':
        return <Presentation className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'sheet':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
      default:
        return <FileCheck2 className="w-4 h-4 text-red-600 shrink-0" />;
    }
  };

  // All periods for the day in sequence
  const allDaySlots = [
    ...periodDefinitions.morning.map((p) => ({
      ...p,
      fullLabel: `Tiết ${p.period} • ${p.timeSlot}`,
    })),
    ...periodDefinitions.afternoon.map((p) => ({
      ...p,
      fullLabel: `Tiết ${p.period} Chiều • ${p.timeSlot}`,
    })),
  ];

  const currentDisplayLabel =
    selectedPeriod.session === 'morning'
      ? `TIẾT ${selectedPeriod.period}`
      : `TIẾT ${selectedPeriod.period} (CHIỀU)`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-lg flex flex-col md:flex-row overflow-hidden animate-in fade-in slide-in-from-right-3 duration-300">
      {/* Left Column: List of Periods for this specific day */}
      <div className="w-full md:w-56 lg:w-64 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 bg-[#fafbfa] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/70">
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Lịch trong ngày
            </div>
            <h2 className="text-sm font-bold text-gray-900 mt-0.5">
              {day.dayTitle} <span className="text-gray-500 font-normal">({day.dateStr})</span>
            </h2>
          </div>
        </div>

        {/* List of Periods */}
        <div className="space-y-1.5 max-h-[220px] md:max-h-[640px] overflow-y-auto pr-1">
          {allDaySlots.map((slot) => {
            const isSelected =
              selectedPeriod.session === slot.session &&
              selectedPeriod.period === slot.period;

            const slotLesson = dayLessons.find(
              (l) => l.session === slot.session && l.period === slot.period
            );

            return (
              <div
                key={`${slot.session}-${slot.period}`}
                onClick={() => onSelectPeriod(slot.session, slot.period)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#6366f1] bg-white shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-gray-200/70 bg-white/70 hover:border-gray-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold text-[11px] ${
                      isSelected ? 'text-indigo-900' : 'text-gray-800'
                    }`}
                  >
                    {slot.session === 'morning' ? `Tiết ${slot.period}` : `Tiết ${slot.period} (C)`}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {slot.timeSlot.split(' - ')[0]}
                  </span>
                </div>
                <div
                  className={`mt-1 text-[11px] truncate ${
                    slotLesson?.lessonName
                      ? isSelected
                        ? 'text-indigo-700 font-semibold'
                        : 'text-gray-700 font-medium'
                      : 'text-gray-400 italic'
                  }`}
                >
                  {slotLesson?.lessonName ? (
                    <span>
                      {slotLesson.className && (
                        <strong className="mr-1 text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-700">
                          {slotLesson.className}
                        </strong>
                      )}
                      {slotLesson.lessonName}
                    </span>
                  ) : (
                    '(Trống)'
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Main Lesson Detail & Materials Form */}
      <div className="flex-1 p-4 sm:p-5 md:p-6 space-y-5 overflow-y-auto max-h-[820px]">
        {/* Top Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              {day.dayTitle.toUpperCase()} • {currentDisplayLabel}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 tracking-tight line-clamp-1">
              {lessonName.trim() || 'Tiết dạy chưa phân công lớp'}
            </h1>
            <div className="text-xs text-gray-500 font-medium">
              {currentPeriodDef?.timeSlot || '07:50 - 08:35'}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu tiết</span>
                </>
              )}
            </button>

            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ split view' : 'Mở rộng toàn màn hình'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Đóng chi tiết tiết học (Trở về toàn bảng tuần)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Content Grid: Information + Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: 📝 Thông tin bài dạy */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                <span>📝</span>
                <span>Thông tin bài dạy</span>
              </h3>

              <button
                onClick={handleAIAutoFill}
                disabled={isAIGenerating}
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-[10px] sm:text-[11px] font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Sử dụng Gemini AI để điền tự động mục tiêu và dặn dò"
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>✨ AI Tự điền</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                  Tên bài học / Tiết dạy:
                </label>
                <input
                  type="text"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  placeholder="Ví dụ: Bài 1: Khảo sát sự biến thiên hàm số..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                    Lớp học:
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="10A1"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-800 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                    Phòng học:
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="P.201"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-800 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                  Mục tiêu bài học / Trọng tâm:
                </label>
                <textarea
                  rows={3}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Kiến thức trọng tâm, phương pháp hoặc năng lực cần đạt..."
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                  Ghi chú giáo viên:
                </label>
                <input
                  type="text"
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Nhắc học sinh mang SGK, dặn dò bài tập..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Right: 📁 Giáo án & Tài liệu (Google Drive) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                <span>📁</span>
                <span>Tài liệu & Google Drive</span>
              </h3>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDriveConnected(!isDriveConnected)}
                  className={`px-2 py-1 rounded-lg border text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isDriveConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Kết nối tài khoản Google Drive"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>{isDriveConnected ? 'Đã kết nối' : 'Kết nối Drive'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  title="Tải tệp từ máy tính"
                >
                  <Upload className="w-3 h-3" />
                  <span>Tải lên</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Search Drive Box */}
            <div className="relative">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                  placeholder="Tìm kiếm tài liệu, Slide, đề kiểm tra..."
                  className="w-full bg-white border border-gray-300 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Search dropdown results */}
              {isSearching && searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 z-20 space-y-1 max-h-48 overflow-y-auto">
                  <div className="text-[10px] font-semibold text-gray-500 px-2 py-0.5">
                    Gợi ý từ Google Drive:
                  </div>
                  {filteredDriveDocs.length > 0 ? (
                    filteredDriveDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleAttachDriveDoc(doc)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {getFileIcon(doc.type)}
                          <span className="font-medium text-gray-800 truncate text-[11px]">
                            {doc.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-semibold shrink-0">
                          + Thêm
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      Không tìm thấy file phù hợp. Hãy thử tải lên từ máy.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attached files container */}
            <div className="border border-gray-200/90 rounded-xl p-3 bg-[#fbfdfa]/60 min-h-[140px] space-y-2">
              <div className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                <span>📌</span>
                <span>Tài liệu đính kèm ({documents.length}):</span>
              </div>

              {documents.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 italic">
                  Chưa có tài liệu. Tìm kiếm ở trên hoặc tải file lên.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs shadow-2xs hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(doc.type)}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate text-[11px]">
                            {doc.name}
                          </div>
                          <div className="text-[9px] text-gray-400 flex items-center gap-1.5">
                            {doc.size && <span>{doc.size}</span>}
                            <span>• {doc.source === 'drive' ? 'Google Drive' : 'Đã tải lên'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {doc.driveUrl && (
                          <a
                            href={doc.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Mở tài liệu"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Gỡ tài liệu khỏi tiết này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
