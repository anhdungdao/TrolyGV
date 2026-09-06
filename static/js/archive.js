/**
 * KHO LƯU TRỮ CÁC KỲ ĐÃ QUA & SAO CHÉP GIÁO ÁN (VẤN ĐỀ 2)
 * Giúp thu gọn dữ liệu các kỳ học cũ vào 1 khu vực riêng, cho phép xem lại và tái sử dụng
 */

import { AppState, showToast } from './app.js';
import { loadTimetableData } from './tab2-timetable.js';

export function initArchive() {
  const openBtn = document.getElementById('btn-open-archive');
  const closeBtn = document.getElementById('btn-close-archive');
  const closeFooterBtn = document.getElementById('btn-close-archive-footer');
  const modal = document.getElementById('archive-modal');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (modal) modal.classList.remove('hidden');
      loadArchiveList();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
    });
  }

  if (closeFooterBtn) {
    closeFooterBtn.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }
}

/**
 * Tải danh sách các kỳ học đã lưu trữ trên hệ thống
 */
async function loadArchiveList() {
  const container = document.getElementById('archive-list-container');
  container.innerHTML = '<div class="loading-state" style="padding: 20px; text-align: center; color: #64748b;">Đang tải danh sách kho lưu trữ...</div>';

  try {
    const resp = await fetch('/api/timetable/archives');
    if (resp.ok) {
      const archives = await resp.json();
      renderArchiveList(archives);
    } else {
      container.innerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;">Không thể tải danh sách kho lưu trữ</div>';
    }
  } catch (err) {
    container.innerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;">Lỗi kết nối máy chủ</div>';
  }
}

/**
 * Render thẻ từng kỳ học trong kho lưu trữ
 */
function renderArchiveList(archives) {
  const container = document.getElementById('archive-list-container');
  container.innerHTML = '';

  if (!archives || archives.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #94a3b8;">
        <span style="font-size: 2rem;">📭</span>
        <p style="margin-top: 8px;">Chưa có kỳ học nào được lưu trữ.</p>
      </div>
    `;
    return;
  }

  archives.forEach(item => {
    const card = document.createElement('div');
    card.className = `archive-card ${item.is_current ? 'active-term' : ''}`;

    const updatedDate = item.updated_at ? new Date(item.updated_at).toLocaleDateString('vi-VN') : 'Không rõ';

    card.innerHTML = `
      <div class="archive-info">
        <h4>
          Năm học ${item.year} - ${item.semester === 'HK1' ? 'Học kỳ 1' : 'Học kỳ 2'}
          ${item.is_current ? '<span class="archive-badge-cur">Đang hoạt động</span>' : ''}
        </h4>
        <div class="archive-sub">
          Giáo viên: ${item.teacher_name || 'Giáo viên'} • ${item.total_periods} tiết dạy • Cập nhật: ${updatedDate}
        </div>
      </div>
      <div class="archive-actions">
        <button class="btn-secondary btn-view-term" title="Xem thời khoá biểu kỳ này">
          <span>👁️ Xem lịch</span>
        </button>
        ${!item.is_current ? `
          <button class="btn-primary btn-copy-term" title="Sao chép toàn bộ lịch và bài giảng sang kỳ hiện tại">
            <span>📋 Tái sử dụng</span>
          </button>
        ` : ''}
      </div>
    `;

    // View term button
    const viewBtn = card.querySelector('.btn-view-term');
    viewBtn.addEventListener('click', () => {
      // Cập nhật selector
      const yearSelect = document.getElementById('select-academic-year');
      const semSelect = document.getElementById('select-semester');
      if (yearSelect) yearSelect.value = item.year;
      if (semSelect) semSelect.value = item.semester;

      loadTimetableData(item.year, item.semester);
      document.getElementById('archive-modal').classList.add('hidden');
      showToast(`Đang hiển thị thời khoá biểu năm học ${item.year} (${item.semester})`, 'info');
    });

    // Copy to current term button
    const copyBtn = card.querySelector('.btn-copy-term');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        if (!confirm(`Cô có muốn sao chép toàn bộ lịch và giáo án từ năm ${item.year} (${item.semester}) sang năm hiện tại (${AppState.settings.current_year} - ${AppState.settings.current_semester}) không?`)) {
          return;
        }

        try {
          const resp = await fetch(`/api/timetable/copy?from_year=${encodeURIComponent(item.year)}&from_semester=${encodeURIComponent(item.semester)}&to_year=${encodeURIComponent(AppState.settings.current_year)}&to_semester=${encodeURIComponent(AppState.settings.current_semester)}`, {
            method: 'POST'
          });

          if (resp.ok) {
            showToast('Đã sao chép thành công giáo án và lịch sang kỳ mới!', 'success');
            loadTimetableData(AppState.settings.current_year, AppState.settings.current_semester);
            document.getElementById('archive-modal').classList.add('hidden');
          } else {
            showToast('Lỗi khi sao chép lịch', 'error');
          }
        } catch (e) {
          showToast('Lỗi kết nối máy chủ', 'error');
        }
      });
    }

    container.appendChild(card);
  });
}
