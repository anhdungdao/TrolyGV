/**
 * GOOGLE DRIVE LIVE SEARCH & FILE MANAGER (VẤN ĐỀ 3)
 * Tìm kiếm tài liệu, giáo án trong Drive và gán/gỡ khỏi tiết học
 */

import { AppState, showToast } from './app.js';

let searchTimeout = null;

export function initDriveSearch() {
  const searchInput = document.getElementById('drive-search-input');
  const clearBtn = document.getElementById('btn-clear-drive-search');
  const resultsContainer = document.getElementById('drive-search-results');
  const directUploadInput = document.getElementById('input-direct-upload');
  const connectDriveBtn = document.getElementById('btn-connect-drive');

  // Khởi tạo trạng thái kết nối Google Drive nếu đã có token
  updateDriveConnectionUI();

  if (connectDriveBtn) {
    connectDriveBtn.addEventListener('click', () => {
      handleGoogleDriveLogin();
    });
  }

  // Debounced search on typing
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.trim()) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performDriveSearch(val);
    }, 300);
  });

  // Focus on search input shows results if available
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      resultsContainer.classList.remove('hidden');
    } else {
      performDriveSearch(''); // Hiển thị các file gợi ý gần đây
    }
  });

  // Clear search input
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    resultsContainer.classList.add('hidden');
  });

  // Click outside to hide results dropdown
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.drive-search-box')) {
      resultsContainer.classList.add('hidden');
    }
  });

  // Direct Upload file to Drive
  directUploadInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadDirectFile(e.target.files[0]);
      directUploadInput.value = '';
    }
  });
}

/**
 * Xử lý đăng nhập Google Drive qua Google Identity Services (GIS)
 */
function handleGoogleDriveLogin() {
  const clientId = (AppState.settings && AppState.settings.google_drive_client_id) || '';
  if (!clientId.trim()) {
    showToast('Cô vui lòng nhập Google Client ID trong mục ⚙️ Cài đặt để kết nối Drive nhé!', 'warning');
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('hidden');
    return;
  }

  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    showToast('Đang tải thư viện xác thực Google... Vui lòng thử lại sau vài giây nhé!', 'info');
    return;
  }

  try {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          AppState.googleAccessToken = tokenResponse.access_token;
          sessionStorage.setItem('google_drive_token', tokenResponse.access_token);
          showToast('Đã kết nối tài khoản Google Drive thành công!', 'success');
          updateDriveConnectionUI();
        } else if (tokenResponse && tokenResponse.error) {
          showToast(`Lỗi kết nối Google: ${tokenResponse.error}`, 'error');
        }
      }
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (err) {
    showToast(`Không thể mở xác thực Google: ${err.message}`, 'error');
  }
}

function updateDriveConnectionUI() {
  const token = AppState.googleAccessToken || sessionStorage.getItem('google_drive_token');
  const btn = document.getElementById('btn-connect-drive');
  const textSpan = document.getElementById('drive-connect-text');

  if (btn && textSpan) {
    if (token) {
      btn.style.borderColor = '#10b981';
      btn.style.color = '#10b981';
      textSpan.textContent = '✅ Đã kết nối Drive';
      btn.title = 'Đã kết nối tài khoản Google Drive. Bấm để kết nối lại';
    } else {
      btn.style.borderColor = '';
      btn.style.color = '';
      textSpan.textContent = '🔗 Kết nối Google Drive';
      btn.title = 'Đăng nhập Google Drive để tự động tải và đồng bộ bài giảng lên Drive của cô';
    }
  }
}

/**
 * Tìm kiếm file trong Google Drive qua Backend API
 */
