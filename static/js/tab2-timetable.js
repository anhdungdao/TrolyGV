/**
 * TAB 2: THỜI KHOÁ BIỂU & CHI TIẾT BÀI GIẢNG
 * Hỗ trợ chuyển đổi Master-Detail: Khi click vào 1 tiết, thu gọn sang sidebar ngày bên trái, mở chi tiết bên phải
 */

import { AppState, showToast } from './app.js';
import { loadPeriodDriveFiles } from './drive-search.js';

const DAYS = [
  { num: 2, label: 'Thứ Hai' },
  { num: 3, label: 'Thứ Ba' },
  { num: 4, label: 'Thứ Tư' },
  { num: 5, label: 'Thứ Năm' },
  { num: 6, label: 'Thứ Sáu' },
  { num: 7, label: 'Thứ Bảy' }
];

const PERIOD_TIMES = {
  1: '07:00 - 07:45',
  2: '07:50 - 08:35',
  3: '08:45 - 09:30',
  4: '09:40 - 10:25',
  5: '10:30 - 11:15',
  6: '13:00 - 13:45',
  7: '13:50 - 14:35',
  8: '14:45 - 15:30',
  9: '15:40 - 16:25',
  10: '16:30 - 17:15'
};

export function initTimetable() {
  const backBtn = document.getElementById('btn-back-to-full-grid');
  const saveLessonBtn = document.getElementById('btn-save-lesson-detail');
  const saveAllBtn = document.getElementById('btn-save-current-tt');
  const yearSelect = document.getElementById('select-academic-year');
  const semSelect = document.getElementById('select-semester');
  const weekSelect = document.getElementById('select-week');
  const prevWeekBtn = document.getElementById('btn-prev-week');
  const nextWeekBtn = document.getElementById('btn-next-week');
  const addWeekBtn = document.getElementById('btn-add-week');
  const delWeekBtn = document.getElementById('btn-del-week');
  const addTermBtn = document.getElementById('btn-add-term');
  const delTermBtn = document.getElementById('btn-del-term');
  const reuseBtn = document.getElementById('btn-reuse-next-year');
  const aiAnalyzeDocBtn = document.getElementById('btn-ai-analyze-doc');

  // Back to full week grid
  backBtn.addEventListener('click', () => {
    showFullGridView();
  });

  // Save lesson details
  saveLessonBtn.addEventListener('click', async () => {
    await saveCurrentLessonDetail();
  });

  // AI Analyze Document Button
  if (aiAnalyzeDocBtn) {
    aiAnalyzeDocBtn.addEventListener('click', async () => {
      await triggerAiDocAnalysis();
    });
  }

  // Save entire timetable
  saveAllBtn.addEventListener('click', async () => {
    if (!AppState.currentTimetable) return;
    try {
      const resp = await fetch('/api/timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(AppState.currentTimetable)
      });
      if (resp.ok) {
        showToast('Đã lưu toàn bộ thời khoá biểu thành công', 'success');
      }
    } catch (e) {
      showToast('Lỗi khi lưu thời khoá biểu', 'error');
    }
  });

  // Switch academic year
  yearSelect.addEventListener('change', async (e) => {
    AppState.settings.current_year = e.target.value;
    await refreshWeeksList();
  });

  // Switch semester
  semSelect.addEventListener('change', async (e) => {
    AppState.settings.current_semester = e.target.value;
    await refreshWeeksList();
  });

  // Switch week
  if (weekSelect) {
    weekSelect.addEventListener('change', (e) => {
      AppState.currentWeek = parseInt(e.target.value) || 1;
      loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, AppState.currentWeek);
    });
  }

  // Prev / Next Week
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      navigateWeek(-1);
    });
  }
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      navigateWeek(1);
    });
  }

  // Add Week
  if (addWeekBtn) {
    addWeekBtn.addEventListener('click', async () => {
      await createNewWeek();
    });
  }

  // Delete Week
  if (delWeekBtn) {
    delWeekBtn.addEventListener('click', async () => {
      await deleteCurrentWeek();
    });
  }

  // Add Term
  if (addTermBtn) {
    addTermBtn.addEventListener('click', async () => {
      await createNewTermModal();
    });
  }

  // Delete Term
  if (delTermBtn) {
    delTermBtn.addEventListener('click', async () => {
      await deleteCurrentTerm();
    });
  }

  // Reuse for next year
  if (reuseBtn) {
    reuseBtn.addEventListener('click', async () => {
      await reuseForNextYear();
    });
  }

  // Initial load
  refreshTermsList().then(() => {
    refreshWeeksList();
  });
}

