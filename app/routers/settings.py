from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.storage_service import StorageService
from app.models.schemas import SettingsModel

from datetime import datetime

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
def get_settings():
    return StorageService.get_settings()

@router.get("/time")
def get_server_time():
    """Lấy ngày giờ máy chủ chính xác để đối chiếu thời gian trên lịch"""
    now = datetime.now()
    return {
        "current_date": now.strftime("%Y-%m-%d"),
        "iso": now.isoformat(),
        "timestamp": int(now.timestamp())
    }

@router.post("")
def update_settings(settings: SettingsModel):
    current = StorageService.get_settings()
    data = settings.model_dump()
    current.update(data)
    saved = StorageService.save_settings(current)
    return {"message": "Cài đặt đã được lưu thành công", "settings": saved}