async function performDriveSearch(keyword) {
  const resultsContainer = document.getElementById('drive-search-results');
  resultsContainer.innerHTML = '<div style="padding: 10px; font-size: 0.8rem; color: #64748b;">Đang tìm trong Google Drive...</div>';
  resultsContainer.classList.remove('hidden');

  const token = AppState.googleAccessToken || sessionStorage.getItem('google_drive_token') || '';
  let url = `/api/drive/search?q=${encodeURIComponent(keyword)}`;
  if (token) {
    url += `&access_token=${encodeURIComponent(token)}`;
  }

  try {
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      renderSearchResults(data.files || []);
    } else {
      resultsContainer.innerHTML = '<div style="padding: 10px; font-size: 0.8rem; color: #ef4444;">Lỗi khi tìm kiếm trên Drive</div>';
    }
  } catch (err) {
    resultsContainer.innerHTML = '<div style="padding: 10px; font-size: 0.8rem; color: #ef4444;">Không thể kết nối đến Google Drive</div>';
  }
}

/**
 * Render danh sách kết quả tìm kiếm từ Drive
 */
function renderSearchResults(files) {
  const resultsContainer = document.getElementById('drive-search-results');
  resultsContainer.innerHTML = '';

  if (files.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 12px; font-size: 0.82rem; color: #94a3b8; text-align: center;">Không tìm thấy file nào khớp với từ khoá</div>';
    return;
  }

  files.forEach(file => {
    const item = document.createElement('div');
    item.className = 'drive-search-item';

    const icon = getFileIcon(file.mimeType, file.name);
    const dateStr = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('vi-VN') : '';

    item.innerHTML = `
      <div class="file-info-group">
        <span class="file-type-icon">${icon}</span>
        <div>
          <div class="file-name-text" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
          <div class="file-time-text">${dateStr ? `Cập nhật: ${dateStr}` : ''}</div>
        </div>
      </div>
      <button class="btn-attach-action" title="Gán vào tiết học hiện tại">
        <span>+ Gán</span>
      </button>
    `;

    const attachBtn = item.querySelector('.btn-attach-action');
    attachBtn.addEventListener('click', async () => {
      await attachFileToCurrentPeriod(file);
      resultsContainer.classList.add('hidden');
    });

    resultsContainer.appendChild(item);
  });
}

/**
 * Gán file Google Drive vào tiết học
 */
