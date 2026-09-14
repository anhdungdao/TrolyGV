/**
 * HEADER COMPONENT
 * Quản lý thanh tiêu đề ứng dụng, thương hiệu EduPlan, trạng thái đồng bộ Drive & nút mở AI
 */

import { AppState } from '../app.js';
import { openDrawer } from './ai-drawer.js';
import { openSettingsModal } from './settings-modal.js';
export function initHeader() {
  const aiDrawerBtn = document.getElementById('btn-open-ai-drawer');
  const settingsBtn = document.getElementById('btn-open-settings');
  const syncBtn = document.getElementById('btn-header-sync');

  if (aiDrawerBtn) {
    aiDrawerBtn.addEventListener('click', () => {
      openDrawer();
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      openSettingsModal();
    });
  }

  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      const { handleManualSync, ensureValidDriveToken, updateSyncUIStatus } = await import('../drive-sync.js');
      if (!AppState.googleAccessToken) {
        await ensureValidDriveToken(true);
        updateSyncUIStatus();
      } else {
        await handleManualSync();
      }
    });
  }

  updateHeaderUI();
}

export function updateHeaderUI() {
  const teacherSub = document.getElementById('header-teacher-name');
  const termPill = document.getElementById('header-term-pill');

  if (teacherSub) {
    teacherSub.textContent = `${AppState.settings.teacher_name || 'Giáo viên'} • ${AppState.settings.subject || 'Toàn trường'}`;
  }

  if (termPill) {
    termPill.textContent = `${AppState.settings.current_year || '2025-2026'} • ${AppState.settings.current_semester || 'HK1'}`;
  }
}
