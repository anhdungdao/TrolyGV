/**
 * THỜI KHOÁ BIỂU & GIÁO ÁN CÔ LINH - MAIN APP ORCHESTRATOR
 * Tương thích cao với Google AI Studio: Code rõ ràng, module hoá theo UINew
 */

import { initHeader, updateHeaderUI } from './components/header.js';
import { initFilterBar } from './components/filter-bar.js';
import { initTimetableGrid, loadTimetableData } from './components/timetable-grid.js';
import { initSingleDaySidebar } from './components/single-day.js';
import { initLessonDetail } from './components/lesson-detail.js';
import { initAIDrawer } from './components/ai-drawer.js';
import { initSettingsModal, loadSettings } from './components/settings-modal.js';
import { initDriveSearch } from './drive-search.js';
import { initGoogleAuthSession } from './drive-sync.js';

// Global App State
export const AppState = {
  settings: {
    teacher_name: "Giáo viên",
    subject: "Toàn trường",
    current_year: "2025-2026",
    current_semester: "HK1",
    current_week: 1,
    start_date: "2026-09-07",
    gemini_api_key: "",
    gemini_model: "gemini-2.5-flash",
    google_drive_client_id: "",
    google_drive_api_key: ""
  },
  currentWeek: 1,
  serverDate: "2026-09-07",
  currentTimetable: null,
  selectedPeriodId: null,
  googleAccessToken: null
};

// Toast Notification Utility
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Application Bootstrap
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Fetch Server Time
  try {
    const timeResp = await fetch('/api/settings/time');
    if (timeResp.ok) {
      const timeData = await timeResp.json();
      AppState.serverDate = timeData.current_date;
    }
  } catch (e) {
    console.warn('Using client local time');
  }

  // 2. Load System Settings
  await loadSettings();
  updateHeaderUI();

  // 3. Initialize Components
  try { initHeader(); } catch (e) { console.error('Init Header Error:', e); }
  try { initFilterBar(); } catch (e) { console.error('Init FilterBar Error:', e); }
  try { initTimetableGrid(); } catch (e) { console.error('Init TimetableGrid Error:', e); }
  try { initSingleDaySidebar(); } catch (e) { console.error('Init SingleDay Error:', e); }
  try { initLessonDetail(); } catch (e) { console.error('Init LessonDetail Error:', e); }
  try { initAIDrawer(); } catch (e) { console.error('Init AIDrawer Error:', e); }
  try { initSettingsModal(); } catch (e) { console.error('Init SettingsModal Error:', e); }
  try { initDriveSearch(); } catch (e) { console.error('Init DriveSearch Error:', e); }
  try { initGoogleAuthSession(); } catch (e) { console.error('Init GoogleAuth Error:', e); }

  // 4. Initial load of timetable
  await loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, AppState.currentWeek || 1);

  console.log("🌿 EduPlan AI - Giao diện Forest Green hiện đại đã sẵn sàng!");
});
