from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any

from app.models.schemas import Timetable, UpdateLessonRequest, PeriodSlot
from app.services.storage_service import StorageService
from app.services.gemini_service import GeminiService
from app.config import UPLOAD_DIR

router = APIRouter(prefix="/timetable", tags=["Timetable"])

@router.get("/current")
def get_current_timetable(week: Optional[int] = Query(None)):
    settings = StorageService.get_settings()
    year = settings.get("current_year", "2025-2026")
    sem = settings.get("current_semester", "HK1")
    w = week or settings.get("current_week", 1)
    return StorageService.get_timetable(year, sem, w)

@router.get("")
def get_timetable_by_term(
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    week: Optional[int] = Query(None)
):
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")
    w = week or settings.get("current_week", 1)
    return StorageService.get_timetable(y, s, w)

@router.get("/weeks")
def get_weeks(
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None)
):
    """Lấy danh sách các tuần học có trong học kỳ"""
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")
    weeks = StorageService.list_weeks(y, s)
    return {
        "year": y,
        "semester": s,
        "weeks": weeks,
        "current_week": settings.get("current_week", 1)
    }

@router.get("/terms")
def get_terms(year: Optional[str] = Query(None)):
    """Lấy danh sách năm học và học kỳ"""
    years = StorageService.list_academic_years()
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    semesters = StorageService.list_semesters(y)
    return {
        "years": years,
        "semesters": semesters,
        "current_year": settings.get("current_year", "2025-2026"),
        "current_semester": settings.get("current_semester", "HK1")
    }