/**
 * Tải danh sách các kỳ học hiện có
 */
export async function refreshTermsList() {
  try {
    const resp = await fetch('/api/timetable/terms');
    if (resp.ok) {
      const data = await resp.json();
      const yearSelect = document.getElementById('select-academic-year');
      if (yearSelect && data.years && data.years.length > 0) {
        const curY = AppState.settings.current_year;
        yearSelect.innerHTML = '';
        data.years.forEach(y => {
          const opt = document.createElement('option');
          opt.value = y;
          opt.textContent = y;
          if (y === curY) opt.selected = true;
          yearSelect.appendChild(opt);
        });
        if (!data.years.includes(curY)) {
          AppState.settings.current_year = data.years[0];
          yearSelect.value = data.years[0];
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi tải danh sách kỳ học:', err);
  }
}

/**
 * Tải danh sách tuần của kỳ hiện tại và nạp tuần đang chọn
 */
export async function refreshWeeksList() {
  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;
  const weekSelect = document.getElementById('select-week');

  try {
    const resp = await fetch(`/api/timetable/weeks?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}`);
    if (resp.ok) {
      const data = await resp.json();
      const weeks = data.weeks || [1];
      if (weekSelect) {
        weekSelect.innerHTML = '';
        weeks.forEach(w => {
          const opt = document.createElement('option');
          opt.value = w;
          opt.textContent = `Tuần ${w}`;
          weekSelect.appendChild(opt);
        });
      }

      if (!weeks.includes(AppState.currentWeek)) {
        AppState.currentWeek = weeks[0] || 1;
      }
      if (weekSelect) weekSelect.value = AppState.currentWeek;
      await loadTimetableData(y, s, AppState.currentWeek);
    }
  } catch (err) {
    console.error('Lỗi tải danh sách tuần:', err);
    await loadTimetableData(y, s, 1);
  }
}

/**
 * Điều hướng chuyển tuần Prev / Next
 */
function navigateWeek(delta) {
  const weekSelect = document.getElementById('select-week');
  if (!weekSelect) return;
  const options = Array.from(weekSelect.options).map(o => parseInt(o.value));
  if (options.length === 0) return;

  const currentIndex = options.indexOf(AppState.currentWeek);
  const newIndex = currentIndex + delta;
  if (newIndex >= 0 && newIndex < options.length) {
    AppState.currentWeek = options[newIndex];
    weekSelect.value = AppState.currentWeek;
    loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, AppState.currentWeek);
  } else {
    showToast(delta > 0 ? 'Đã ở tuần cuối cùng của kỳ' : 'Đã ở tuần đầu tiên của kỳ', 'info');
  }
}

/**
 * Tạo tuần mới
 */
async function createNewWeek() {
  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;

  try {
    const resp = await fetch(`/api/timetable/week/create?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}`, {
      method: 'POST'
    });
    if (resp.ok) {
      const data = await resp.json();
      showToast(`Đã tạo Tuần ${data.week} thành công!`, 'success');
      AppState.currentWeek = data.week;
      await refreshWeeksList();
    } else {
      const err = await resp.json();
      showToast(`Lỗi tạo tuần mới: ${err.detail || 'Không thể tạo'}`, 'error');
    }
  } catch (e) {
    showToast('Lỗi tạo tuần mới', 'error');
  }
}

/**
 * Xoá tuần hiện tại
 */
async function deleteCurrentWeek() {
  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;
  const w = AppState.currentWeek;

  if (!confirm(`Bạn có chắc chắn muốn xoá dữ liệu Tuần ${w} của ${s} (${y}) không?`)) {
    return;
  }

  try {
    const resp = await fetch(`/api/timetable/week?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}&week=${w}`, {
      method: 'DELETE'
    });
    if (resp.ok) {
      showToast(`Đã xoá Tuần ${w}`, 'info');
      AppState.currentWeek = 1;
      await refreshWeeksList();
    } else {
      const err = await resp.json();
      showToast(`Lỗi: ${err.detail || 'Không thể xoá tuần'}`, 'error');
    }
  } catch (e) {
    showToast('Lỗi xoá tuần', 'error');
  }
}

/**
 * Tạo kỳ học mới
 */
async function createNewTermModal() {
  const currentY = AppState.settings.current_year;
  const yearInput = prompt('Nhập năm học mới (Ví dụ: 2026-2027):', currentY);
  if (!yearInput || !yearInput.trim()) return;

  const semInput = prompt('Nhập học kỳ (HK1 hoặc HK2):', 'HK1');
  if (!semInput || !semInput.trim()) return;

  const defaultStart = AppState.settings.start_date || '2026-09-07';
  const startDateInput = prompt('Nhập ngày Thứ 2 bắt đầu Tuần 1 (Định dạng YYYY-MM-DD):', defaultStart);

  try {
    let url = `/api/timetable/term/create?year=${encodeURIComponent(yearInput.trim())}&semester=${encodeURIComponent(semInput.trim())}`;
    if (startDateInput && startDateInput.trim()) {
      url += `&start_date=${encodeURIComponent(startDateInput.trim())}`;
    }
    const resp = await fetch(url, {
      method: 'POST'
    });
    if (resp.ok) {
      showToast(`Đã tạo kỳ học ${semInput} năm ${yearInput}!`, 'success');
      AppState.settings.current_year = yearInput.trim();
      AppState.settings.current_semester = semInput.trim();
      if (startDateInput && startDateInput.trim()) {
        AppState.settings.start_date = startDateInput.trim();
      }
      await refreshTermsList();
      await refreshWeeksList();
    } else {
      const err = await resp.json();
      showToast(`Lỗi tạo kỳ học: ${err.detail || 'Không thành công'}`, 'error');
    }
  } catch (e) {
    showToast('Lỗi tạo kỳ học', 'error');
  }
}

/**
 * Xoá kỳ học hiện tại
 */
async function deleteCurrentTerm() {
  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;

  if (!confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xoá toàn bộ dữ liệu của ${s} (${y}) không?`)) {
    return;
  }

  try {
    const resp = await fetch(`/api/timetable/term?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}`, {
      method: 'DELETE'
    });
    if (resp.ok) {
      showToast(`Đã xoá ${s} (${y})`, 'info');
      await refreshTermsList();
      await refreshWeeksList();
    } else {
      const err = await resp.json();
      showToast(`Lỗi xoá kỳ: ${err.detail || 'Không thành công'}`, 'error');
    }
  } catch (e) {
    showToast('Lỗi xoá kỳ học', 'error');
  }
}

/**
 * Tái sử dụng TKB và bài giảng cho năm học sau
 */
async function reuseForNextYear() {
  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;

  if (!confirm(`Bạn muốn sao chép toàn bộ thời khoá biểu & bài giảng của ${s} (${y}) sang năm học tiếp theo không?`)) {
    return;
  }

  try {
    const resp = await fetch(`/api/timetable/reuse-next-year?source_year=${encodeURIComponent(y)}&source_semester=${encodeURIComponent(s)}`, {
      method: 'POST'
    });
    if (resp.ok) {
      const data = await resp.json();
      showToast(data.message, 'success');
      AppState.settings.current_year = data.target_year;
      AppState.settings.current_semester = data.target_semester;
      await refreshTermsList();
      await refreshWeeksList();
    } else {
      const err = await resp.json();
      showToast(`Lỗi: ${err.detail || 'Không thể sao chép'}`, 'error');
    }
  } catch (e) {
    showToast('Lỗi tái sử dụng năm học', 'error');
  }
}

/**
 * Tải dữ liệu thời khoá biểu từ backend
 */
export async function loadTimetableData(year, semester, week) {
  const y = year || AppState.settings.current_year;
  const s = semester || AppState.settings.current_semester;
  const w = week || AppState.currentWeek || 1;

  try {
    const resp = await fetch(`/api/timetable?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}&week=${w}`);
    if (resp.ok) {
      const data = await resp.json();
      AppState.currentTimetable = data;
      AppState.currentWeek = data.metadata?.week || w;
      renderFullGrid(data);
      updateTimetableStats(data);
    }
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu TKB:', err);
    showToast('Không thể tải thời khoá biểu', 'error');
  }
}

/**
 * Cập nhật số lượng tiết trên badge
 */
function updateTimetableStats(tt) {
  const count = tt.schedule.filter(s => s.className && s.className.trim()).length;
  const totalBadge = document.getElementById('tt-total-badge');
  const countBadge = document.getElementById('timetable-count-badge');

  if (totalBadge) totalBadge.textContent = `Tổng: ${count} tiết/tuần`;
  if (countBadge) countBadge.textContent = `${count} tiết`;
}

function getDayDateInfo(dayOfWeek, weekNumber, startDateStr) {
  const baseDateStr = startDateStr || AppState.settings.start_date || '2026-09-07';
  const week = weekNumber || AppState.currentWeek || 1;

  // baseDateStr là ngày Thứ 2 của Tuần 1
  const parts = baseDateStr.split('-');
  const baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (isNaN(baseDate.getTime())) {
    return { dateStr: '', formatted: '', isPast: false, isToday: false };
  }

  // Số ngày lệch so với Thứ 2 Tuần 1:
  // (week - 1) * 7 + (dayOfWeek - 2)
  const offsetDays = (week - 1) * 7 + (dayOfWeek - 2);
  const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);

  const dayOfMonth = targetDate.getDate();
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();
  const formatted = `${dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth}/${month < 10 ? '0' + month : month}`;
  const targetDateStr = `${year}-${month < 10 ? '0' + month : month}-${dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth}`;

  // Ngày hiện tại (Lấy từ máy chủ / mạng internet qua API)
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

/**
 * Cập nhật tiêu đề bảng với ngày tháng chính xác của từng thứ
 */
function renderTableHeaderDates(tt) {
  const startDate = tt?.metadata?.startDate || AppState.settings.start_date || '2026-09-07';
  const weekNum = tt?.metadata?.week || AppState.currentWeek || 1;

  const thElements = document.querySelectorAll('#timetable-grid-table thead th.col-day');
  thElements.forEach(th => {
    const dayNum = parseInt(th.dataset.day || th.getAttribute('data-day'));
    if (!dayNum) return;

    const dayObj = DAYS.find(d => d.num === dayNum);
    const dayName = dayObj ? dayObj.label : `Thứ ${dayNum}`;
    const dateInfo = getDayDateInfo(dayNum, weekNum, startDate);

    th.className = `col-day ${dateInfo.isToday ? 'is-today' : ''} ${dateInfo.isPast ? 'is-past' : ''}`;
    th.innerHTML = `
      <div class="th-day-wrapper">
        <span class="th-day-name">${dayName}</span>
        <span class="th-day-date">${dateInfo.formatted ? dateInfo.formatted : ''}</span>
      </div>
    `;
  });
}

/**
 * Render ma trận thời khoá biểu tuần (10 dòng x 6 cột)
 */
function renderFullGrid(tt) {
  const tbody = document.getElementById('timetable-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Render ngày tháng trên tiêu đề cột
  renderTableHeaderDates(tt);

  const startDate = tt.metadata?.startDate || AppState.settings.start_date || '2026-09-07';
  const weekNum = tt.metadata?.week || AppState.currentWeek || 1;

  const scheduleMap = {};
  tt.schedule.forEach(slot => {
    scheduleMap[`${slot.dayOfWeek}_${slot.period}`] = slot;
  });

  // Render Sáng (Tiết 1 -> 5)
  for (let p = 1; p <= 5; p++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="period-label-cell">
        <div class="period-title">Tiết ${p} (Sáng)</div>
        <div class="period-time">${PERIOD_TIMES[p]}</div>
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
      if (dateInfo.isPast) td.classList.add('is-past-cell');
      td.appendChild(createSlotCard(slot, dateInfo));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  // Dòng nghỉ trưa phân tách sáng/chiều
  const lunchTr = document.createElement('tr');
  lunchTr.className = 'lunch-break-row';
  lunchTr.innerHTML = `
    <td colspan="7">☀️ NGHỈ TRƯA (11:15 - 13:00) ☀️</td>
  `;
  tbody.appendChild(lunchTr);

  // Render Chiều (Tiết 6 -> 10)
  for (let p = 6; p <= 10; p++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="period-label-cell">
        <div class="period-title">Tiết ${p} (Chiều)</div>
        <div class="period-time">${PERIOD_TIMES[p]}</div>
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
      if (dateInfo.isPast) td.classList.add('is-past-cell');
      td.appendChild(createSlotCard(slot, dateInfo));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

/**
 * Tạo ô tiết học trong lưới tuần
 */
function createSlotCard(slot, dateInfo) {
  const card = document.createElement('div');
  const isOccupied = slot.className && slot.className.trim();
  const isPast = dateInfo && dateInfo.isPast;
  const isToday = dateInfo && dateInfo.isToday;

  card.className = `slot-card ${isOccupied ? 'occupied' : 'empty'} ${isPast ? 'is-past' : ''} ${isToday ? 'is-today-cell' : ''}`;
  card.dataset.id = slot.id;
  card.dataset.day = slot.dayOfWeek;
  card.dataset.period = slot.period;

  if (isOccupied) {
    const driveCount = slot.driveFiles ? slot.driveFiles.length : 0;
    card.innerHTML = `
      <div class="slot-header">
        <span class="class-badge">${escapeHtml(slot.className)}</span>
        <span class="room-badge">${escapeHtml(slot.room || '')}</span>
      </div>
      <div class="slot-lesson-title" title="${escapeHtml(slot.lessonTitle || 'Chưa đặt tên bài')}">
        ${escapeHtml(slot.lessonTitle || 'Chưa đặt tên bài dạy')}
      </div>
      <div class="slot-footer">
        <span class="subject-name">${escapeHtml(slot.subject || AppState.settings.subject)}</span>
        ${driveCount > 0 ? `<span class="drive-attached-indicator" title="Có ${driveCount} tài liệu Drive">📁 ${driveCount}</span>` : ''}
      </div>
    `;
  } else {
    card.innerHTML = `
      <div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 0.75rem;">
        + Trống
      </div>
    `;
  }

  // Sự kiện click: Thu gọn lịch sang góc trái, mở chi tiết bên phải
  card.addEventListener('click', () => {
    openPeriodDetail(slot.id);
  });

  return card;
}

/**
 * Mở chế độ Master-Detail (Thu gọn lưới thành cột ngày bên trái, mở chi tiết bên phải)
 */
export function openPeriodDetail(periodId) {
  const fullGrid = document.getElementById('full-grid-view');
  const splitView = document.getElementById('split-detail-view');

  if (!AppState.currentTimetable) return;

  const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === periodId);
  if (!targetSlot) return;

  AppState.selectedPeriodId = periodId;

  // 1. Chuyển đổi giao diện sang Split View
  fullGrid.classList.add('hidden');
  splitView.classList.remove('hidden');

  // 2. Render cột sidebar danh sách các tiết trong ngày đó
  renderCompactDaySidebar(targetSlot.dayOfWeek, targetSlot.id);

  // 3. Đổ dữ liệu chi tiết vào Panel bên phải
  renderLessonDetailPanel(targetSlot);

  // 4. Load danh sách file Google Drive của tiết này
  loadPeriodDriveFiles(targetSlot);
}

/**
 * Trở lại màn hình toàn tuần
 */
function showFullGridView() {
  const fullGrid = document.getElementById('full-grid-view');
  const splitView = document.getElementById('split-detail-view');

  splitView.classList.add('hidden');
  fullGrid.classList.remove('hidden');
  AppState.selectedPeriodId = null;

  // Vẽ lại bảng để cập nhật các thay đổi mới
  if (AppState.currentTimetable) {
    renderFullGrid(AppState.currentTimetable);
    updateTimetableStats(AppState.currentTimetable);
  }
}

/**
 * Render thanh sidebar thu gọn danh sách tiết trong ngày (Master Column)
 */
function renderCompactDaySidebar(dayOfWeek, activePeriodId) {
  const titleEl = document.getElementById('sidebar-day-title');
  const listEl = document.getElementById('compact-period-list');
  const dayName = DAYS.find(d => d.num === dayOfWeek)?.label || `Thứ ${dayOfWeek}`;

  const startDate = AppState.currentTimetable?.metadata?.startDate || AppState.settings.start_date || '2026-09-07';
  const weekNum = AppState.currentTimetable?.metadata?.week || AppState.currentWeek || 1;
  const dateInfo = getDayDateInfo(dayOfWeek, weekNum, startDate);

  titleEl.innerHTML = `${dayName} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">(${dateInfo.formatted})</span>`;
  listEl.innerHTML = '';

  const daySlots = AppState.currentTimetable.schedule
    .filter(s => s.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.period - b.period);

  daySlots.forEach(slot => {
    const item = document.createElement('div');
    const isActive = slot.id === activePeriodId;
    const hasClass = slot.className && slot.className.trim();
    const isPast = dateInfo.isPast;

    item.className = `compact-period-item ${isActive ? 'active' : ''} ${isPast ? 'is-past' : ''}`;
    item.innerHTML = `
      <div class="compact-period-meta">
        <span class="p-tag">Tiết ${slot.period} • ${PERIOD_TIMES[slot.period]}</span>
        <span class="p-class">${hasClass ? escapeHtml(slot.className) : '<span style="color: #94a3b8; font-weight: normal;">(Trống)</span>'}</span>
      </div>
      ${slot.driveFiles && slot.driveFiles.length > 0 ? `<span>📁</span>` : ''}
    `;

    item.addEventListener('click', () => {
      openPeriodDetail(slot.id);
    });

    listEl.appendChild(item);
  });
}

/**
 * Đổ dữ liệu vào Form chi tiết bài giảng bên phải
 */
function renderLessonDetailPanel(slot) {
  const dayName = DAYS.find(d => d.num === slot.dayOfWeek)?.label || `Thứ ${slot.dayOfWeek}`;
  
  document.getElementById('panel-period-tag').textContent = `${dayName} • Tiết ${slot.period}`;
  document.getElementById('panel-class-title').textContent = slot.className ? `Lớp ${slot.className} - Môn ${slot.subject || AppState.settings.subject}` : 'Tiết dạy chưa phân công lớp';
  document.getElementById('panel-time-sub').textContent = `${PERIOD_TIMES[slot.period]} ${slot.room ? `• Phòng: ${slot.room}` : ''}`;

  document.getElementById('input-lesson-title').value = slot.lessonTitle || '';
  document.getElementById('input-lesson-class').value = slot.className || '';
  document.getElementById('input-lesson-room').value = slot.room || '';
  document.getElementById('input-lesson-objective').value = slot.lessonObjective || '';
  document.getElementById('input-lesson-notes').value = slot.notes || '';
}

/**
 * Kích hoạt AI đọc tài liệu và tự điền tên bài, mục tiêu bài học
 */
async function triggerAiDocAnalysis() {
  if (!AppState.selectedPeriodId || !AppState.currentTimetable) {
    showToast('Vui lòng chọn một tiết học có đính kèm tài liệu', 'warning');
    return;
  }

  const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === AppState.selectedPeriodId);
  if (!targetSlot || !targetSlot.driveFiles || targetSlot.driveFiles.length === 0) {
    showToast('Tiết học chưa có tài liệu nào đính kèm để AI phân tích!', 'warning');
    return;
  }

  const aiBtn = document.getElementById('btn-ai-analyze-doc');
  if (aiBtn) {
    aiBtn.disabled = true;
    aiBtn.innerHTML = '<span class="ai-sparkle">⏳</span> <span>AI đang đọc tài liệu...</span>';
  }

  showToast('Gemini AI đang đọc tài liệu và trích xuất tên bài, mục tiêu...', 'info');

  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;
  const w = AppState.currentWeek || 1;
  const token = AppState.googleAccessToken || sessionStorage.getItem('google_drive_token') || '';

  try {
    let url = `/api/timetable/lesson/${targetSlot.id}/analyze-ai?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}&week=${w}`;
    if (token) {
      url += `&access_token=${encodeURIComponent(token)}`;
    }
    const resp = await fetch(url, {
      method: 'POST'
    });

    if (resp.ok) {
      const data = await resp.json();
      const res = data.ai_result || (data.slot ? { lesson_title: data.slot.lessonTitle, lesson_objective: data.slot.lessonObjective } : null);
      if (res) {
        if (res.lesson_title) {
          document.getElementById('input-lesson-title').value = res.lesson_title;
          targetSlot.lessonTitle = res.lesson_title;
        }
        if (res.lesson_objective) {
          document.getElementById('input-lesson-objective').value = res.lesson_objective;
          targetSlot.lessonObjective = res.lesson_objective;
        }
        showToast('✨ AI đã tự động điền Tên bài và Mục tiêu thành công!', 'success');
      } else {
        showToast('Không tìm thấy nội dung bài học trong tài liệu', 'info');
      }
    } else {
      const err = await resp.json();
      showToast(`Lỗi phân tích: ${err.detail || 'Không thể phân tích file'}`, 'error');
    }
  } catch (err) {
    showToast('Lỗi khi gọi AI phân tích tài liệu', 'error');
  } finally {
    if (aiBtn) {
      aiBtn.disabled = false;
      aiBtn.innerHTML = '<span class="ai-sparkle">✨</span> <span>AI Tự điền từ tài liệu</span>';
    }
  }
}

