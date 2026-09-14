import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  BookOpen,
  HelpCircle,
  FileCheck,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Lesson } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeLesson?: Lesson | null;
  initialPrompt?: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  activeLesson,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Xin chào Thầy **Nguyễn Văn An**! Tôi là **AI Trợ Giảng Chuyên Môn Toán** (THPT Chuyên Lê Hồng Phong).

Thầy có thể yêu cầu tôi:
- 📝 **Soạn Kế hoạch bài dạy chuẩn CV 5512** (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng)
- 📊 **Tạo đề kiểm tra 15 phút / Giữa kỳ** theo định dạng mới 2025 (Trắc nghiệm 4 lựa chọn, Đúng/Sai, Trả lời ngắn)
- 📐 **Gợi ý phương pháp sư phạm**, bài toán thực tế sinh động cho các khối 10, 11, 12 và lớp Bồi dưỡng HSG
- 💡 **Giải chi tiết hoặc phân tích ma trận kiến thức**

Thầy hãy chọn gợi ý nhanh bên dưới hoặc đặt câu hỏi trực tiếp nhé!`,
      timestamp: 'Vừa xong',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-fill prompt if triggered from lesson modal
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (promptToSend?: string) => {
    const textToSend = promptToSend || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          lessonContext: activeLesson
            ? {
                className: activeLesson.className,
                subject: activeLesson.subject,
                lessonName: activeLesson.lessonName,
                room: activeLesson.room,
                note: activeLesson.notes,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi kết nối máy chủ');
      }

      const data = await response.json();
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.response || 'Đã tạo nội dung thành công.',
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `### 📋 GỢI Ý KẾ HOẠCH BÀI DẠY (CHUYÊN MÔN TOÁN)
**Nội dung:** ${textToSend}

1. **Khởi động:** Tạo tình huống thực tế hoặc câu hỏi gợi mở tạo hứng thú học tập.
2. **Hình thành kiến thức:** Phân tích kỹ định nghĩa, định lý và điều kiện áp dụng. Sử dụng phần mềm hình học/đồ thị hỗ trợ.
3. **Luyện tập:** Xây dựng hệ thống bài tập từ Nhận biết, Thông hiểu đến Vận dụng cao.
4. **Vận dụng:** Bài toán liên môn vật lý/kinh tế hoặc ứng dụng thực tế.`,
        timestamp: 'Vừa xong',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    {
      title: 'Soạn giáo án 5512',
      prompt: 'Thầy cần soạn Kế hoạch bài dạy (CV 5512) chi tiết cho tiết học Khảo sát đồ thị hàm số lớp 12.',
      icon: BookOpen,
    },
    {
      title: 'Tạo đề 15p định dạng mới 2025',
      prompt: 'Tạo đề kiểm tra 15 phút môn Toán 12 gồm trắc nghiệm 4 lựa chọn, câu trắc nghiệm Đúng/Sai và câu trả lời ngắn.',
      icon: FileCheck,
    },
    {
      title: 'Mẹo sư phạm Cấp số nhân',
      prompt: 'Gợi ý phương pháp dẫn dắt bài Cấp số nhân cho học sinh lớp 11B2 dễ hiểu và nhớ lâu công thức.',
      icon: HelpCircle,
    },
    {
      title: 'Chuyên đề Oxyz nâng cao',
      prompt: 'Tổng hợp các dạng toán cực trị toạ độ Oxyz thường gặp trong đề thi tốt nghiệp THPT và phương pháp giải nhanh.',
      icon: Calculator,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-[#1b4a2f] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-[#7df38a]" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                AI Trợ Giảng Chuyên Môn Toán
              </h3>
              <p className="text-[11px] text-emerald-200">
                Thầy Nguyễn Văn An • THPT Chuyên Lê Hồng Phong
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Lesson Badge in Drawer if selected */}
        {activeLesson && (
          <div className="bg-[#f0faf2] border-b border-[#d8eed7] px-4 py-2 flex items-center justify-between text-xs">
            <span className="text-gray-600">
              Đang gắn với: <strong className="text-[#1b4a2f]">{activeLesson.className}</strong> - {activeLesson.lessonName}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {activeLesson.room}
            </span>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-[#fbfdfa]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 shadow-2xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1b4a2f] text-white rounded-br-xs'
                    : 'bg-white border border-gray-200/90 text-gray-800 rounded-bl-xs'
                }`}
              >
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : (
                  <div className="prose prose-xs max-w-none text-gray-800 space-y-2">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1 font-mono">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 w-fit animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">
                AI Trợ Giảng đang nghiên cứu sư phạm & soạn nội dung...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-gray-50/90 border-t border-gray-100">
          <div className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center justify-between">
            <span>Gợi ý tác vụ nhanh:</span>
            <span className="text-[10px] text-emerald-700 font-medium">Bấm để gửi</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={isLoading}
                className="text-left bg-white hover:bg-emerald-50/80 border border-gray-200 hover:border-emerald-300 p-2 rounded-xl transition-all shadow-2xs text-[11px] text-gray-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <qp.icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{qp.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Hỏi AI về giáo án, bài toán, đề kiểm tra..."
              disabled={isLoading}
              className="flex-1 bg-gray-100 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-emerald-600 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-[#1b4a2f] hover:bg-[#133c23] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <div className="text-[10px] text-gray-400 mt-1.5 text-center">
            Hỗ trợ bởi mô hình Gemini Chuyên Sâu cho Giáo Viên Toán
          </div>
        </div>
      </div>
    </div>
  );
};
