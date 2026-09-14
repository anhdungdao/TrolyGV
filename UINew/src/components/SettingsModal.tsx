import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Save,
  Calendar,
  Cloud,
  UserCheck,
  Settings as SettingsIcon,
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-800" />
            <h3 className="font-bold text-base text-gray-900">
              Cài Đặt Hệ Thống
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-gray-800">
          {/* 1. Gemini API Key */}
          <div className="space-y-1.5">
            <label className="block font-bold text-gray-800 text-xs">
              Gemini API Key:
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.geminiApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, geminiApiKey: e.target.value })
                }
                placeholder="Nhập khoá API Gemini của bạn..."
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title={showApiKey ? 'Ẩn khoá API' : 'Xem khoá API'}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 leading-normal">
              Khoá API được lưu an toàn trên máy của cô để gửi yêu cầu đến mô hình Gemini.
            </p>
          </div>

          {/* 2. Mô hình AI (Model) */}
          <div className="space-y-1.5">
            <label className="block font-bold text-gray-800 text-xs">
              Mô hình AI (Model):
            </label>
            <select
              value={formData.aiModel}
              onChange={(e) =>
                setFormData({ ...formData, aiModel: e.target.value })
              }
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Gemini 3.1 Flash Lite (RPD 500, RPM 15 - Mặc định)">
                Gemini 3.1 Flash Lite (RPD 500, RPM 15 - Mặc định)
              </option>
              <option value="Gemini 2.5 Flash (RPD 20, RPM 5)">
                Gemini 2.5 Flash (RPD 20, RPM 5)
              </option>
              <option value="Gemini 2.5 Pro">Gemini 2.5 Pro</option>
            </select>
            <p className="text-[11px] text-gray-500 leading-normal">
              Mô hình 3.1 & 3.5 Flash Lite có hạn ngạch tới 500 lượt/ngày (gấp 25 lần so với 2.5 Flash). Khi một model hết token/quota hệ thống sẽ tự động chuyển đổi.
            </p>
          </div>

          <hr className="border-gray-200" />

          {/* 3. Thông Tin Giáo Viên */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Thông Tin Giáo Viên</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                  Tên giáo viên:
                </label>
                <input
                  type="text"
                  value={formData.teacherName}
                  onChange={(e) =>
                    setFormData({ ...formData, teacherName: e.target.value })
                  }
                  placeholder="Giáo viên"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                  Môn phụ trách:
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Toàn trường"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                  Năm học mặc định:
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value })
                  }
                  placeholder="2025-2026"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1 text-[11px]">
                  Học kỳ mặc định:
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value })
                  }
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Học kỳ 1">Học kỳ 1</option>
                  <option value="Học kỳ 2">Học kỳ 2</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Ngày bắt đầu Tuần 1 (Thứ Hai) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-gray-800 text-xs">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span>Ngày bắt đầu Tuần 1 (Thứ Hai):</span>
            </div>
            <div className="relative">
              <input
                type="date"
                value={formData.week1StartDate}
                onChange={(e) =>
                  setFormData({ ...formData, week1StartDate: e.target.value })
                }
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-gray-500 leading-normal">
              Dùng để tự động tính ngày tháng chính xác cho từng tuần và làm mờ các ngày đã qua.
            </p>
          </div>

          <hr className="border-gray-200" />

          {/* 5. Tích Hợp Google Drive */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
              <Cloud className="w-4 h-4 text-indigo-600" />
              <span>Tích Hợp Google Drive</span>
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-gray-700 text-[11px]">
                Google OAuth Client ID (Dùng để upload & xem file trên Drive cá nhân):
              </label>
              <input
                type="text"
                value={formData.googleOAuthClientId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    googleOAuthClientId: e.target.value,
                  })
                }
                placeholder="Nhập OAuth Client ID..."
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-gray-500 leading-normal">
                Tạo miễn phí tại Google Cloud Console (OAuth 2.0 Client ID) để cấp quyền tải file lên Drive của cô.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-gray-700 text-[11px]">
                Google Drive API Key (Tìm kiếm file công khai):
              </label>
              <input
                type="text"
                value={formData.googleDriveApiKey}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    googleDriveApiKey: e.target.value,
                  })
                }
                placeholder="Nhập Drive API Key..."
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savedSuccess ? 'Đã lưu!' : 'Lưu cài đặt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
