/**
 * TAB 1: AI CHAT & TẠO THỜI KHOÁ BIỂU TỰ ĐỘNG
 * Giải quyết Vấn đề 1: Xác nhận lại với giáo viên trước khi đưa sang Tab 2
 */

import { AppState, showToast, switchTab } from './app.js';
import { loadTimetableData } from './tab2-timetable.js';

let selectedFile = null;

export function initChat() {
  const form = document.getElementById('chat-form');
  const textarea = document.getElementById('chat-textarea');
  const fileInput = document.getElementById('chat-file-input');
  const attachBtn = document.getElementById('btn-attach-file');
  const cancelFileBtn = document.getElementById('btn-cancel-file');
  const filePreviewBar = document.getElementById('file-preview-bar');

  // Handle Attach File Click
  attachBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle File Input Change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedFile = e.target.files[0];
      showFilePreview(selectedFile);
    }
  });

  // Handle Cancel File
  cancelFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    filePreviewBar.classList.add('hidden');
  });

  // Auto-resize textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  });

  // Shift + Enter to newline, Enter to submit
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text && !selectedFile) return;

    // Hiển thị tin nhắn người dùng ngay lập tức
    appendUserMessage(text, selectedFile);
    
    // Clear input
    textarea.value = '';
    textarea.style.height = 'auto';
    const currentFile = selectedFile;
    selectedFile = null;
    fileInput.value = '';
    filePreviewBar.classList.add('hidden');

    // Gửi đến Backend
    await sendToGemini(text, currentFile);
  });

  // Load chat history
  loadChatHistory();
}

function showFilePreview(file) {
  const bar = document.getElementById('file-preview-bar');
  const nameEl = document.getElementById('preview-file-name');
  const sizeEl = document.getElementById('preview-file-size');

  nameEl.textContent = file.name;
  const sizeKb = Math.round(file.size / 1024);
  sizeEl.textContent = `(${sizeKb} KB)`;
  bar.classList.remove('hidden');
}

function appendUserMessage(text, file) {
  const container = document.getElementById('chat-messages');
  const card = document.createElement('div');
  card.className = 'message-card user';

  let fileHtml = '';
  if (file) {
    fileHtml = `
      <div style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; margin-bottom: 6px;">
        📎 Đính kèm: <strong>${file.name}</strong>
      </div>
    `;
  }

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  card.innerHTML = `
    <div class="avatar">👩‍🏫</div>
    <div class="msg-body">
      <div class="msg-header">
        <strong>${AppState.settings.teacher_name}</strong>
        <span class="time">${now}</span>
      </div>
      <div class="msg-content">
        ${fileHtml}
        ${text ? `<p>${escapeHtml(text)}</p>` : ''}
      </div>
    </div>
  `;

  container.appendChild(card);
  scrollToBottom();
}

function appendAssistantMessage(data) {
  const container = document.getElementById('chat-messages');
  const card = document.createElement('div');
  card.className = 'message-card assistant';

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Kiểm tra nếu có thời khoá biểu chờ xác nhận
  let confirmationHtml = '';
  if (data.status === 'PENDING_CONFIRMATION' && data.pending_timetable) {
    confirmationHtml = renderConfirmationCard(data.pending_timetable);
  }

  card.innerHTML = `
    <div class="avatar">✨</div>
    <div class="msg-body">
      <div class="msg-header">
        <strong>Trợ lý Giáo viên AI</strong>
        <span class="time">${now}</span>
      </div>
      <div class="msg-content">
        <p>${escapeHtml(data.text || data.reply_text || '')}</p>
        ${confirmationHtml}
      </div>
    </div>
  `;

  container.appendChild(card);
  scrollToBottom();

  // Đính kèm sự kiện cho nút trong Thẻ xác nhận nếu có
  if (data.status === 'PENDING_CONFIRMATION' && data.pending_timetable) {
    attachConfirmationEvents(card, data.pending_timetable);
  }
}

/**
 * Render Thẻ Xác Nhận Tương Tác (VẤN ĐỀ 1)
 */