/**
 * Lưu thông tin form bài giảng (tự động kích hoạt AI diff check nếu có tài liệu mới)
 */
async function saveCurrentLessonDetail() {
  if (!AppState.selectedPeriodId || !AppState.currentTimetable) return;

  const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === AppState.selectedPeriodId);
  if (!targetSlot) return;

  const title = document.getElementById('input-lesson-title').value.trim();
  const cls = document.getElementById('input-lesson-class').value.trim();
  const room = document.getElementById('input-lesson-room').value.trim();
  const obj = document.getElementById('input-lesson-objective').value.trim();
  const notes = document.getElementById('input-lesson-notes').value.trim();

  // Cập nhật local state
  targetSlot.lessonTitle = title;
  targetSlot.className = cls;
  targetSlot.room = room;
  targetSlot.lessonObjective = obj;
  targetSlot.notes = notes;

  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;
  const w = AppState.currentWeek || 1;

  try {
    const resp = await fetch(`/api/timetable/lesson/${targetSlot.id}?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}&week=${w}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonTitle: title,
        className: cls,
        room: room,
        lessonObjective: obj,
        notes: notes,
        auto_analyze_ai: true
      })
    });

    if (resp.ok) {
      const result = await resp.json();
      if (result.slot) {
        // Cập nhật lại form nếu AI tự điền thêm thông tin mới từ diff check
        if (result.slot.lessonTitle && !title) {
          document.getElementById('input-lesson-title').value = result.slot.lessonTitle;
          targetSlot.lessonTitle = result.slot.lessonTitle;
        }
        if (result.slot.lessonObjective && !obj) {
          document.getElementById('input-lesson-objective').value = result.slot.lessonObjective;
          targetSlot.lessonObjective = result.slot.lessonObjective;
        }
      }

      showToast('Đã lưu bài học thành công', 'success');
      // Cập nhật tiêu đề bên ngoài
      document.getElementById('panel-class-title').textContent = cls ? `Lớp ${cls} - Môn ${targetSlot.subject || AppState.settings.subject}` : 'Tiết trống';
      // Render lại sidebar
      renderCompactDaySidebar(targetSlot.dayOfWeek, targetSlot.id);
    }
  } catch (e) {
    showToast('Lỗi khi lưu bài học', 'error');
  }
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
