/**
 * GOOGLE DRIVE CLOUD SYNC & SESSION CONTROLLER (PHƯƠNG ÁN A)
 * - Duy trì phiên đăng nhập Google cả ngày qua Silent Token Refresh (Google Identity Services)
 * - Tự động đồng bộ toàn bộ Cài đặt & Thời khoá biểu các tuần lên tệp giaoan_colinh_backup_data.json
 * - Tự động khôi phục 100% dữ liệu khi mở trên thiết bị mới chỉ với 1 click
 */

import { AppState, showToast } from './app.js';
import { loadTimetableData } from './components/timetable-grid.js';

const BACKUP_FILE_NAME = 'giaoan_colinh_backup_data.json';
const TOKEN_STORAGE_KEY = 'google_drive_token_data';
const SYNC_TIME_KEY = 'google_drive_last_sync';

let tokenClient = null;
let syncDebounceTimer = null;
let autoRefreshInterval = null;

/**
 * Khởi tạo hệ thống phiên làm việc Google và đồng bộ Drive
 */
export function initGoogleAuthSession() {
  restoreTokenFromStorage();
  updateSyncUIStatus();

  // 1. Kiểm tra và duy trì phiên đăng nhập mỗi 10 phút
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    ensureValidDriveToken(false);
  }, 10 * 60 * 1000);

  // 2. Lắng nghe sự kiện bấm nút Đồng bộ trên Header
  const syncBtn = document.getElementById('btn-cloud-sync');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      await manualSyncTrigger();
    });
  }

  // 3. Nút Khôi phục từ Drive trong cài đặt
  const restoreBtn = document.getElementById('btn-restore-from-drive');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', async () => {
      await restoreFromGoogleDrive(true);
    });
  }

  const backupNowBtn = document.getElementById('btn-backup-to-drive-now');
  if (backupNowBtn) {
    backupNowBtn.addEventListener('click', async () => {
      await syncToGoogleDrive(true);
    });
  }
}

/**
 * Khôi phục token từ localStorage nếu còn hiệu lực
 */
function restoreTokenFromStorage() {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.access_token) {
        AppState.googleAccessToken = data.access_token;
        // Nếu token sắp hết hạn hoặc đã hết hạn, chạy refresh ngầm
        if (Date.now() >= (data.expires_at || 0) - 300000) {
          setTimeout(() => ensureValidDriveToken(false), 1500);
        }
      }
    }
  } catch (e) {
    console.warn('Không thể nạp token từ localStorage:', e);
  }
}

/**
 * Đảm bảo token Google Drive còn hạn sử dụng (Duy trì đăng nhập cả ngày)
 * - Nếu token còn hạn: trả về ngay.
 * - Nếu token hết hạn: tự động kích hoạt Silent Refresh ngầm không bật popup.
 */
export async function ensureValidDriveToken(interactive = false) {
  const clientId = (AppState.settings && AppState.settings.google_drive_client_id) || '';
  if (!clientId.trim()) {
    if (interactive) {
      showToast('Cô vui lòng nhập Google Client ID trong mục ⚙️ Cài đặt để kết nối Drive nhé!', 'warning');
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.remove('hidden');
    }
    return null;
  }

  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    if (interactive) {
      showToast('Đang tải thư viện Google, vui lòng thử lại sau vài giây...', 'info');
    }
    return null;
  }

  // Kiểm tra token đã lưu trong localStorage
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      // Nếu token còn hạn > 3 phút và khớp Client ID
      if (data.access_token && data.client_id === clientId.trim() && Date.now() < (data.expires_at - 180000)) {
        AppState.googleAccessToken = data.access_token;
        updateSyncUIStatus();
        return data.access_token;
      }
    } catch (e) {}
  }

  // Yêu cầu token mới từ Google Identity Services
  return new Promise((resolve) => {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        callback: (resp) => {
          if (resp && resp.access_token) {
            const expiresIn = parseInt(resp.expires_in) || 3600;
            const tokenData = {
              access_token: resp.access_token,
              // Trừ 5 phút dự phòng
              expires_at: Date.now() + (expiresIn - 300) * 1000,
              client_id: clientId.trim(),
              granted_at: Date.now()
            };
            localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
            AppState.googleAccessToken = resp.access_token;
            updateSyncUIStatus();

            if (interactive) {
              showToast('✅ Đã kết nối Google Drive! Hệ thống sẽ duy trì đăng nhập suốt cả ngày.', 'success');
              // Kiểm tra xem trên thiết bị mới có cần tự động khôi phục dữ liệu không
              checkAndAutoRestoreIfNewDevice();
            }
            resolve(resp.access_token);
          } else {
            if (interactive && resp && resp.error) {
              showToast(`Lỗi kết nối Google: ${resp.error}`, 'error');
            }
            resolve(null);
          }
        },
        error_callback: (err) => {
          console.warn('[GIS Silent Refresh Status]:', err);
          resolve(null);
        }
      });

      // Nếu interactive: dùng select_account để chọn tài khoản
      // Nếu silent ngầm: prompt = '' để Google không bật popup nếu đã đăng nhập trình duyệt
      tokenClient.requestAccessToken({ prompt: interactive ? 'select_account' : '' });
    } catch (err) {
      console.error('GIS Error:', err);
      resolve(null);
    }
  });
}

