/**
 * SETTINGS CONTROLLER
 * Quản lý cấu hình API key Gemini, Google Drive và thông tin giáo viên
 */

import { AppState, showToast, updateHeaderInfo } from './app.js';
import { loadTimetableData } from './tab2-timetable.js';

export function initSettings() {
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const cancelBtn = document.getElementById('btn-cancel-settings');
  const modal = document.getElementById('settings-modal');
  const form = document.getElementById('settings-form');
  const toggleEyeBtn = document.getElementById('btn-toggle-gemini-key');
  const keyInput = document.getElementById('setting-gemini-key');

  // Open modal from header button
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      populateFormFields();
      modal.classList.remove('hidden');
    });
  }

  // Open modal from welcome guide card
  const welcomeOpenBtn = document.getElementById('welcome-btn-open-settings');
  if (welcomeOpenBtn) {
    welcomeOpenBtn.addEventListener('click', () => {
      populateFormFields();
      modal.classList.remove('hidden');
    });
  }

  // Close modal
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Toggle API key visibility
  toggleEyeBtn.addEventListener('click', () => {
    if (keyInput.type === 'password') {
      keyInput.type = 'text';
      toggleEyeBtn.textContent = '🙈';
    } else {
      keyInput.type = 'password';
      toggleEyeBtn.textContent = '👁️';
    }
  });

  // Save Settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedData = {
      gemini_api_key: document.getElementById('setting-gemini-key').value.trim(),
      gemini_model: document.getElementById('setting-gemini-model').value || 'gemini-2.5-flash',
      teacher_name: document.getElementById('setting-teacher-name').value.trim() || 'Giáo viên',
      subject: document.getElementById('setting-subject').value.trim() || 'Toàn trường',
      current_year: document.getElementById('setting-year').value.trim() || '2025-2026',
      current_semester: document.getElementById('setting-sem').value || 'HK1',
      start_date: document.getElementById('setting-start-date')?.value || '2026-09-07',
      google_drive_client_id: (document.getElementById('setting-drive-client-id')?.value || '').trim(),
      google_drive_api_key: (document.getElementById('setting-drive-api-key')?.value || '').trim()
    };

    try {
      const resp = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (resp.ok) {
        const result = await resp.json();
        AppState.settings = result.settings;
        updateHeaderInfo();
        modal.classList.add('hidden');
        showToast('Đã lưu cài đặt thành công!', 'success');

        // Cập nhật lại dropdown năm học trên toolbar
        const yearSelect = document.getElementById('select-academic-year');
        const semSelect = document.getElementById('select-semester');
        if (yearSelect) yearSelect.value = AppState.settings.current_year;
        if (semSelect) semSelect.value = AppState.settings.current_semester;

        loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester);
      } else {
        showToast('Lỗi khi lưu cài đặt', 'error');
      }
    } catch (err) {
      showToast('Không thể kết nối đến server', 'error');
    }
  });
}

export async function loadSettings() {
  try {
    const resp = await fetch('/api/settings');
    if (resp.ok) {
      const data = await resp.json();
      AppState.settings = data;
    }
  } catch (err) {
    console.warn('Sử dụng cài đặt mặc định do chưa tải được cấu hình');
  }
}

function populateFormFields() {
  document.getElementById('setting-gemini-key').value = AppState.settings.gemini_api_key || '';
  const modelSelect = document.getElementById('setting-gemini-model');
  if (modelSelect) {
    modelSelect.value = AppState.settings.gemini_model || 'gemini-2.5-flash';
  }
  document.getElementById('setting-teacher-name').value = AppState.settings.teacher_name || '';
  document.getElementById('setting-subject').value = AppState.settings.subject || '';
  document.getElementById('setting-year').value = AppState.settings.current_year || '2025-2026';
  document.getElementById('setting-sem').value = AppState.settings.current_semester || 'HK1';
  const startDateInput = document.getElementById('setting-start-date');
  if (startDateInput) {
    startDateInput.value = AppState.settings.start_date || '2026-09-07';
  }
  const clientIdInput = document.getElementById('setting-drive-client-id');
  if (clientIdInput) {
    clientIdInput.value = AppState.settings.google_drive_client_id || '';
  }
  document.getElementById('setting-drive-key').value = AppState.settings.google_drive_api_key || '';
}
