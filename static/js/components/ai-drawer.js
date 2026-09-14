/**
 * AI ASSISTANT DRAWER COMPONENT
 * Cung cấp ngăn kéo trượt (Slide-over Drawer) từ cạnh phải màn hình
 * Phong cách Forest Green cao cấp theo UINew
 */

import { AppState, showToast } from '../app.js';
import { loadTimetableData } from './timetable-grid.js';

let selectedFile = null;

export function initAIDrawer() {
  const drawer = document.getElementById('ai-assistant-drawer');
  const backdrop = document.getElementById('ai-drawer-backdrop');
  const openBtn = document.getElementById('btn-open-ai-drawer');
  const closeBtn = document.getElementById('btn-close-ai-drawer');
  const clearBtn = document.getElementById('btn-clear-ai-chat');
  const form = document.getElementById('drawer-chat-form');
  const textarea = document.getElementById('drawer-chat-textarea');
  const fileInput = document.getElementById('drawer-file-input');
  const attachBtn = document.getElementById('btn-drawer-attach');
  const removeAttachBtn = document.getElementById('btn-drawer-remove-attach');
  const attachPreview = document.getElementById('drawer-attachment-preview');
  const suggestionChips = document.querySelectorAll('.ai-suggestion-chip');

  // Open Drawer
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      openDrawer();
    });
  }

  // Close Drawer
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeDrawer();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeDrawer();
    });
  }

  // Clear Chat History
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Bạn có muốn xoá toàn bộ lịch sử trò chuyện không?')) {
        try {
          await fetch('/api/chat/clear', { method: 'POST' });
        } catch (e) {}
        const container = document.getElementById('drawer-messages');
        if (container) {
          container.innerHTML = `
            <div class="ai-empty-state">
              <div class="ai-empty-icon">✨</div>
              <h4>Trợ lý Giáo viên AI</h4>
              <p>Tải ảnh chụp hoặc file Excel TKB để em tự động tạo thời khoá biểu tuần cho cô nhé!</p>
            </div>
          `;
        }
        showToast('Đã làm mới cuộc hội thoại', 'info');
      }
    });
  }

  // Handle Attach File
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];
        showAttachPreview(selectedFile);
      }
    });
  }

  if (removeAttachBtn) {
    removeAttachBtn.addEventListener('click', () => {
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (attachPreview) attachPreview.classList.remove('show');
    });
  }

  // Auto-resize textarea
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (form) form.dispatchEvent(new Event('submit'));
      }
    });
  }

  // Suggestion Chips
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt || chip.textContent.trim();
      if (textarea) {
        textarea.value = prompt;
        textarea.focus();
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }
    });
  });

  // Handle Chat Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textarea ? textarea.value.trim() : '';
      if (!text && !selectedFile) return;

      appendUserMessage(text, selectedFile);

      if (textarea) {
        textarea.value = '';
        textarea.style.height = 'auto';
      }
      const fileToSend = selectedFile;
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (attachPreview) attachPreview.classList.remove('show');

      await sendToGemini(text, fileToSend);
    });
  }

  // Load chat history on start
  loadChatHistory();
}

export function openDrawer() {
  const drawer = document.getElementById('ai-assistant-drawer');
  const backdrop = document.getElementById('ai-drawer-backdrop');
  if (drawer) drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
  const textarea = document.getElementById('drawer-chat-textarea');
  if (textarea) setTimeout(() => textarea.focus(), 300);
}

