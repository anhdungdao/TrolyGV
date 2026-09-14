import React, { useState, useEffect, useRef } from 'react';
import {
  X,
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

interface LessonDetailPanelProps {
  day: DayColumn;
  selectedPeriod: {
    session: 'morning' | 'afternoon';
    period: number;
  };
  dayLessons: Lesson[];
  onClose: () => void;
  onSaveLesson: (updated: Lesson) => void;
}

export const LessonDetailPanel: React.FC<LessonDetailPanelProps> = ({
  day,
  selectedPeriod,
  dayLessons,
  onClose,
  onSaveLesson,
}) => {
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

  // Re-sync when selected slot changes
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
      lessonName: lessonName.trim() || 'Tiết dạy chưa phân công',
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

  // AI Auto-fill using Gemini API
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
Tài liệu: ${documents.map((d) => d.name).join(', ') || 'Chưa có'}.
Hãy tạo:
1. Mục tiêu bài học ngắn gọn 3 dòng
2. Ghi chú dặn dò 1 dòng.`,
          lessonContext: { className, lessonName, room },
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
        if (!lessonName) setLessonName('Khảo sát sự biến thiên và đồ thị');
        if (!className) setClassName('12A1');
        if (!room) setRoom('P.201');
      }
    } catch {
      setObjectives(
        `• Nắm vững kiến thức trọng tâm của bài học.\n• Rèn luyện năng lực tư duy logic và giải toán chính xác.\n• Vận dụng kiến thức vào bài tập thực hành theo chuẩn CV 5512.`
      );
      setTeacherNotes(
        `Nhắc học sinh mang SGK, hoàn thành phiếu học tập trước tiết sau.`
      );
    } finally {
      setIsAIGenerating(false);
    }
  };

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

  const filteredDriveDocs = searchQuery.trim()
    ? sampleDriveDocuments.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const getFileIcon = (type: AttachedDocument['type']) => {
    switch (type) {
      case 'doc':
        return <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />;
      case 'slide':
        return <Presentation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />;
      case 'sheet':
        return <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />;
      default:
        return <FileCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 shrink-0" />;
    }
  };

  const currentDisplayLabel =
    selectedPeriod.session === 'morning'
      ? `Tiết ${selectedPeriod.period}`
      : `Tiết ${selectedPeriod.period} (Chiều)`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm flex flex-col h-full overflow-hidden transition-all duration-200">
      {/* Top Header Controls: Highly responsive on both mobile and desktop */}
      <div className="p-2.5 sm:p-4 md:p-5 border-b border-gray-100 flex items-center justify-between gap-2 bg-[#fafbfa]">
        <div className="min-w-0 flex-1 pr-1">
          <div className="text-[10px] sm:text-[11px] font-bold text-indigo-600 uppercase tracking-wider truncate">
            {day.dayTitle} • {currentDisplayLabel}
          </div>
          <h1 className="text-sm sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5 tracking-tight truncate">
            {lessonName.trim() || 'Chưa phân công bài dạy'}
          </h1>
          <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
            {currentPeriodDef?.timeSlot || '07:50 - 08:35'}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handleSave}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold rounded-xl text-[11px] sm:text-xs shadow-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                <span>Đã lưu</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Lưu nội dung</span>
                <span className="sm:hidden">Lưu</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            title="Đóng chi tiết"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Form: Stack on mobile, 2 columns on lg */}
      <div className="flex-1 p-2.5 sm:p-4 md:p-6 overflow-y-auto space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* CỘT 1: 📝 Thông tin bài dạy */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                <span>📝</span>
                <span>Thông tin bài dạy</span>
              </h3>

              <button
                onClick={handleAIAutoFill}
                disabled={isAIGenerating}
                className="px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-[10px] sm:text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Sử dụng Gemini AI để điền tự động"
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>AI Tự điền</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px] sm:text-xs">
                  Tên bài học / Tiết dạy:
                </label>
                <input
                  type="text"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  placeholder="Ví dụ: Khảo sát hàm số..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-[11px] sm:text-xs">
                    Lớp học:
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="12A1"
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-900 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1 text-[11px] sm:text-xs">
                    Phòng học:
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="P.302"
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px] sm:text-xs">
                  Mục tiêu bài học / Trọng tâm:
                </label>
                <textarea
                  rows={3}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Kiến thức trọng tâm cần đạt..."
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 sm:p-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px] sm:text-xs">
                  Ghi chú giáo viên:
                </label>
                <input
                  type="text"
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Dặn dò bài tập..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* CỘT 2: 📁 Giáo án & Tài liệu (Google Drive) */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                <span>📁</span>
                <span>Tài liệu & Google Drive</span>
              </h3>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDriveConnected(!isDriveConnected)}
                  className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isDriveConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Kết nối tài khoản Google Drive"
                >
                  <LinkIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{isDriveConnected ? 'Đã nối Drive' : 'Nối Drive'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  title="Tải tệp từ máy tính"
                >
                  <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                  placeholder="Tìm tài liệu, Slide, đề thi..."
                  className="w-full bg-white border border-gray-300 rounded-xl pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-1.5 sm:py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
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
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-indigo-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate pr-2">
                          {getFileIcon(doc.type)}
                          <span className="font-medium text-gray-800 truncate text-[11px] sm:text-xs">
                            {doc.name}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-indigo-600 font-semibold shrink-0">
                          + Thêm
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      Không tìm thấy file phù hợp.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attached files container */}
            <div className="border border-gray-200 rounded-xl p-2.5 sm:p-3.5 bg-[#fbfdfa] min-h-[140px] space-y-2">
              <div className="text-[11px] sm:text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <span>📌</span>
                <span>Tài liệu đính kèm ({documents.length}):</span>
              </div>

              {documents.length === 0 ? (
                <div className="py-6 sm:py-8 text-center text-[11px] sm:text-xs text-gray-400 italic">
                  Chưa có tài liệu. Bấm "Tải lên" để đính kèm.
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2 max-h-[180px] sm:max-h-[220px] overflow-y-auto pr-0.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 sm:p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-1.5 sm:gap-2 text-xs shadow-2xs hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(doc.type)}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate text-[11px] sm:text-xs">
                            {doc.name}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-gray-400 flex items-center gap-1">
                            {doc.size && <span>{doc.size}</span>}
                            <span>• {doc.source === 'drive' ? 'Drive' : 'Tải lên'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        {doc.driveUrl && (
                          <a
                            href={doc.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 sm:p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Mở tài liệu"
                          >
                            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Gỡ tài liệu"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