@router.post("/save")
def save_timetable(timetable: Timetable):
    try:
        saved = StorageService.save_timetable(timetable)
        return {
            "message": f"Đã lưu thành công thời khoá biểu năm học {saved.metadata.academic_year} ({saved.metadata.semester}) - Tuần {saved.metadata.week}",
            "timetable": saved
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/week/create")
def create_week(
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    copy_from: Optional[int] = Query(None)
):
    """Tạo tuần học mới trong học kỳ (tự động kế thừa khung lịch)"""
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")

    new_tt = StorageService.create_new_week(y, s, copy_from)
    return {
        "message": f"Đã tạo thành công Tuần {new_tt.metadata.week}",
        "timetable": new_tt,
        "weeks": StorageService.list_weeks(y, s)
    }

@router.delete("/week")
def delete_week(
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    week: int = Query(...)
):
    """Xoá một tuần học"""
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")

    StorageService.delete_week(y, s, week)
    weeks = StorageService.list_weeks(y, s)
    new_active_week = weeks[0] if weeks else 1
    new_tt = StorageService.get_timetable(y, s, new_active_week)

    return {
        "message": f"Đã xoá Tuần {week} thành công",
        "timetable": new_tt,
        "weeks": weeks
    }

@router.post("/term/create")
def create_term(
    year: str = Query(...),
    semester: str = Query(...),
    start_date: Optional[str] = Query(None)
):
    """Tạo học kỳ mới / năm học mới"""
    tt = StorageService.create_new_term(year, semester, start_date)
    return {
        "message": f"Đã tạo học kỳ {semester} năm học {year} thành công",
        "timetable": tt
    }

@router.delete("/term")
def delete_term(
    year: str = Query(...),
    semester: str = Query(...)
):
    """Xoá học kỳ / năm học"""
    StorageService.delete_term(year, semester)
    return {
        "message": f"Đã xoá học kỳ {semester} năm học {year}"
    }

@router.post("/reuse-next-year")
def reuse_next_year(
    from_year: str = Query(...),
    from_semester: str = Query(...),
    to_year: Optional[str] = Query(None)
):
    """Tái sử dụng toàn bộ thời khoá biểu & giáo án cho năm học tiếp theo"""
    res = StorageService.reuse_for_next_year(from_year, from_semester, to_year)
    return {
        "message": f"Đã tái sử dụng thành công toàn bộ {res['copied_weeks']} tuần học sang năm học {res['to_year']} ({res['to_semester']})",
        "result": res
    }

@router.get("/archives")
def get_archives():
    """Lấy danh sách các kỳ học đã lưu trữ trên hệ thống"""
    return StorageService.list_archived_semesters()

@router.put("/lesson/{period_id}")
def update_lesson(
    period_id: str,
    payload: UpdateLessonRequest,
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    week: Optional[int] = Query(None)
):
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")
    w = week or settings.get("current_week", 1)

    updates = {
        "lesson_title": payload.lesson_title,
        "lesson_objective": payload.lesson_objective,
        "notes": payload.notes,
        "class_name": payload.class_name,
        "room": payload.room
    }
    updates = {k: v for k, v in updates.items() if v is not None}

    updated_slot = StorageService.update_lesson_detail(
        year=y,
        semester=s,
        week=w,
        period_id=period_id,
        updates=updates,
        auto_analyze_ai=payload.auto_analyze_ai or False
    )

    if not updated_slot:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy tiết học ID: {period_id}")

    return {
        "message": "Đã cập nhật chi tiết bài giảng thành công",
        "slot": updated_slot
    }

@router.post("/lesson/{period_id}/analyze-ai")
def analyze_lesson_with_ai(
    period_id: str,
    year: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    week: Optional[int] = Query(None),
    access_token: Optional[str] = Query(None)
):
    """Kích hoạt AI đọc tài liệu đính kèm để tự động trích xuất Tên bài học và Mục tiêu bài học"""
    settings = StorageService.get_settings()
    y = year or settings.get("current_year", "2025-2026")
    s = semester or settings.get("current_semester", "HK1")
    w = week or settings.get("current_week", 1)

    tt = StorageService.get_timetable(y, s, w)
    target_slot = None
    for slot in tt.schedule:
        if slot.id == period_id:
            target_slot = slot
            break

    if not target_slot:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học")

    if not target_slot.drive_files:
        raise HTTPException(status_code=400, detail="Tiết học chưa có tài liệu đính kèm để AI phân tích")

    latest_file = target_slot.drive_files[-1]
    subject = target_slot.subject or settings.get("subject", "Ngữ văn")

    # 1. Kiểm tra nếu file đã có sẵn trong local uploads
    matches = list(UPLOAD_DIR.glob(f"{latest_file.id}.*"))
    ai_result = None

    if matches:
        ai_result = GeminiService.analyze_lesson_document(
            file_path=str(matches[0]),
            class_name=target_slot.class_name,
            subject=subject
        )
    else:
        # 2. Thử tải từ Google Drive qua API
        try:
            from app.services.drive_service import DriveService
            file_bytes = DriveService.download_file_content(
                file_id=latest_file.id,
                access_token=access_token,
                mime_type=latest_file.mime_type
            )
            if file_bytes:
                # Lưu tạm vào UPLOAD_DIR
                ext = ".docx" if "word" in (latest_file.mime_type or "") else (".pdf" if "pdf" in (latest_file.mime_type or "") else ".txt")
                temp_saved_path = UPLOAD_DIR / f"{latest_file.id}{ext}"
                with open(temp_saved_path, "wb") as f:
                    f.write(file_bytes)
                ai_result = GeminiService.analyze_lesson_document(
                    file_path=str(temp_saved_path),
                    class_name=target_slot.class_name,
                    subject=subject
                )
        except Exception as e:
            print(f"[Drive Download for AI Error]: {e}")

        # 3. Fallback theo tên file nếu không thể tải trực tiếp file nhị phân
        if not ai_result or not (ai_result.get("lesson_title") or ai_result.get("lesson_objective")):
            ai_result = GeminiService.analyze_lesson_document(
                file_name=latest_file.name,
                class_name=target_slot.class_name,
                subject=subject
            )

    if not ai_result:
        ai_result = {"lesson_title": "", "lesson_objective": ""}

    if ai_result.get("lesson_title"):
        target_slot.lesson_title = ai_result["lesson_title"]
    if ai_result.get("lesson_objective"):
        target_slot.lesson_objective = ai_result["lesson_objective"]
    target_slot.analyzed_file_ids = [f.id for f in target_slot.drive_files]

    StorageService.save_timetable(tt)

    return {
        "message": "AI đã phân tích tài liệu và điền nội dung thành công!",
        "slot": target_slot,
        "ai_result": ai_result
    }
