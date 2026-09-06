from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DriveFile(BaseModel):
    id: str
    name: str
    mime_type: str = Field(default="application/octet-stream", alias="mimeType")
    web_view_link: str = Field(default="", alias="webViewLink")
    icon_link: Optional[str] = Field(default=None, alias="iconLink")
    size: Optional[str] = None
    modified_time: Optional[str] = Field(default=None, alias="modifiedTime")

    class Config:
        populate_by_name = True

class PeriodSlot(BaseModel):
    id: str  # e.g., "d2_p1"
    day_of_week: int = Field(..., alias="dayOfWeek", description="2 (Thứ 2) to 7 (Thứ 7), 8 (Chủ nhật)")
    session: str = Field(..., description="'morning' (tiết 1-5) or 'afternoon' (tiết 6-10)")
    period: int = Field(..., description="1 to 10")
    time_range: str = Field(default="", alias="timeRange")
    class_name: str = Field(default="", alias="className")
    subject: str = Field(default="")
    room: str = Field(default="")
    lesson_title: str = Field(default="", alias="lessonTitle")
    lesson_objective: str = Field(default="", alias="lessonObjective")
    notes: str = Field(default="")
    drive_folder_id: Optional[str] = Field(default=None, alias="driveFolderId")
    drive_files: List[DriveFile] = Field(default_factory=list, alias="driveFiles")
    analyzed_file_ids: List[str] = Field(default_factory=list, alias="analyzedFileIds")

    class Config:
        populate_by_name = True

class TimetableMetadata(BaseModel):
    teacher_name: str = Field(default="Giáo viên", alias="teacherName")
    academic_year: str = Field(default="2025-2026", alias="academicYear")
    semester: str = Field(default="HK1")
    week: int = Field(default=1)
    applied_date: str = Field(default="", alias="appliedDate")
    start_date: str = Field(default="2026-09-07", alias="startDate")  # Ngày Thứ 2 bắt đầu tuần 1
    total_periods: int = Field(default=0, alias="totalPeriods")
    notes: Optional[str] = ""
    created_at: Optional[str] = Field(default="", alias="createdAt")
    updated_at: Optional[str] = Field(default="", alias="updatedAt")

    class Config:
        populate_by_name = True

class Timetable(BaseModel):
    metadata: TimetableMetadata
    schedule: List[PeriodSlot]

class ChatMessage(BaseModel):
    id: str
    sender: str  # "user" | "assistant"
    text: str
    timestamp: str
    file_attachment: Optional[Dict[str, Any]] = None
    pending_timetable: Optional[Timetable] = None
    status: Optional[str] = None  # "normal" | "pending_confirmation" | "confirmed"

class SettingsModel(BaseModel):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    teacher_name: str = "Giáo viên"
    subject: str = "Toàn trường"
    current_year: str = "2025-2026"
    current_semester: str = "HK1"
    current_week: int = 1
    start_date: str = "2026-09-07"
    google_drive_enabled: bool = False
    google_drive_client_id: str = ""
    google_drive_api_key: str = ""
    google_drive_folder_id: str = ""

class UpdateLessonRequest(BaseModel):
    lesson_title: Optional[str] = Field(default=None, alias="lessonTitle")
    lesson_objective: Optional[str] = Field(default=None, alias="lessonObjective")
    notes: Optional[str] = None
    class_name: Optional[str] = Field(default=None, alias="className")
    room: Optional[str] = None
    auto_analyze_ai: Optional[bool] = Field(default=False, alias="autoAnalyzeAi")

class AttachDriveFileRequest(BaseModel):
    period_id: str
    file: DriveFile

class DetachDriveFileRequest(BaseModel):
    period_id: str
    file_id: str
