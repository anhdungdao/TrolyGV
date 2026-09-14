/**
 * TIMETABLE GRID COMPONENT
 * Hiển thị toàn bộ lưới thời khoá biểu tuần (10 tiết x 6 ngày Thứ 2 -> Thứ 7)
 * Áp dụng thiết kế PeriodCard & màu sắc Forest Green thanh lịch theo UINew
 */

import { AppState, showToast } from '../app.js';
import { updateWeekDisplay, updateClassChips, currentClassFilter } from './filter-bar.js';
import { openPeriodDetail, renderCompactDaySidebar } from './single-day.js';
import { renderLessonDetailPanel } from './lesson-detail.js';
import { loadPeriodDriveFiles } from '../drive-search.js';

export const DAYS = [
  { num: 2, label: 'Thứ Hai' },
  { num: 3, label: 'Thứ Ba' },
  { num: 4, label: 'Thứ Tư' },
  { num: 5, label: 'Thứ Năm' },
  { num: 6, label: 'Thứ Sáu' },
  { num: 7, label: 'Thứ Bảy' }
];

export const PERIOD_TIMES = {
  1: '07:00 - 07:45',
  2: '07:50 - 08:35',
  3: '08:45 - 09:30',
  4: '09:40 - 10:25',
  5: '10:30 - 11:15',
  6: '14:00 - 14:45',
  7: '14:55 - 15:40',
  8: '15:50 - 16:35'
};

export function initTimetableGrid() {
  // Initial load can be triggered by app.js
}

export function getDayDateInfo(dayOfWeek, weekNumber, startDateStr) {
  const baseDateStr = startDateStr || AppState.settings.start_date || '2026-09-07';
  const week = weekNumber || AppState.currentWeek || 1;

  const parts = baseDateStr.split('-');
  const baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (isNaN(baseDate.getTime())) {
    return { dateStr: '', formatted: '', isPast: false, isToday: false };
  }

  const offsetDays = (week - 1) * 7 + (dayOfWeek - 2);
  const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);

  const dayOfMonth = targetDate.getDate();
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();
  const formatted = `${dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth}/${month < 10 ? '0' + month : month}`;
  const targetDateStr = `${year}-${month < 10 ? '0' + month : month}-${dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth}`;

  const nowServerStr = AppState.serverDate || new Date().toISOString().split('T')[0];

  const isPast = targetDateStr < nowServerStr;
  const isToday = targetDateStr === nowServerStr;

  return {
    dateStr: targetDateStr,
    formatted: formatted,
    isPast: isPast,
    isToday: isToday
  };
}

export async function loadTimetableData(year, semester, week) {
  const y = year || AppState.settings.current_year;
  const s = semester || AppState.settings.current_semester;
  const w = week || AppState.currentWeek || 1;
  const storageKey = `troly_gv_tt_${y}_${s}_week_${w}`;

  // 1. Local-First: Tải ngay lập tức (0ms)
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      const data = JSON.parse(cached);
      AppState.currentTimetable = data;
      AppState.currentWeek = w;
      renderFullGrid(data);
      updateWeekDisplay();
      updateClassChips(data.schedule);
      updateSplitViewIfActive(data);
    }
  } catch (e) {}

  // 2. Đồng bộ ngầm với Backend
  try {
    const resp = await fetch(`/api/timetable?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}&week=${w}`);
    if (resp.ok) {
      const data = await resp.json();
      AppState.currentTimetable = data;
      AppState.currentWeek = w;
      localStorage.setItem(storageKey, JSON.stringify(data));
      renderFullGrid(data);
      updateWeekDisplay();
      updateClassChips(data.schedule);
      updateSplitViewIfActive(data);
    }
  } catch (err) {
    console.warn('Đang tải từ cache offline:', err);
  }
}

/**
 * Cập nhật Split View (Sidebar 30% và Chi tiết 70%) khi chuyển tuần
 */
function updateSplitViewIfActive(data) {
  const splitView = document.getElementById('split-view-container');
  if (splitView && !splitView.classList.contains('hidden') && AppState.selectedPeriodId) {
    let targetSlot = (data.schedule || []).find(s => s.id === AppState.selectedPeriodId);
    if (!targetSlot && (data.schedule || []).length > 0) {
      targetSlot = data.schedule[0];
      AppState.selectedPeriodId = targetSlot.id;
    }
    if (targetSlot) {
      renderCompactDaySidebar(targetSlot.dayOfWeek, targetSlot.id);
      renderLessonDetailPanel(targetSlot);
      loadPeriodDriveFiles(targetSlot);
    }
  }
}

export function renderTableHeaderDates(tt) {
  const startDate = tt?.metadata?.startDate || AppState.settings.start_date || '2026-09-07';
  const weekNum = tt?.metadata?.week || AppState.currentWeek || 1;

  const thElements = document.querySelectorAll('#timetable-grid-table thead th.col-day');
  thElements.forEach(th => {
    const dayNum = parseInt(th.dataset.day || th.getAttribute('data-day'));
    if (!dayNum) return;

    const dayObj = DAYS.find(d => d.num === dayNum);
    const dayName = dayObj ? dayObj.label : `Thứ ${dayNum}`;
    const dateInfo = getDayDateInfo(dayNum, weekNum, startDate);

    th.className = 'col-day' + (dateInfo.isPast ? ' is-past' : '') + (dateInfo.isToday ? ' is-today' : '');
    th.innerHTML = `
      <div class="day-header-cell ${dateInfo.isToday ? 'is-today' : ''}">
        <span class="day-header-title">${dayName}</span>
        <span class="day-header-date">${dateInfo.formatted ? dateInfo.formatted : ''}</span>
      </div>
    `;
  });
}

