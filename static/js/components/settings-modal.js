/**
 * SETTINGS MODAL COMPONENT
 * Quản lý cấu hình API key Gemini, Google Drive OAuth, thông tin giáo viên và năm học
 */

import { AppState, showToast } from '../app.js';
import { updateHeaderUI } from './header.js';
import { loadTimetableData } from './timetable-grid.js';

export function initSettingsModal() {
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const cancelBtn = document.getElementById('btn-cancel-settings');
  const modal = document.getElementById('settings-modal');
  const form = document.getElementById('settings-form');
  const toggleEyeBtn = document.getElementById('btn-toggle-gemini-key');
  const keyInput = document.getElementById('setting-gemini-key');

  const manualSyncBtn = document.getElementById('btn-settings-manual-sync');
  const restoreBackupBtn = document.getElementById('btn-settings-restore-backup');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      openSettingsModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeSettingsModal();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeSettingsModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSettingsModal();
      }
    });
  }

  if (toggleEyeBtn && keyInput) {
    toggleEyeBtn.addEventListener('click', () => {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        toggleEyeBtn.textContent = '🙈';
      } else {
        keyInput.type = 'password';
        toggleEyeBtn.textContent = '👁️';
      }
    });
  }

  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', async () => {
      const { handleManualSync } = await import('../drive-sync.js');
      await handleManualSync();
    });
  }

  if (restoreBackupBtn) {
    restoreBackupBtn.addEventListener('click', async () => {
      const { restoreFromCloudBackup } = await import('../drive-sync.js');
      await restoreFromCloudBackup();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const updatedData = {
        gemini_api_key: (document.getElementById('setting-gemini-key')?.value || '').trim(),
        gemini_model: document.getElementById('setting-gemini-model')?.value || 'gemini-2.5-flash',
        teacher_name: (document.getElementById('setting-teacher-name')?.value || '').trim() || 'Giáo viên',
        subject: (document.getElementById('setting-subject')?.value || '').trim() || 'Toàn trường',
        current_year: (document.getElementById('setting-year')?.value || '').trim() || '2025-2026',
        current_semester: document.getElementById('setting-sem')?.value || 'HK1',
        start_date: document.getElementById('setting-start-date')?.value || '2026-09-07',
        google_drive_client_id: (document.getElementById('setting-drive-client-id')?.value || '').trim(),
        google_drive_api_key: (document.getElementById('setting-drive-key')?.value || '').trim()
      };

      AppState.settings = Object.assign({}, AppState.settings, updatedData);
      localStorage.setItem('troly_gv_settings', JSON.stringify(AppState.settings));
      updateHeaderUI();

      try {
        const resp = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });

        if (resp.ok) {
          const result = await resp.json();
          AppState.settings = Object.assign({}, AppState.settings, result.settings);
          localStorage.setItem('troly_gv_settings', JSON.stringify(AppState.settings));
          updateHeaderUI();
          closeSettingsModal();
          showToast('Đã lưu cài đặt thành công!', 'success');
          try {
            const { triggerAutoSync } = await import('../drive-sync.js');
            triggerAutoSync();
          } catch (e) {}
          await loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, AppState.currentWeek || 1);
        } else {
          closeSettingsModal();
          showToast('Đã lưu cài đặt cục bộ', 'info');
          try {
            const { triggerAutoSync } = await import('../drive-sync.js');
            triggerAutoSync();
          } catch (e) {}
        }
      } catch (err) {
        closeSettingsModal();
        showToast('Đã lưu cài đặt ngoại tuyến', 'info');
        triggerAutoSync();
      }
    });
  }
}

export function openSettingsModal() {
  populateFormFields();
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.add('active');
}

export function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('active');
}

export function populateFormFields() {
  const s = AppState.settings || {};
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('setting-gemini-key', s.gemini_api_key);
  setVal('setting-gemini-model', s.gemini_model || 'gemini-2.5-flash');
  setVal('setting-teacher-name', s.teacher_name || 'Giáo viên');
  setVal('setting-subject', s.subject || 'Toàn trường');
  setVal('setting-year', s.current_year || '2025-2026');
  setVal('setting-sem', s.current_semester || 'HK1');
  setVal('setting-start-date', s.start_date || '2026-09-07');
  setVal('setting-drive-client-id', s.google_drive_client_id);
  setVal('setting-drive-key', s.google_drive_api_key);
}

export async function loadSettings() {
  try {
    const cached = localStorage.getItem('troly_gv_settings');
    if (cached) {
      AppState.settings = Object.assign({}, AppState.settings, JSON.parse(cached));
    }
  } catch (e) {}

  try {
    const resp = await fetch('/api/settings');
    if (resp.ok) {
      const data = await resp.json();
      AppState.settings = Object.assign({}, AppState.settings, data);
      localStorage.setItem('troly_gv_settings', JSON.stringify(AppState.settings));
    }
  } catch (err) {
    console.warn('Đang tải cài đặt từ bộ nhớ cục bộ');
  }
}
