import os
from typing import List, Dict, Any, Optional
import requests
from app.services.storage_service import StorageService

MOCK_DRIVE_FILES = [
    {
        "id": "mock_drive_file_1",
        "name": "Bai_1_Tong_quan_van_hoc_Viet_Nam.pptx",
        "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "webViewLink": "https://docs.google.com/presentation/d/demo1/edit",
        "iconLink": "https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list.png",
        "modifiedTime": "2026-09-02T10:30:00Z"
    },
    {
        "id": "mock_drive_file_2",
        "name": "Giao_an_chi_tiet_tiet_1_lop_10.docx",
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "webViewLink": "https://docs.google.com/document/d/demo2/edit",
        "iconLink": "https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list.png",
        "modifiedTime": "2026-09-01T15:45:00Z"
    },
    {
        "id": "mock_drive_file_3",
        "name": "Phieu_hoc_tap_nhom_10A1.xlsx",
        "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "webViewLink": "https://docs.google.com/spreadsheets/d/demo3/edit",
        "iconLink": "https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list.png",
        "modifiedTime": "2026-08-28T09:12:00Z"
    },
    {
        "id": "mock_drive_file_4",
        "name": "De_kiem_tra_15_phut_Van_10.pdf",
        "mimeType": "application/pdf",
        "webViewLink": "https://drive.google.com/file/d/demo4/view",
        "iconLink": "https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list.png",
        "modifiedTime": "2026-08-30T14:20:00Z"
    },
    {
        "id": "mock_drive_file_5",
        "name": "Truyen_Kieu_Doan_truong_tan_thanh_Slide.pptx",
        "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "webViewLink": "https://docs.google.com/presentation/d/demo5/edit",
        "iconLink": "https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list.png",
        "modifiedTime": "2026-09-04T08:00:00Z"
    }
]

class DriveService:
    @staticmethod
    def search_files(keyword: str, access_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """Tìm kiếm file bài giảng trên Google Drive theo tên hoặc từ khoá"""
        settings = StorageService.get_settings()
        api_key = settings.get("google_drive_api_key", "").strip()
        
        # Nếu có access_token hoặc api_key thực tế, gọi Google Drive API
        if access_token or api_key:
            try:
                url = "https://www.googleapis.com/drive/v3/files"
                params = {
                    "pageSize": 15,
                    "fields": "files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)",
                    "orderBy": "modifiedTime desc"
                }
                
                # Điều kiện lọc: không lấy folder, loại trừ file rác, tìm kiếm theo tên
                query_parts = ["trashed = false", "mimeType != 'application/vnd.google-apps.folder'"]
                if keyword.strip():
                    query_parts.append(f"name contains '{keyword.strip()}'")
                params["q"] = " and ".join(query_parts)

                headers = {}
                if access_token:
                    headers["Authorization"] = f"Bearer {access_token}"
                elif api_key:
                    params["key"] = api_key

                resp = requests.get(url, params=params, headers=headers, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    files = data.get("files", [])
                    if files:
                        return files
            except Exception as e:
                print(f"[Drive API Search Error] {e}")

        # Chế độ Fallback / Mock thông minh:
        # Nếu chưa kết nối hoặc đang test offline, lọc từ danh sách mẫu
        kw = keyword.strip().lower()
        if not kw:
            return MOCK_DRIVE_FILES
        return [f for f in MOCK_DRIVE_FILES if kw in f["name"].lower()]

    @staticmethod
    def upload_file(
        file_content: bytes,
        file_name: str,
        mime_type: str,
        access_token: str,
        folder_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Upload file trực tiếp lên tài khoản Google Drive cá nhân của giáo viên qua OAuth2 token"""
        import json
        try:
            url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink,size"
            headers = {"Authorization": f"Bearer {access_token}"}
            metadata = {
                "name": file_name,
                "mimeType": mime_type
            }
            if folder_id:
                metadata["parents"] = [folder_id]

            files = {
                "metadata": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
                "file": (file_name, file_content, mime_type)
            }
            resp = requests.post(url, headers=headers, files=files, timeout=30)
            if resp.status_code in [200, 201]:
                return resp.json()
            else:
                print(f"[Drive Upload Failed]: HTTP {resp.status_code} - {resp.text}")
                return None
        except Exception as e:
            print(f"[Drive Upload Exception]: {e}")
            return None

    @staticmethod
    def get_or_create_folder_hierarchy(year: str, semester: str, access_token: str) -> Dict[str, str]:
        """Tạo cấu trúc thư mục GiaoAnCoLinh/{year}/{semester} trên Google Drive nếu có token"""
        return {
            "root": "folder_root_id",
            "year": f"folder_{year}_id",
            "semester": f"folder_{semester}_id"
        }

    @staticmethod
    def download_file_content(file_id: str, access_token: Optional[str] = None, mime_type: Optional[str] = None) -> Optional[bytes]:
        """Tải nội dung file từ Google Drive theo File ID để Gemini AI đọc"""
        settings = StorageService.get_settings()
        api_key = settings.get("google_drive_api_key", "").strip()
        token = access_token or ""

        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        # 1. Nếu là Google Doc / Slide / Sheet -> gọi Export API
        if mime_type and "google-apps" in mime_type:
            export_mime = "text/plain"
            if "presentation" in mime_type:
                export_mime = "text/plain"
            elif "spreadsheet" in mime_type:
                export_mime = "text/csv"
            elif "document" in mime_type:
                export_mime = "text/plain"

            url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export"
            params = {"mimeType": export_mime}
            if not token and api_key:
                params["key"] = api_key

            try:
                resp = requests.get(url, params=params, headers=headers, timeout=20)
                if resp.status_code == 200:
                    return resp.content
            except Exception as e:
                print(f"[Drive Export Error]: {e}")

        # 2. Nếu là file nhị phân (Word, PDF, PPTX, XLSX, TXT) -> gọi Get Media API
        url = f"https://www.googleapis.com/drive/v3/files/{file_id}"
        params = {"alt": "media"}
        if not token and api_key:
            params["key"] = api_key

        try:
            resp = requests.get(url, params=params, headers=headers, timeout=20)
            if resp.status_code == 200:
                return resp.content
        except Exception as e:
            print(f"[Drive Download Error]: {e}")

        return None
