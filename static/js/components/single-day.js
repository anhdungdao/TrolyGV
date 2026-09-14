/**
 * SINGLE DAY SIDEBAR COMPONENT (MASTER COLUMN - 30% WIDTH)
 * Hiển thị danh sách 10 tiết của ngày đang chọn khi người dùng bấm vào một tiết học
 * Cho phép bấm "← Xem cả tuần" để quay lại lưới tuần hoặc chuyển tiết khác trong ngày
 */

import { AppState } from '../app.js';
import { DAYS, PERIOD_TIMES, getDayDateInfo, renderFullGrid } from './timetable-grid.js';
import { renderLessonDetailPanel } from './lesson-detail.js';
import { loadPeriodDriveFiles } from '../drive-search.js';

export function initSingleDaySidebar() {
  const backBtn = document.getElementById('btn-back-to-full-grid');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showFullGridView();
    });
  }
}

export function openPeriodDetail(periodId) {
  const fullGrid = document.getElementById('full-grid-view');
  const splitView = document.getElementById('split-view-container');

  if (!AppState.currentTimetable) return;

  const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === periodId);
  if (!targetSlot) return;

  AppState.selectedPeriodId = periodId;

  // 1. Chuyển sang Split View
  if (fullGrid) fullGrid.classList.add('hidden');
  if (splitView) splitView.classList.remove('hidden');

  // 2. Render sidebar 30%
  renderCompactDaySidebar(targetSlot.dayOfWeek, targetSlot.id);

  // 3. Render chi tiết bài giảng 70%
  renderLessonDetailPanel(targetSlot);

  // 4. Load Google Drive files
  loadPeriodDriveFiles(targetSlot);

  // Scroll to top of panel
  const panel = document.getElementById('lesson-detail-panel');
  if (panel) panel.scrollTop = 0;
}

export function showFullGridView() {
  const fullGrid = document.getElementById('full-grid-view');
  const splitView = document.getElementById('split-view-container');

  if (splitView) splitView.classList.add('hidden');
  if (fullGrid) fullGrid.classList.remove('hidden');
  AppState.selectedPeriodId = null;

  // Cập nhật lại toàn bộ lưới tuần
  if (AppState.currentTimetable) {
    renderFullGrid(AppState.currentTimetable);
  }
}

export function renderCompactDaySidebar(dayOfWeek, activePeriodId) {
  const nameEl = document.getElementById('sidebar-day-name');
  const dateEl = document.getElementById('sidebar-day-date');
  const listEl = document.getElementById('compact-period-list');
  if (!listEl) return;

  const dayName = DAYS.find(d => d.num === dayOfWeek)?.label || `Thứ ${dayOfWeek}`;
  const startDate = AppState.currentTimetable?.metadata?.startDate || AppState.settings.start_date || '2026-09-07';
  const weekNum = AppState.currentTimetable?.metadata?.week || AppState.currentWeek || 1;
  const dateInfo = getDayDateInfo(dayOfWeek, weekNum, startDate);

  if (nameEl) nameEl.textContent = dayName;
  if (dateEl) {
    let dateText = dateInfo.formatted ? `(${dateInfo.formatted})` : '';
    if (dateInfo.isToday) dateText += ' • Hôm nay';
    dateEl.textContent = dateText;
  }

  listEl.innerHTML = '';

  const daySlots = (AppState.currentTimetable?.schedule || [])
    .filter(s => s.dayOfWeek === dayOfWeek && s.period <= 8)
    .sort((a, b) => a.period - b.period);

  daySlots.forEach(slot => {
    const item = document.createElement('div');
    const isActive = slot.id === activePeriodId;
    const hasClass = slot.className && slot.className.trim();
    const periodLabel = slot.period <= 5 
      ? `Tiết ${slot.period} (Sáng)` 
      : `Tiết ${slot.period - 5} (Chiều)`;
    const periodTime = PERIOD_TIMES[slot.period] || '';

    item.className = `day-period-item ${isActive ? 'is-active' : ''} ${dateInfo.isPast ? 'is-past' : ''} ${dateInfo.isToday ? 'is-today' : ''}`;
    item.innerHTML = `
      <div class="item-left">
        <span class="item-period-tag">${periodLabel} • ${periodTime}</span>
        <div class="item-class-title">${hasClass ? escapeHtml(slot.className) : '<span class="item-class-empty">(Trống)</span>'}</div>
        ${slot.lessonTitle ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${escapeHtml(slot.lessonTitle)}</div>` : ''}
      </div>
      ${slot.driveFiles && slot.driveFiles.length > 0 ? `<span class="attached-doc-badge">📁 ${slot.driveFiles.length}</span>` : ''}
    `;

    item.addEventListener('click', () => {
      openPeriodDetail(slot.id);
    });

    listEl.appendChild(item);
  });
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
