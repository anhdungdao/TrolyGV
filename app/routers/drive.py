import uuid
import mimetypes
from pathlib import Path
from urllib.parse import quote
from fastapi import APIRouter, Query, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import Optional

from app.models.schemas import DriveFile, AttachDriveFileRequest, DetachDriveFileRequest
from app.services.drive_service import DriveService
from app.services.storage_service import StorageService
from app.config import UPLOAD_DIR

router = APIRouter(prefix="/api/drive", tags=["Google Drive"])

@router.get("/search")
def search_drive_files(
    q: str = Query("", description="Từ khoá tìm kiếm bài giảng/giáo án"),
    access_token: Optional[str] = Query(None, description="OAuth2 Token từ tài khoản Google Drive")
):
    files = DriveService.search_files(keyword=q, access_token=access_token)
    return {
        "query": q,
        "total": len(files),
        "files": files
    }

@router.get("/files/{file_id}/view")
def view_local_file(file_id: str, name: Optional[str] = Query(None), download: bool = False):
    """Mở xem trực tiếp hoặc tải tệp tài liệu giáo án đã tải lên máy"""
    matches = list(UPLOAD_DIR.glob(f"{file_id}.*"))
    if not matches:
        if (UPLOAD_DIR / file_id).exists():
            matches = [UPLOAD_DIR / file_id]
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy tệp tài liệu trên hệ thống")

    file_path = matches[0]
    display_name = name or file_path.name
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    encoded_filename = quote(display_name)
    disposition = "attachment" if download else "inline"
    headers = {
        "Content-Disposition": f"{disposition}; filename*=UTF-8''{encoded_filename}"
    }

    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=display_name,
        headers=headers
    )

@router.post("/attach")
def attach_file(
    payload: AttachDriveFileRequest,
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    week: Optional[int] = Query(None)
):
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")
    w = week or settings.get("current_week", 1)

    updated = StorageService.attach_drive_file(y, s, w, payload.period_id, payload.file)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học để gắn file")

    return {
        "message": f"Đã gán tài liệu '{payload.file.name}' vào tiết học thành công",
        "slot": updated
    }

@router.post("/detach")
def detach_file(
    payload: DetachDriveFileRequest,
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    week: Optional[int] = Query(None)
):
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")
    w = week or settings.get("current_week", 1)

    updated = StorageService.detach_drive_file(y, s, w, payload.period_id, payload.file_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học")

    return {
        "message": "Đã gỡ tài liệu khỏi tiết học thành công",
        "slot": updated
    }

@router.post("/upload")
async def upload_file_to_drive(
    file: UploadFile = File(...),
    period_id: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    week: Optional[int] = Query(None),
    access_token: Optional[str] = Query(None)
):
    """
    Tải tài liệu mới lên:
    - Luôn lưu trữ an toàn bản sao cục bộ trên máy để đảm bảo mở xem được 100%.
    - Nếu có access_token từ Google Drive, đồng thời đồng bộ tải file lên tài khoản Google Drive cá nhân của cô.
    """
    content = await file.read()
    ext = Path(file.filename).suffix
    file_id = f"local_upload_{uuid.uuid4().hex[:8]}"
    saved_path = UPLOAD_DIR / f"{file_id}{ext}"

    with open(saved_path, "wb") as f:
        f.write(content)

    # Thử tải lên Google Drive nếu đã đăng nhập OAuth
    drive_result = None
    if access_token:
        try:
            drive_result = DriveService.upload_file(
                file_content=content,
                file_name=file.filename,
                mime_type=file.content_type or "application/octet-stream",
                access_token=access_token
            )
        except Exception as e:
            print(f"[Drive Sync Notice]: Chưa tải lên Drive ({e}), sử dụng bản lưu nội bộ.")

    if drive_result and drive_result.get("webViewLink"):
        drive_file = DriveFile(
            id=drive_result.get("id", file_id),
            name=file.filename,
            mimeType=file.content_type or "application/octet-stream",
            webViewLink=drive_result.get("webViewLink"),
            iconLink=drive_result.get("iconLink") or "https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list.png",
            size=f"{len(content) // 1024} KB"
        )
    else:
        # Đường dẫn nội bộ đáng tin cậy: Mở xem trực tiếp trên máy không bị lỗi 404
        encoded_name = quote(file.filename)
        drive_file = DriveFile(
            id=file_id,
            name=file.filename,
            mimeType=file.content_type or "application/octet-stream",
            webViewLink=f"/api/drive/files/{file_id}/view?name={encoded_name}",
            iconLink="https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list.png",
            size=f"{len(content) // 1024} KB"
        )

    if period_id:
        settings = StorageService.get_settings()
        y = year or settings.get("current_year", "2025-2026")
        s = semester or settings.get("current_semester", "HK1")
        w = week or settings.get("current_week", 1)
        StorageService.attach_drive_file(y, s, w, period_id, drive_file)

    return {
        "message": f"Đã tải lên tệp '{file.filename}' thành công",
        "file": drive_file
    }