/**
 * Cập nhật giao diện trạng thái đồng bộ trên Header
 */
export function updateSyncUIStatus() {
  const syncBtn = document.getElementById('btn-header-sync') || document.getElementById('btn-cloud-sync');
  const syncText = document.getElementById('header-sync-text') || document.getElementById('sync-status-text');
  const syncIcon = document.getElementById('sync-icon');
  const syncDot = document.getElementById('header-sync-dot');
  const token = AppState.googleAccessToken;
  const lastSync = localStorage.getItem(SYNC_TIME_KEY);

  if (!syncBtn || !syncText) return;

  if (token) {
    syncBtn.classList.add('connected');
    if (syncDot) syncDot.className = 'sync-dot online';
    if (syncIcon) syncIcon.textContent = '☁️';
    if (lastSync) {
      syncText.textContent = `Drive: ${lastSync}`;
      syncBtn.title = `Đã kết nối Google Drive. Lần đồng bộ gần nhất: ${lastSync}. Bấm để đồng bộ ngay.`;
    } else {
      syncText.textContent = `Drive sẵn sàng`;
      syncBtn.title = `Đã kết nối Google Drive. Bấm để đồng bộ dữ liệu lên đám mây.`;
    }
  } else {
    syncBtn.classList.remove('connected');
    if (syncDot) syncDot.className = 'sync-dot';
    if (syncIcon) syncIcon.textContent = '🔗';
    syncText.textContent = 'Đồng bộ Drive';
    syncBtn.title = 'Bấm để đăng nhập Google Drive và tự động đồng bộ dữ liệu.';
  }
}

/**
 * Xử lý khi người dùng bấm nút Đồng bộ thủ công
 */
async function manualSyncTrigger() {
  if (!AppState.googleAccessToken) {
    const token = await ensureValidDriveToken(true);
    if (token) {
      await syncToGoogleDrive(true);
    }
  } else {
    await syncToGoogleDrive(true);
  }
}

/**
 * Tìm kiếm hoặc tạo mới file sao lưu trên Google Drive của giáo viên
 */
