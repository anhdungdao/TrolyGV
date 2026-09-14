export type ClassName = '12A1' | '11B2' | '12A3' | '10A2' | '12A1 (Nhóm)' | 'HSG 12' | string;

export type LessonStatus = 'passed' | 'active' | 'upcoming-today' | 'upcoming' | 'exam' | 'meeting' | 'empty';

export interface AttachedDocument {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'slide' | 'sheet' | 'link';
  size?: string;
  driveUrl?: string;
  source: 'drive' | 'upload';
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  dayIndex: number; // 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat
  dayName: string;
  session: 'morning' | 'afternoon';
  period: number; // 1 to 5 for morning, 1 to 3 for afternoon
  periodLabel: string; // e.g., 'Tiết 1', 'Tiết 2', 'Tiết 3'
  timeSlot: string; // e.g., '07:00-07:45', '14:00-14:45'
  className: string;
  subject: string; // e.g., 'Toán Giải Tích 12', 'Toán Đại Số 11'
  lessonName: string; // e.g., 'Khảo sát đồ thị', 'Cấp số nhân'
  room: string; // e.g., 'P.302', 'P.204'
  status: LessonStatus;
  badgeText?: string;
  isDone?: boolean;
  objectives?: string; // Mục tiêu bài học / Trọng tâm
  teacherNotes?: string; // Ghi chú giáo viên
  documents?: AttachedDocument[]; // Danh sách tài liệu đính kèm
  notes?: string;
  curriculumWeek?: number;
  periodIndexInCurriculum?: number;
  lessonPlanOutline?: {
    objectives?: string[];
    coreKnowledge?: string[];
    activities?: string[];
    homework?: string[];
  };
}

export interface DayColumn {
  dayIndex: number;
  dateStr: string;
  dayTitle: string;
  subTitle?: string;
  isToday?: boolean;
  isPassed?: boolean;
}

export interface WeekData {
  academicYear: string;
  semester: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  formattedRange: string;
  totalPeriods: number;
  completedPeriods: number;
  remainingPeriods: number;
}

export interface AppSettings {
  geminiApiKey: string;
  aiModel: string;
  teacherName: string;
  subject: string;
  academicYear: string;
  semester: string;
  week1StartDate: string;
  googleOAuthClientId: string;
  googleDriveApiKey: string;
}