export function renderFullGrid(tt) {
  const tbody = document.getElementById('timetable-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  renderTableHeaderDates(tt);

  const startDate = tt.metadata?.startDate || AppState.settings.start_date || '2026-09-07';
  const weekNum = tt.metadata?.week || AppState.currentWeek || 1;

  const scheduleMap = {};
  (tt.schedule || []).forEach(slot => {
    scheduleMap[`${slot.dayOfWeek}_${slot.period}`] = slot;
  });

  // Morning: Tiết 1 -> 5 (07:00 - 11:15)
  for (let p = 1; p <= 5; p++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-period-label">
        <div class="period-meta-box">
          <span class="period-num-badge">Tiết ${p} (Sáng)</span>
          <span class="period-time-text">${PERIOD_TIMES[p]}</span>
        </div>
      </td>
    `;
    DAYS.forEach(day => {
      const slot = scheduleMap[`${day.num}_${p}`] || {
        id: `d${day.num}_p${p}`,
        dayOfWeek: day.num,
        period: p,
        className: '',
        subject: '',
        room: '',
        lessonTitle: '',
        driveFiles: []
      };
      const dateInfo = getDayDateInfo(day.num, weekNum, startDate);
      const td = document.createElement('td');
      td.className = 'grid-slot-cell' + (dateInfo.isPast ? ' is-past' : '') + (dateInfo.isToday ? ' is-today' : '');
      td.appendChild(createSlotCard(slot, dateInfo));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  // Lunch Break Divider (11:15 -> 14:00)
  const lunchTr = document.createElement('tr');
  lunchTr.className = 'lunch-divider-row';
  lunchTr.innerHTML = `
    <td colspan="7">☀️ NGHỈ TRƯA (11:15 - 14:00) ☀️</td>
  `;
  tbody.appendChild(lunchTr);

  // Afternoon: Đúng 3 tiết (Tiết 1 Chiều, Tiết 2 Chiều, Tiết 3 Chiều - Bắt đầu lúc 14:00)
  for (let p = 6; p <= 8; p++) {
    const tr = document.createElement('tr');
    const afternoonPeriodNum = p - 5; // 6 -> 1, 7 -> 2, 8 -> 3
    tr.innerHTML = `
      <td class="col-period-label">
        <div class="period-meta-box">
          <span class="period-num-badge">Tiết ${afternoonPeriodNum} (Chiều)</span>
          <span class="period-time-text">${PERIOD_TIMES[p]}</span>
        </div>
      </td>
    `;
    DAYS.forEach(day => {
      const slot = scheduleMap[`${day.num}_${p}`] || {
        id: `d${day.num}_p${p}`,
        dayOfWeek: day.num,
        period: p,
        className: '',
        subject: '',
        room: '',
        lessonTitle: '',
        driveFiles: []
      };
      const dateInfo = getDayDateInfo(day.num, weekNum, startDate);
      const td = document.createElement('td');
      td.className = 'grid-slot-cell' + (dateInfo.isPast ? ' is-past' : '') + (dateInfo.isToday ? ' is-today' : '');
      td.appendChild(createSlotCard(slot, dateInfo));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

function createSlotCard(slot, dateInfo) {
  const card = document.createElement('div');
  const isOccupied = slot.className && slot.className.trim();
  const isPast = dateInfo && dateInfo.isPast;
  const isToday = dateInfo && dateInfo.isToday;

  card.dataset.id = slot.id;
  card.dataset.day = slot.dayOfWeek;
  card.dataset.period = slot.period;

  if (isOccupied) {
    const driveCount = slot.driveFiles ? slot.driveFiles.length : 0;
    card.className = `period-card occupied ${isPast ? 'is-past' : ''} ${isToday ? 'is-today' : ''}`;
    card.innerHTML = `
      <div class="card-header">
        <span class="class-badge">${escapeHtml(slot.className)}</span>
        ${slot.room ? `<span class="room-badge">${escapeHtml(slot.room)}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="lesson-title-text" title="${escapeHtml(slot.lessonTitle || 'Chưa đặt tên bài')}">
          ${escapeHtml(slot.lessonTitle || 'Chưa đặt tên bài dạy')}
        </div>
      </div>
      <div class="card-footer">
        <span class="subject-name" style="font-size: 0.68rem; color: var(--text-muted);">${escapeHtml(slot.subject || AppState.settings.subject)}</span>
        ${driveCount > 0 ? `<span class="attached-doc-badge" title="Có ${driveCount} tài liệu Drive">📁 ${driveCount}</span>` : ''}
      </div>
    `;
  } else {
    card.className = `period-card is-empty ${isPast ? 'is-past' : ''}`;
    card.innerHTML = `
      <span class="empty-plus-icon">+</span>
    `;
  }

  // Click opens Master-Detail Split View!
  card.addEventListener('click', () => {
    openPeriodDetail(slot.id);
  });

  return card;
}

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
