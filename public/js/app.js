/**
 * THỜI KHOÁ BIỂU & GIÁO ÁN CÔ LINH - MAIN APP CONTROLLER
 * Tương thích cao với Google AI Studio: Code rõ ràng, module hoá, dễ chỉnh sửa.
 */

import { initChat } from './tab1-chat.js';
import { initTimetable, loadTimetableData } from './tab2-timetable.js';
import { initDriveSearch } from './drive-search.js';
import { initArchive } from './archive.js';
import { initSettings, loadSettings } from './settings.js';

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
    google_drive_api_key: ""
  },
  currentWeek: 1,
  serverDate: "2026-09-07",
  currentTimetable: null,
  selectedPeriodId: null,
  activeTab: 'tab-chat'
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

// Tab Switching Utility
export function switchTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-btn');

  tabs.forEach(tab => {
    if (tab.id === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  buttons.forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  AppState.activeTab = tabId;

  // Nếu chuyển sang tab thời khoá biểu thì nạp lại dữ liệu mới nhất
  if (tabId === 'tab-timetable') {
    loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, AppState.currentWeek);
  }
}

// Cập nhật hiển thị thông tin chung trên Header
export function updateHeaderInfo() {
  const nameEl = document.getElementById('header-teacher-name');
  const termBadge = document.getElementById('term-badge-text');

  if (nameEl) {
    nameEl.textContent = `${AppState.settings.teacher_name} • ${AppState.settings.subject}`;
  }
  if (termBadge) {
    termBadge.textContent = `${AppState.settings.current_year} • ${AppState.settings.current_semester}`;
  }
}

// Application Bootstrap
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Setup Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      if (targetTab) switchTab(targetTab);
    });
  });

  // 2. Load System Settings & Server Real Time
  try {
    const timeResp = await fetch('/api/settings/time');
    if (timeResp.ok) {
      const timeData = await timeResp.json();
      AppState.serverDate = timeData.current_date;
    }
  } catch (e) {
    console.warn('Using client local time');
  }

  await loadSettings();
  updateHeaderInfo();

  // 3. Initialize Submodules an toàn với try-catch độc lập
  try { initChat(); } catch (e) { console.error("Init Chat Error:", e); }
  try { initTimetable(); } catch (e) { console.error("Init Timetable Error:", e); }
  try { initDriveSearch(); } catch (e) { console.error("Init DriveSearch Error:", e); }
  try { initArchive(); } catch (e) { console.error("Init Archive Error:", e); }
  try { initSettings(); } catch (e) { console.error("Init Settings Error:", e); }

  console.log("🚀 Trợ lý Giáo viên AI đã sẵn sàng!");
});
