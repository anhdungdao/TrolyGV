import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { TimetableGrid } from './components/TimetableGrid';
import { SingleDayTimetable } from './components/SingleDayTimetable';
import { LessonDetailPanel } from './components/LessonDetailPanel';
import { SettingsModal } from './components/SettingsModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import {
  dayColumns,
  defaultWeekData,
  defaultSettings,
  initialLessons,
  classList,
} from './data/timetableData';
import { Lesson, WeekData, AppSettings } from './types';

const SETTINGS_STORAGE_KEY = 'eduplan_app_settings';
const LESSONS_STORAGE_KEY = 'eduplan_lessons_data';

export default function App() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedClass, setSelectedClass] = useState('Tất cả');

  // Load persisted settings or fallback
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved settings', e);
    }
    return defaultSettings;
  });

  // Load persisted lessons or fallback
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      const saved = localStorage.getItem(LESSONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved lessons', e);
    }
    return initialLessons;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(lessons));
    } catch (e) {
      console.warn('Failed to save lessons', e);
    }
  }, [lessons]);

  // Active Day View state:
  // When null: Show 100% full week timetable
  // When set: Co lại thành 30% lịch ngày bên trái + 70% chi tiết tiết học bên phải
  const [activeDaySlot, setActiveDaySlot] = useState<{
    dayIndex: number;
    session: 'morning' | 'afternoon';
    period: number;
  } | null>(null);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // AI Assistant Drawer State
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');

  // Dynamic calculation of week data
  const currentWeekData: WeekData = {
    ...defaultWeekData,
    academicYear: settings.academicYear || defaultWeekData.academicYear,
    semester: settings.semester || defaultWeekData.semester,
    weekNumber: 1 + weekOffset,
  };

  // Handlers for week navigation
  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);
  const handleCurrentWeek = () => setWeekOffset(0);

  // Save / Update a lesson
  const handleSaveLesson = (updated: Lesson) => {
    setLessons((prev) => {
      const exists = prev.some(
        (l) =>
          l.id === updated.id ||
          (l.dayIndex === updated.dayIndex &&
            l.session === updated.session &&
            l.period === updated.period)
      );
      if (exists) {
        return prev.map((l) =>
          l.id === updated.id ||
          (l.dayIndex === updated.dayIndex &&
            l.session === updated.session &&
            l.period === updated.period)
            ? updated
            : l
        );
      }
      return [...prev, updated];
    });
  };

  // Select slot in timetable
  const handleSelectSlot = (
    dayIndex: number,
    session: 'morning' | 'afternoon',
    period: number
  ) => {
    setActiveDaySlot({ dayIndex, session, period });
  };

  // Close split view to go back to 100% full week timetable
  const handleBackToFullWeek = () => {
    setActiveDaySlot(null);
  };

  // Active day info
  const activeDayColumn = activeDaySlot
    ? dayColumns.find((d) => d.dayIndex === activeDaySlot.dayIndex) || dayColumns[0]
    : null;

  const activeDayLessons = activeDaySlot
    ? lessons.filter((l) => l.dayIndex === activeDaySlot.dayIndex)
    : [];

  return (
    <div className="min-h-screen bg-[#f2f7f1] text-gray-800 flex flex-col font-sans selection:bg-indigo-100">
      {/* Top Header */}
      <Header
        weekData={currentWeekData}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-2.5 sm:p-4 md:p-5 flex flex-col space-y-3.5">
        {/* Week Navigator & Class Filters */}
        <FilterBar
          weekData={currentWeekData}
          selectedClass={selectedClass}
          onSelectClass={setSelectedClass}
          classList={classList}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onCurrentWeek={handleCurrentWeek}
        />

        {/* Dynamic Display Area */}
        <div className="flex-1">
          {activeDaySlot && activeDayColumn ? (
            /* EXACT 30% / 70% SPLIT: Lịch ngày (30%) + Chi tiết tiết học (70%) on BOTH mobile and desktop */
            <div className="flex flex-row gap-2 sm:gap-4 items-stretch transition-all duration-200 min-h-[580px]">
              {/* 30% LEFT: Lịch ngày (30% width) */}
              <div className="w-[30%] min-w-[105px] max-w-[340px] shrink-0">
                <SingleDayTimetable
                  day={activeDayColumn}
                  dayLessons={activeDayLessons}
                  selectedPeriod={{
                    session: activeDaySlot.session,
                    period: activeDaySlot.period,
                  }}
                  onSelectPeriod={(session, period) =>
                    setActiveDaySlot({
                      dayIndex: activeDaySlot.dayIndex,
                      session,
                      period,
                    })
                  }
                  onBackToWeek={handleBackToFullWeek}
                  allDays={dayColumns}
                  onSelectDay={(dayIndex) =>
                    setActiveDaySlot({
                      dayIndex,
                      session: activeDaySlot.session,
                      period: activeDaySlot.period,
                    })
                  }
                />
              </div>

              {/* 70% RIGHT: Chi tiết tiết học (70% width) */}
              <div className="flex-1 min-w-0">
                <LessonDetailPanel
                  day={activeDayColumn}
                  selectedPeriod={{
                    session: activeDaySlot.session,
                    period: activeDaySlot.period,
                  }}
                  dayLessons={activeDayLessons}
                  onClose={handleBackToFullWeek}
                  onSaveLesson={handleSaveLesson}
                />
              </div>
            </div>
          ) : (
            /* DEFAULT 100% FULL WEEK TIMETABLE */
            <div className="w-full transition-all duration-200">
              <TimetableGrid
                dayColumns={dayColumns}
                lessons={lessons}
                selectedClass={selectedClass}
                onSelectSlot={handleSelectSlot}
                activeSlot={null}
                isCompact={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button: Ask AI */}
      <button
        onClick={() => {
          setAiInitialPrompt('');
          setIsAIDrawerOpen(true);
        }}
        id="btn-ask-ai"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 bg-[#194b2e] hover:bg-[#133c23] text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-full shadow-lg flex items-center gap-2.5 font-bold text-xs sm:text-sm tracking-wide transition-all transform hover:scale-105 active:scale-95 border border-emerald-500/40 cursor-pointer group"
        title="Trợ giảng AI sư phạm môn Toán"
      >
        <Sparkles className="w-4 h-4 text-[#7df38a] group-hover:rotate-12 transition-transform" />
        <span>Hỏi AI Trợ Giảng</span>
      </button>

      {/* System Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        activeLesson={
          activeDaySlot
            ? activeDayLessons.find(
                (l) =>
                  l.session === activeDaySlot.session &&
                  l.period === activeDaySlot.period
              ) || null
            : null
        }
        initialPrompt={aiInitialPrompt}
      />
    </div>
  );
}