export function closeDrawer() {
  const drawer = document.getElementById('ai-assistant-drawer');
  const backdrop = document.getElementById('ai-drawer-backdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

function showAttachPreview(file) {
  const preview = document.getElementById('drawer-attachment-preview');
  const nameEl = document.getElementById('drawer-attachment-name');
  if (nameEl) nameEl.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
  if (preview) preview.classList.add('show');
}

function appendUserMessage(text, file) {
  const container = document.getElementById('drawer-messages');
  if (!container) return;

  // Xoá empty state nếu có
  const empty = container.querySelector('.ai-empty-state');
  if (empty) empty.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-message user';

  let fileHtml = '';
  if (file) {
    fileHtml = `<div style="font-size:0.75rem; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:6px; margin-bottom:4px;">📎 ${escapeHtml(file.name)}</div>`;
  }

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  msgDiv.innerHTML = `
    <div class="ai-msg-avatar">👩‍🏫</div>
    <div class="ai-msg-bubble">
      ${fileHtml}
      ${text ? `<p style="margin:0;">${escapeHtml(text)}</p>` : ''}
      <div class="ai-msg-time">${now}</div>
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendAssistantMessage(data) {
  const container = document.getElementById('drawer-messages');
  if (!container) return;

  const empty = container.querySelector('.ai-empty-state');
  if (empty) empty.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-message assistant';

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  let confirmationHtml = '';
  if (data.status === 'PENDING_CONFIRMATION' && data.pending_timetable) {
    confirmationHtml = renderConfirmationCard(data.pending_timetable);
  }

  msgDiv.innerHTML = `
    <div class="ai-msg-avatar">✨</div>
    <div class="ai-msg-bubble">
      <div style="font-weight:600; font-size:0.8rem; margin-bottom:4px; color:var(--primary);">Trợ lý Giáo viên AI</div>
      <p style="margin:0 0 0.5rem 0;">${escapeHtml(data.text || data.reply_text || '')}</p>
      ${confirmationHtml}
      <div class="ai-msg-time">${now}</div>
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;

  if (data.status === 'PENDING_CONFIRMATION' && data.pending_timetable) {
    attachConfirmationEvents(msgDiv, data.pending_timetable);
  }
}

function renderConfirmationCard(tt) {
  const meta = tt.metadata || {};
  const schedule = tt.schedule || [];

  const dayNames = { 2: 'Thứ Hai', 3: 'Thứ Ba', 4: 'Thứ Tư', 5: 'Thứ Năm', 6: 'Thứ Sáu', 7: 'Thứ Bảy' };
  const daySchedules = { 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

  schedule.forEach(slot => {
    if (slot.className && slot.className.trim()) {
      daySchedules[slot.dayOfWeek] = daySchedules[slot.dayOfWeek] || [];
      daySchedules[slot.dayOfWeek].push(slot);
    }
  });

  let itemsHtml = '';
  for (let d = 2; d <= 7; d++) {
    const slots = daySchedules[d] || [];
    if (slots.length > 0) {
      const summary = slots
        .sort((a, b) => a.period - b.period)
        .map(s => `T${s.period} (${s.className})`)
        .join(', ');
      itemsHtml += `
        <div class="ai-preview-item">
          <strong>${dayNames[d]}</strong>
          <span>${summary}</span>
        </div>
      `;
    }
  }

  return `
    <div class="ai-confirmation-card">
      <h5>📋 Bản Nháp Thời Khoá Biểu Đề Xuất</h5>
      <div style="margin-bottom:6px; color:var(--text-muted); font-size:0.75rem;">
        Giáo viên: <strong>${meta.teacherName || AppState.settings.teacher_name}</strong> • ${meta.totalPeriods || 0} tiết/tuần
      </div>
      <div class="ai-preview-list">
        ${itemsHtml || '<div style="color:#94a3b8; padding:4px;">Chưa tìm thấy tiết dạy nào</div>'}
      </div>
      <div class="ai-confirmation-actions">
        <button class="ai-confirm-btn" data-action="confirm">✓ Áp dụng vào thời khoá biểu</button>
        <button class="ai-cancel-btn" data-action="modify">💬 Chat để sửa</button>
      </div>
    </div>
  `;
}

function attachConfirmationEvents(cardElement, timetableData) {
  const confirmBtn = cardElement.querySelector('[data-action="confirm"]');
  const modifyBtn = cardElement.querySelector('[data-action="modify"]');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ Đang áp dụng...';

      const targetWeek = AppState.currentWeek || 1;
      timetableData.metadata = timetableData.metadata || {};
      timetableData.metadata.week = targetWeek;

      const y = timetableData.metadata.academicYear || AppState.settings.current_year;
      const s = timetableData.metadata.semester || AppState.settings.current_semester;
      const storageKey = `troly_gv_tt_${y}_${s}_week_${targetWeek}`;
      localStorage.setItem(storageKey, JSON.stringify(timetableData));

      try {
        const resp = await fetch('/api/timetable/save?propagate_to_semester=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timetableData)
        });

        // Xoá cache các tuần khác trong localStorage để tải dữ liệu mới đã lan truyền
        for (let w = 1; w <= 25; w++) {
          if (w !== targetWeek) {
            localStorage.removeItem(`troly_gv_tt_${y}_${s}_week_${w}`);
          }
        }

        if (resp.ok) {
          showToast(`✅ Đã áp dụng thời khoá biểu cho toàn bộ các tuần trong học kỳ!`, 'success');
          confirmBtn.textContent = '✓ Đã áp dụng cả kỳ';
          confirmBtn.style.background = '#059669';
          try { const { triggerAutoSync } = await import('../drive-sync.js'); triggerAutoSync(); } catch(e) {}
          await loadTimetableData(y, s, targetWeek);
        } else {
          showToast('Đã lưu thời khoá biểu vào trình duyệt', 'info');
          try { const { triggerAutoSync } = await import('../drive-sync.js'); triggerAutoSync(); } catch(e) {}
          await loadTimetableData(y, s, targetWeek);
        }
      } catch (err) {
        showToast('Đã lưu thời khoá biểu cục bộ', 'info');
        try { const { triggerAutoSync } = await import('../drive-sync.js'); triggerAutoSync(); } catch(e) {}
        await loadTimetableData(y, s, targetWeek);
      }
    });
  }

  if (modifyBtn) {
    modifyBtn.addEventListener('click', () => {
      const textarea = document.getElementById('drawer-chat-textarea');
      if (textarea) {
        textarea.value = 'Em sửa giúp cô: ';
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    });
  }
}

async function sendToGemini(text, file) {
  const sendBtn = document.getElementById('btn-drawer-send');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span>⏳</span>';
  }

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
        reply_text: `⚠️ Lỗi xử lý: ${err.detail || 'Không thể kết nối máy chủ'}`
      });
    }
  } catch (err) {
    appendAssistantMessage({
      reply_text: '⚠️ Không thể kết nối tới server. Vui lòng kiểm tra lại backend.'
    });
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>➤</span>';
    }
  }
}

async function loadChatHistory() {
  try {
    const resp = await fetch('/api/chat/history');
    if (resp.ok) {
      const history = await resp.json();
      if (history && history.length > 0) {
        const container = document.getElementById('drawer-messages');
        if (container) {
          const empty = container.querySelector('.ai-empty-state');
          if (empty) empty.remove();
        }
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
  } catch (e) {}
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