async function getOrCreateBackupFileId(accessToken) {
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`;
  const resp = await fetch(searchUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (resp.ok) {
    const data = await resp.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Chưa có file -> Tạo file mới rỗng
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const meta = {
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
    description: 'Tệp sao lưu tự động Thời khoá biểu & Giáo án Cô Linh'
  };

  const createResp = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(meta)
  });

  if (createResp.ok) {
    const newFile = await createResp.json();
    return newFile.id;
  }
  return null;
}

/**
 * Đồng bộ toàn bộ dữ liệu hiện tại lên Google Drive (Phương án A)
 */
export async function syncToGoogleDrive(showNotify = false) {
  const token = await ensureValidDriveToken(false);
  if (!token) {
    if (showNotify) {
      showToast('Chưa kết nối Google Drive. Vui lòng bấm [Kết nối Drive] trước!', 'warning');
    }
    return false;
  }

  const syncText = document.getElementById('sync-status-text');
  if (syncText) syncText.textContent = 'Đang đồng bộ...';

  try {
    // 1. Lấy toàn bộ dữ liệu từ backend hoặc local
    let exportPayload = null;
    try {
      const exportResp = await fetch('/api/timetable/export-all');
      if (exportResp.ok) {
        exportPayload = await exportResp.json();
      }
    } catch (e) {}

    if (!exportPayload) {
      exportPayload = {
        version: "2.0",
        exported_at: new Date().toISOString(),
        settings: AppState.settings,
        timetables: {
          [AppState.settings.current_year]: {
            [AppState.settings.current_semester]: {
              [`week_${AppState.currentWeek}`]: AppState.currentTimetable
            }
          }
        }
      };
    }

    // 2. Tìm hoặc tạo file backup trên Drive
    const fileId = await getOrCreateBackupFileId(token);
    if (!fileId) {
      if (showNotify) showToast('Không thể tạo file sao lưu trên Google Drive', 'error');
      updateSyncUIStatus();
      return false;
    }

    // 3. Upload ghi đè nội dung file sao lưu trên Google Drive
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadResp = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify(exportPayload, null, 2)
    });

    if (uploadResp.ok) {
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(SYNC_TIME_KEY, nowTime);
      updateSyncUIStatus();

      if (showNotify) {
        showToast(`☁️ Đã sao lưu dữ liệu an toàn lên Google Drive lúc ${nowTime}!`, 'success');
      }
      return true;
    } else {
      console.warn('Lỗi upload Drive:', uploadResp.status);
      updateSyncUIStatus();
      return false;
    }
  } catch (err) {
    console.error('Lỗi khi đồng bộ Google Drive:', err);
    updateSyncUIStatus();
    return false;
  }
}

/**
 * Khôi phục dữ liệu từ Google Drive về trình duyệt và backend
 */
export async function restoreFromGoogleDrive(showNotify = false) {
  const token = await ensureValidDriveToken(true);
  if (!token) return false;

  if (showNotify) {
    showToast('Đang tìm kiếm bản sao lưu trên Google Drive của cô...', 'info');
  }

  try {
    const fileId = await getOrCreateBackupFileId(token);
    if (!fileId) {
      showToast('Không tìm thấy tệp sao lưu nào trên Drive!', 'warning');
      return false;
    }

    // Tải nội dung tệp JSON
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const getResp = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!getResp.ok) {
      showToast('Không thể tải tệp sao lưu từ Drive', 'error');
      return false;
    }

    const backupData = await getResp.json();
    if (!backupData || !backupData.settings) {
      showToast('Tệp sao lưu trên Drive chưa có dữ liệu thời khoá biểu', 'info');
      return false;
    }

    // 1. Gửi bản sao lưu vào Backend để ghi lại vào ổ đĩa
    try {
      await fetch('/api/timetable/import-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      });
    } catch (e) {
      console.warn('Backend import notice:', e);
    }

    // 2. Cập nhật Local State & LocalStorage
    if (backupData.settings) {
      AppState.settings = Object.assign({}, AppState.settings, backupData.settings);
      localStorage.setItem('troly_gv_settings', JSON.stringify(AppState.settings));
      const teacherSub = document.getElementById('header-teacher-name');
      const termPill = document.getElementById('header-term-pill');
      if (teacherSub) teacherSub.textContent = `${AppState.settings.teacher_name || 'Giáo viên'} • ${AppState.settings.subject || 'Toàn trường'}`;
      if (termPill) termPill.textContent = `${AppState.settings.current_year || '2025-2026'} • ${AppState.settings.current_semester || 'HK1'}`;
    }

    // 3. Tải lại thời khoá biểu
    await loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester, AppState.currentWeek);

    showToast('✨ Đã khôi phục thành công toàn bộ cài đặt & thời khoá biểu từ Google Drive!', 'success');
    return true;
  } catch (err) {
    console.error('Lỗi khi khôi phục Drive:', err);
    showToast('Không thể khôi phục dữ liệu từ Google Drive', 'error');
    return false;
  }
}

/**
 * Tự động đồng bộ ngầm sau 3 giây khi người dùng lưu bài hoặc đổi TKB
 */
export function triggerAutoSync() {
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(async () => {
    if (AppState.googleAccessToken) {
      await syncToGoogleDrive(false);
    }
  }, 3000);
}

/**
 * Kiểm tra xem thiết bị mới có cần nhắc khôi phục không
 */
async function checkAndAutoRestoreIfNewDevice() {
  const hasLocalSettings = localStorage.getItem('troly_gv_settings');
  if (!hasLocalSettings) {
    showToast('Phát hiện thiết bị mới, đang tự động nạp dữ liệu từ Google Drive của cô...', 'info');
    await restoreFromGoogleDrive(true);
  }
}

export const handleManualSync = () => syncToGoogleDrive(true);
export const restoreFromCloudBackup = () => restoreFromGoogleDrive(true);
