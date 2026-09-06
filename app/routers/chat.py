import os
import uuid
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.config import UPLOAD_DIR
from app.services.storage_service import StorageService
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/api/chat", tags=["Chat AI"])

@router.get("/history")
def get_chat_history():
    return StorageService.get_chat_history()

@router.delete("/history")
def clear_chat_history():
    StorageService.save_chat_history([])
    return {"message": "Đã xoá lịch sử chat thành công"}

@router.post("/send")
async def send_message(
    message: str = Form(""),
    file: Optional[UploadFile] = File(None),
    custom_api_key: Optional[str] = Form(None)
):
    saved_file_path = None
    file_info = None

    if file and file.filename:
        ext = Path(file.filename).suffix
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        saved_file_path = str(UPLOAD_DIR / safe_filename)
        
        with open(saved_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        file_info = {
            "name": file.filename,
            "size": len(content),
            "type": file.content_type
        }

    history = StorageService.get_chat_history()
    
    # Tạo tin nhắn của người dùng
    user_msg = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender": "user",
        "text": message,
        "timestamp": datetime.now().strftime("%H:%M - %d/%m/%Y"),
        "file": file_info
    }
    history.append(user_msg)

    # Gọi Gemini xử lý
    ai_result = GeminiService.process_chat(
        user_message=message,
        chat_history=history,
        file_path=saved_file_path,
        file_type=file.content_type if file else None,
        custom_api_key=custom_api_key
    )

    ai_msg = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender": "assistant",
        "text": ai_result.get("reply_text", ""),
        "timestamp": datetime.now().strftime("%H:%M - %d/%m/%Y"),
        "status": ai_result.get("status", "NORMAL"),
        "pending_timetable": ai_result.get("timetable")
    }
    history.append(ai_msg)
    StorageService.save_chat_history(history)

    return ai_msg
