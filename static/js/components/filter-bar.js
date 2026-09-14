/**
 * FILTER BAR COMPONENT
 * Thanh điều hướng tuần, nút nhảy về "Hôm nay", bộ lọc lớp học dạng Chip theo UINew
 */

import { AppState, showToast } from '../app.js';
import { loadTimetableData, getDayDateInfo } from './timetable-grid.js';

export let currentClassFilter = 'ALL';

export function initFilterBar() {
  const prevBtn = document.getElementById('btn-prev-week');
  const nextBtn = document.getElementById('btn-next-week');
  const todayBtn = document.getElementById('btn-jump-today');
  const termSelect = document.getElementById('filter-term-select');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      navigateWeek(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      navigateWeek(1);
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      jumpToToday();
    });
  }

  if (termSelect) {
    termSelect.addEventListener('change', async (e) => {
      const [year, sem] = e.target.value.split('|');
      if (year && sem) {
        AppState.settings.current_year = year;
        AppState.settings.current_semester = sem;
        await loadTimetableData(year, sem, AppState.currentWeek || 1);
      }
    });
  }

  // Mobile day switcher chips (T2 -> T7)
  const mobileChips = document.querySelectorAll('.mobile-day-chip');
  mobileChips.forEach(chip => {
    chip.addEventListener('click', () => {
      mobileChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const dayNum = parseInt(chip.dataset.day);
      if (dayNum) {
        // Highlight or filter column in mobile view
        filterDayMobile(dayNum);
      }
    });
  });
}

export function updateWeekDisplay() {
  const label = document.getElementById('week-nav-label');
  const startDate = AppState.currentTimetable?.metadata?.startDate || AppState.settings.start_date || '2026-09-07';
  const weekNum = AppState.currentWeek || 1;

  const mon = getDayDateInfo(2, weekNum, startDate);
  const sat = getDayDateInfo(7, weekNum, startDate);
  const dateStr = (mon.formatted && sat.formatted) ? ` (${mon.formatted} - ${sat.formatted})` : '';

  if (label) {
    label.textContent = `Tuần ${weekNum}${dateStr}`;
  }
}

export function updateClassChips(schedule) {
  const container = document.getElementById('class-filter-chips');
  if (!container) return;

  // Extract unique class names
  const classesSet = new Set();
  (schedule || []).forEach(slot => {
    if (slot.className && slot.className.trim()) {
      classesSet.add(slot.className.trim());
    }
  });

  const sortedClasses = Array.from(classesSet).sort();

  container.innerHTML = `
    <span class="filter-label">🏷️ Lớp:</span>
    <button class="class-filter-chip ${currentClassFilter === 'ALL' ? 'active' : ''}" data-class="ALL">
      Tất cả
    </button>
  `;

  sortedClasses.forEach(cls => {
    const chip = document.createElement('button');
    chip.className = `class-filter-chip ${currentClassFilter === cls ? 'active' : ''}`;
    chip.dataset.class = cls;
    chip.textContent = cls;
    container.appendChild(chip);
  });

  // Attach click events
  container.querySelectorAll('.class-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.class-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentClassFilter = chip.dataset.class;
      applyClassFilter(currentClassFilter);
    });
  });
}

function applyClassFilter(cls) {
  const cards = document.querySelectorAll('.period-card');
  cards.forEach(card => {
    if (cls === 'ALL') {
      card.style.opacity = '1';
      card.style.filter = 'none';
      return;
    }
    const cardClass = card.querySelector('.class-badge')?.textContent?.trim();
    if (cardClass === cls) {
      card.style.opacity = '1';
      card.style.filter = 'none';
    } else {
      card.style.opacity = '0.35';
      card.style.filter = 'grayscale(0.5)';
    }
  });
}

let isNavigating = false;

async function navigateWeek(delta) {
  if (isNavigating) return;
  isNavigating = true;

  try {
    const current = AppState.currentWeek || 1;
    const newWeek = Math.max(1, current + delta);
    AppState.currentWeek = newWeek;
    updateWeekDisplay();
    await loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, newWeek);
  } finally {
    setTimeout(() => {
      isNavigating = false;
    }, 250);
  }
}

function jumpToToday() {
  const startDate = AppState.settings.start_date || '2026-09-07';
  const todayStr = AppState.serverDate || new Date().toISOString().split('T')[0];

  // Tính tuần tương ứng với ngày hôm nay
  const parts1 = startDate.split('-');
  const parts2 = todayStr.split('-');
  const d1 = new Date(parseInt(parts1[0]), parseInt(parts1[1]) - 1, parseInt(parts1[2]));
  const d2 = new Date(parseInt(parts2[0]), parseInt(parts2[1]) - 1, parseInt(parts2[2]));

  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  let calculatedWeek = Math.floor(diffDays / 7) + 1;
  if (calculatedWeek < 1) calculatedWeek = 1;

  AppState.currentWeek = calculatedWeek;
  updateWeekDisplay();
  loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, calculatedWeek);
  showToast(`Đã chuyển tới Tuần ${calculatedWeek} (Tuần hiện tại)`, 'info');
}

function filterDayMobile(dayNum) {
  const cols = document.querySelectorAll('.timetable-table th.col-day, .timetable-table td');
  // Scroll to column on mobile
  const th = document.querySelector(`.timetable-table th[data-day="${dayNum}"]`);
  if (th) {
    th.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}
