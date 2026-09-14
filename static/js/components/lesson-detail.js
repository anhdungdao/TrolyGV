/**
 * LESSON DETAIL COMPONENT (DETAIL PANEL - 70% WIDTH)
 * Chỉnh sửa bài học, mục tiêu, tích hợp AI tự phân tích tài liệu và gán Google Drive
 */

import { AppState, showToast } from '../app.js';
import { DAYS, PERIOD_TIMES } from './timetable-grid.js';
import { renderCompactDaySidebar } from './single-day.js';

export function initLessonDetail() {
  const saveBtn = document.getElementById('btn-save-lesson-detail');
  const aiAnalyzeBtn = document.getElementById('btn-ai-analyze-doc');

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      await saveCurrentLesson();
    });
  }

  if (aiAnalyzeBtn) {
    aiAnalyzeBtn.addEventListener('click', async () => {
      await triggerAiDocAnalysis();
    });
  }
}

export function renderLessonDetailPanel(slot) {
  const dayName = DAYS.find(d => d.num === slot.dayOfWeek)?.label || `Thứ ${slot.dayOfWeek}`;
  const periodLabel = slot.period <= 5 
    ? `Tiết ${slot.period} (Sáng)` 
    : `Tiết ${slot.period - 5} (Chiều)`;
  
  const tagEl = document.getElementById('panel-period-tag');
  const classEl = document.getElementById('panel-class-title');
  const timeEl = document.getElementById('panel-time-sub');

  if (tagEl) tagEl.textContent = `${dayName} • ${periodLabel}`;
  if (classEl) {
    classEl.textContent = slot.className 
      ? `Lớp ${slot.className} - Môn ${slot.subject || AppState.settings.subject}` 
      : 'Tiết học (Chưa phân lớp)';
  }
  if (timeEl) {
    timeEl.textContent = `${PERIOD_TIMES[slot.period] || ''} ${slot.room ? `• Phòng: ${slot.room}` : ''}`;
  }

  const titleInput = document.getElementById('input-lesson-title');
  const classInput = document.getElementById('input-lesson-class');
  const roomInput = document.getElementById('input-lesson-room');
  const objInput = document.getElementById('input-lesson-objective');
  const notesInput = document.getElementById('input-lesson-notes');

  if (titleInput) titleInput.value = slot.lessonTitle || '';
  if (classInput) classInput.value = slot.className || '';
  if (roomInput) roomInput.value = slot.room || '';
  if (objInput) objInput.value = slot.lessonObjective || '';
  if (notesInput) notesInput.value = slot.notes || '';
}

async function triggerAiDocAnalysis() {
  if (!AppState.selectedPeriodId || !AppState.currentTimetable) {
    showToast('Vui lòng chọn một tiết học', 'warning');
    return;
  }

  const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === AppState.selectedPeriodId);
  if (!targetSlot || !targetSlot.driveFiles || targetSlot.driveFiles.length === 0) {
    showToast('Tiết học chưa có tài liệu đính kèm để AI phân tích! Hãy đính kèm file Drive ở dưới.', 'warning');
    return;
  }

  const aiBtn = document.getElementById('btn-ai-analyze-doc');
  if (aiBtn) {
    aiBtn.disabled = true;
    aiBtn.innerHTML = '<span>⏳</span> <span>AI đang phân tích...</span>';
  }

  showToast('Gemini AI đang đọc tài liệu giáo án và trích xuất nội dung...', 'info');

  const y = AppState.settings.current_year;
  const s = AppState.settings.current_semester;
  const w = AppState.currentWeek || 1;
  const token = AppState.googleAccessToken || sessionStorage.getItem('google_drive_token') || '';

  try {
    let url = `/api/timetable/lesson/${targetSlot.id}/analyze-ai?year=${encodeURIComponent(y)}&semester=${encodeURIComponent(s)}&week=${w}`;
    if (token) {
      url += `&access_token=${encodeURIComponent(token)}`;
    }
    const resp = await fetch(url, { method: 'POST' });

    if (resp.ok) {
      const data = await resp.json();
      const res = data.ai_result || (data.slot ? { lesson_title: data.slot.lessonTitle, lesson_objective: data.slot.lessonObjective } : null);
      if (res) {
        if (res.lesson_title) {
          const titleInput = document.getElementById('input-lesson-title');
          if (titleInput) titleInput.value = res.lesson_title;
          targetSlot.lessonTitle = res.lesson_title;
        }
        if (res.lesson_objective) {
          const objInput = document.getElementById('input-lesson-objective');
          if (objInput) objInput.value = res.lesson_objective;
          targetSlot.lessonObjective = res.lesson_objective;
        }
        showToast('✨ AI đã điền Tên bài & Mục tiêu từ giáo án thành công!', 'success');
      } else {
        showToast('Không tìm thấy thông tin bài học phù hợp trong tệp', 'info');
      }
    } else {
      const err = await resp.json();
      showToast(`Lỗi phân tích: ${err.detail || 'Không thể đọc tệp'}`, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối khi gọi AI phân tích tài liệu', 'error');
  } finally {
    if (aiBtn) {
      aiBtn.disabled = false;
      aiBtn.innerHTML = '<span>✨</span> <span>AI Tự điền từ tài liệu</span>';
    }
  }
}

async function saveCurrentLesson() {
  if (!AppState.selectedPeriodId || !AppState.currentTimetable) return;

  const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === AppState.selectedPeriodId);
  if (!targetSlot) return;

  const title = (document.getElementById('input-lesson-title')?.value || '').trim();
  const cls = (document.getElementById('input-lesson-class')?.value || '').trim();
  const room = (document.getElementById('input-lesson-room')?.value || '').trim();
  const obj = (document.getElementById('input-lesson-objective')?.value || '').trim();
  const notes = (document.getElementById('input-lesson-notes')?.value || '').trim();

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
      showToast('Đã lưu bài học thành công!', 'success');
      const classEl = document.getElementById('panel-class-title');
      if (classEl) {
        classEl.textContent = cls ? `Lớp ${cls} - Môn ${targetSlot.subject || AppState.settings.subject}` : 'Tiết học (Chưa phân lớp)';
      }
      renderCompactDaySidebar(targetSlot.dayOfWeek, targetSlot.id);

      const storageKey = `troly_gv_tt_${y}_${s}_week_${w}`;
      localStorage.setItem(storageKey, JSON.stringify(AppState.currentTimetable));
      try { const { triggerAutoSync } = await import('../drive-sync.js'); triggerAutoSync(); } catch(e) {}
    }
  } catch (e) {
    showToast('Đã lưu bài học vào bộ nhớ cục bộ', 'info');
    const storageKey = `troly_gv_tt_${y}_${s}_week_${w}`;
    localStorage.setItem(storageKey, JSON.stringify(AppState.currentTimetable));
    try { const { triggerAutoSync } = await import('../drive-sync.js'); triggerAutoSync(); } catch(e) {}
  }
}