async function attachFileToCurrentPeriod(file) {
  if (!AppState.selectedPeriodId || !AppState.currentTimetable) {
    showToast('Vui lòng chọn một tiết học trước', 'warning');
    return;
  }

  const week = AppState.currentWeek || 1;
  try {
    const resp = await fetch(`/api/drive/attach?year=${encodeURIComponent(AppState.settings.current_year)}&semester=${encodeURIComponent(AppState.settings.current_semester)}&week=${week}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_id: AppState.selectedPeriodId,
        file: file
      })
    });

    if (resp.ok) {
      const data = await resp.json();
      showToast(`Đã gán tài liệu "${file.name}"`, 'success');

      // Cập nhật slot trong state
      const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === AppState.selectedPeriodId);
      if (targetSlot) {
        targetSlot.driveFiles = data.slot.driveFiles;
        renderAttachedFiles(targetSlot.driveFiles);
      }
    }
  } catch (err) {
    showToast('Lỗi khi gán tài liệu', 'error');
  }
}

/**
 * Tải file trực tiếp từ máy lên Drive và gán luôn vào tiết học
 */
async function uploadDirectFile(file) {
  if (!AppState.selectedPeriodId) {
    showToast('Vui lòng chọn một tiết học để gán file', 'warning');
    return;
  }

  showToast(`Đang tải lên "${file.name}"...`, 'info');
  const formData = new FormData();
  formData.append('file', file);

  const week = AppState.currentWeek || 1;
  const token = AppState.googleAccessToken || sessionStorage.getItem('google_drive_token') || '';
  let url = `/api/drive/upload?period_id=${AppState.selectedPeriodId}&year=${encodeURIComponent(AppState.settings.current_year)}&semester=${encodeURIComponent(AppState.settings.current_semester)}&week=${week}`;
  if (token) {
    url += `&access_token=${encodeURIComponent(token)}`;
  }

  try {
    const resp = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (resp.ok) {
      const result = await resp.json();
      showToast(`Tải lên thành công: ${file.name}`, 'success');

      const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === AppState.selectedPeriodId);
      if (targetSlot) {
        targetSlot.driveFiles = targetSlot.driveFiles || [];
        targetSlot.driveFiles.push(result.file);
        renderAttachedFiles(targetSlot.driveFiles);
      }
    }
  } catch (err) {
    showToast('Lỗi tải file lên', 'error');
  }
}

/**
 * Hiển thị danh sách file đã gán của 1 tiết
 */
export function loadPeriodDriveFiles(slot) {
  renderAttachedFiles(slot.driveFiles || []);
}

function renderAttachedFiles(files) {
  const container = document.getElementById('attached-files-list');
  if (!container) return;
  container.innerHTML = '';

  if (!files || files.length === 0) {
    container.innerHTML = '<p class="empty-files-text">Chưa có tài liệu nào. Tìm kiếm ở trên hoặc tải file lên để đính kèm.</p>';
    return;
  }

  files.forEach(file => {
    const chip = document.createElement('div');
    chip.className = 'attached-file-chip';

    const icon = getFileIcon(file.mimeType, file.name);
    const isCloudDrive = file.webViewLink && (file.webViewLink.startsWith('http://') || file.webViewLink.startsWith('https://')) && !file.webViewLink.includes('/api/drive/files');
    const openBtnText = isCloudDrive ? '↗ Mở trên Drive' : '📥 Mở xem tệp';
    const openBtnTitle = isCloudDrive ? 'Mở trực tiếp trên Google Drive/Docs' : 'Mở xem hoặc tải tệp về máy';

    chip.innerHTML = `
      <div class="chip-left">
        <span style="font-size: 1.1rem;">${icon}</span>
        <span class="chip-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      </div>
      <div class="chip-actions">
        <a href="${file.webViewLink || '#'}" target="_blank" class="btn-open-drive" title="${openBtnTitle}">
          <span>${openBtnText}</span>
        </a>
        <button class="btn-detach-drive" title="Gỡ file khỏi tiết này">✕</button>
      </div>
    `;

    const detachBtn = chip.querySelector('.btn-detach-drive');
    detachBtn.addEventListener('click', async () => {
      await detachFileFromPeriod(file.id);
    });

    container.appendChild(chip);
  });
}

/**
 * Gỡ file khỏi tiết học
 */
async function detachFileFromPeriod(fileId) {
  if (!AppState.selectedPeriodId || !AppState.currentTimetable) return;

  const week = AppState.currentWeek || 1;
  try {
    const resp = await fetch(`/api/drive/detach?year=${encodeURIComponent(AppState.settings.current_year)}&semester=${encodeURIComponent(AppState.settings.current_semester)}&week=${week}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_id: AppState.selectedPeriodId,
        file_id: fileId
      })
    });

    if (resp.ok) {
      showToast('Đã gỡ tài liệu khỏi tiết học', 'info');
      const targetSlot = AppState.currentTimetable.schedule.find(s => s.id === AppState.selectedPeriodId);
      if (targetSlot && targetSlot.driveFiles) {
        targetSlot.driveFiles = targetSlot.driveFiles.filter(f => f.id !== fileId);
        renderAttachedFiles(targetSlot.driveFiles);
      }
    }
  } catch (err) {
    showToast('Lỗi khi gỡ tài liệu', 'error');
  }
}

/**
 * Nhận diện icon file dựa trên MIME type hoặc đuôi file
 */
function getFileIcon(mimeType, fileName) {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (mime.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
    return '📽️'; // Slide
  }
  if (mime.includes('word') || mime.includes('document') || name.endsWith('.doc') || name.endsWith('.docx')) {
    return '📝'; // Word / Doc
  }
  if (mime.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return '📊'; // Excel / Sheet
  }
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return '📕'; // PDF
  }
  if (mime.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return '🖼️'; // Image
  }
  return '📄';
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