function renderConfirmationCard(tt) {
  const meta = tt.metadata || {};
  const schedule = tt.schedule || [];

  // Gom các tiết có lớp theo ngày
  const dayNames = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy' };
  const daySchedules = {};

  for (let d = 2; d <= 7; d++) {
    daySchedules[d] = [];
  }

  schedule.forEach(slot => {
    if (slot.className && slot.className.trim()) {
      daySchedules[slot.dayOfWeek] = daySchedules[slot.dayOfWeek] || [];
      daySchedules[slot.dayOfWeek].push(slot);
    }
  });

  let rowsHtml = '';
  for (let d = 2; d <= 7; d++) {
    const slots = daySchedules[d];
    if (slots.length > 0) {
      const summary = slots
        .sort((a, b) => a.period - b.period)
        .map(s => `Tiết ${s.period} (${s.className})`)
        .join(', ');
      rowsHtml += `
        <tr>
          <td style="font-weight: 600; width: 100px;">${dayNames[d]}</td>
          <td>${summary}</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr>
          <td style="font-weight: 600; color: #94a3b8; width: 100px;">${dayNames[d]}</td>
          <td style="color: #94a3b8; font-style: italic;">Nghỉ (không có tiết)</td>
        </tr>
      `;
    }
  }

  return `
    <div class="confirmation-card" id="conf-card-${Date.now()}">
      <div class="conf-badge">📋 BẢN NHÁP THỜI KHOÁ BIỂU ĐỀ XUẤT</div>
      <h4 class="conf-title">Thời khoá biểu: ${meta.teacherName || AppState.settings.teacher_name}</h4>
      
      <div class="conf-meta-grid">
        <div class="conf-meta-item">
          <span class="conf-meta-label">Năm học</span>
          <span class="conf-meta-val">${meta.academicYear || AppState.settings.current_year}</span>
        </div>
        <div class="conf-meta-item">
          <span class="conf-meta-label">Học kỳ</span>
          <span class="conf-meta-val">${meta.semester || AppState.settings.current_semester}</span>
        </div>
        <div class="conf-meta-item">
          <span class="conf-meta-label">Tổng tiết dạy</span>
          <span class="conf-meta-val" style="color: var(--primary);">${meta.totalPeriods || 0} tiết/tuần</span>
        </div>
      </div>

      <table class="conf-preview-table">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="conf-actions">
        <button class="btn-confirm-apply" data-action="confirm">
          <span>✔ Xác nhận & Áp dụng sang Tab 2</span>
        </button>
        <button class="btn-chat-modify" data-action="modify">
          <span>💬 Chat để sửa</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Gắn sự kiện cho nút Xác nhận và nút Sửa
 */
function attachConfirmationEvents(cardElement, timetableData) {
  const confirmBtn = cardElement.querySelector('[data-action="confirm"]');
  const modifyBtn = cardElement.querySelector('[data-action="modify"]');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span>⏳ Đang lưu vào thời khoá biểu...</span>';

      try {
        const resp = await fetch('/api/timetable/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timetableData)
        });

        if (resp.ok) {
          showToast('✅ Đã cập nhật thành công thời khoá biểu!', 'success');
          confirmBtn.innerHTML = '<span>✔ Đã áp dụng thành công</span>';
          confirmBtn.style.background = '#059669';

          // Tự động tải lại TKB và chuyển sang Tab 2
          loadTimetableData(timetableData.metadata.academicYear, timetableData.metadata.semester);
          setTimeout(() => {
            switchTab('tab-timetable');
          }, 600);
        } else {
          showToast('Lỗi khi lưu thời khoá biểu', 'error');
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<span>✔ Thử lại</span>';
        }
      } catch (err) {
        showToast('Lỗi mạng kết nối máy chủ', 'error');
        confirmBtn.disabled = false;
      }
    });
  }

  if (modifyBtn) {
    modifyBtn.addEventListener('click', () => {
      const textarea = document.getElementById('chat-textarea');
      textarea.value = 'Em sửa giúp cô: ';
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  }
}

async function sendToGemini(text, file) {
  const sendBtn = document.getElementById('btn-send-chat');
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span>⏳</span>';

  const formData = new FormData();
  formData.append('message', text || '');
  if (file) {
    formData.append('file', file);
  }

  try {
    const resp = await fetch('/api/chat/send', {
      method: 'POST',
      body: formData
    });

    if (resp.ok) {
      const result = await resp.json();
      appendAssistantMessage(result);
    } else {
      const err = await resp.json();
      appendAssistantMessage({
        reply_text: `⚠️ Lỗi xử lý từ máy chủ: ${err.detail || 'Không thể kết nối'}`
      });
    }
  } catch (err) {
    appendAssistantMessage({
      reply_text: '⚠️ Không thể kết nối tới server. Hãy chắc chắn rằng bạn đang chạy python main.py.'
    });
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<span class="send-icon">➤</span>';
  }
}

async function loadChatHistory() {
  try {
    const resp = await fetch('/api/chat/history');
    if (resp.ok) {
      const history = await resp.json();
      if (history && history.length > 0) {
        history.forEach(msg => {
          if (msg.sender === 'user') {
            appendUserMessage(msg.text, msg.file);
          } else {
            appendAssistantMessage({
              reply_text: msg.text,
              status: msg.status,
              pending_timetable: msg.pending_timetable
            });
          }
        });
      }
    }
  } catch (e) {
    console.warn('Chưa có lịch sử chat trước đó');
  }
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  container.scrollTop = container.scrollHeight;
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
