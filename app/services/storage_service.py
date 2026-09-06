import json
import os
import shutil
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

from app.config import SETTINGS_FILE, TIMETABLES_DIR, DATA_DIR, UPLOAD_DIR, DEFAULT_SETTINGS
from app.models.schemas import Timetable, PeriodSlot, TimetableMetadata, SettingsModel, DriveFile

CHAT_HISTORY_FILE = DATA_DIR / "chat_history.json"

class StorageService:
    @staticmethod
    def get_settings() -> Dict[str, Any]:
        if not SETTINGS_FILE.exists():
            StorageService.save_settings(DEFAULT_SETTINGS)
            return DEFAULT_SETTINGS.copy()
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                merged = DEFAULT_SETTINGS.copy()
                merged.update(data)
                return merged
        except Exception:
            return DEFAULT_SETTINGS.copy()

    @staticmethod
    def save_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return settings

    @staticmethod
    def _get_timetable_path(year: str, semester: str, week: int = 1) -> Path:
        semester_dir = TIMETABLES_DIR / year / semester
        semester_dir.mkdir(parents=True, exist_ok=True)
        week_file = semester_dir / f"week_{week}.json"
        
        # Khả năng tương thích ngược: nếu file week_1.json chưa có nhưng timetable.json có sẵn
        legacy_file = semester_dir / "timetable.json"
        if not week_file.exists() and week == 1 and legacy_file.exists():
            try:
                shutil.copy2(legacy_file, week_file)
            except Exception:
                return legacy_file

        return week_file

    @staticmethod
    def list_weeks(year: Optional[str] = None, semester: Optional[str] = None) -> List[int]:
        """Lấy danh sách các tuần đã tạo trong học kỳ (mặc định [1])"""
        settings = StorageService.get_settings()
        y = year or settings.get("current_year", "2025-2026")
        s = semester or settings.get("current_semester", "HK1")
        semester_dir = TIMETABLES_DIR / y / s

        if not semester_dir.exists():
            return [1]

        weeks = []
        for file in semester_dir.glob("week_*.json"):
            match = re.search(r"week_(\d+)\.json", file.name)
            if match:
                weeks.append(int(match.group(1)))

        if not weeks:
            if (semester_dir / "timetable.json").exists():
                weeks = [1]
            else:
                weeks = [1]

        return sorted(list(set(weeks)))

    @staticmethod
    def list_academic_years() -> List[str]:
        """Lấy danh sách các năm học hiện có"""
        if not TIMETABLES_DIR.exists():
            return ["2025-2026"]
        years = [d.name for d in TIMETABLES_DIR.iterdir() if d.is_dir() and not d.name.startswith(".")]
        if not years:
            years = ["2025-2026"]
        return sorted(years, reverse=True)

    @staticmethod
    def list_semesters(year: Optional[str] = None) -> List[str]:
        """Lấy danh sách các học kỳ trong năm học"""
        settings = StorageService.get_settings()
        y = year or settings.get("current_year", "2025-2026")
        year_dir = TIMETABLES_DIR / y
        if not year_dir.exists():
            return ["HK1", "HK2"]
        sems = [d.name for d in year_dir.iterdir() if d.is_dir()]
        if not sems:
            sems = ["HK1", "HK2"]
        return sorted(sems)

    @staticmethod
    def create_empty_schedule(
        teacher_name: str = "Giáo viên",
        subject: str = "Toàn trường",
        year: str = "2025-2026",
        semester: str = "HK1",
        week: int = 1
    ) -> Timetable:
        """Tạo lưới thời khoá biểu chuẩn 6 ngày (Thứ 2 -> Thứ 7), mỗi ngày 10 tiết"""
        periods: List[PeriodSlot] = []
        time_slots_morning = [
            (1, "07:00 - 07:45"),
            (2, "07:50 - 08:35"),
            (3, "08:45 - 09:30"),
            (4, "09:40 - 10:25"),
            (5, "10:30 - 11:15")
        ]
        time_slots_afternoon = [
            (6, "13:00 - 13:45"),
            (7, "13:50 - 14:35"),
            (8, "14:45 - 15:30"),
            (9, "15:40 - 16:25"),
            (10, "16:30 - 17:15")
        ]

        for day in range(2, 8):
            for p_num, t_range in time_slots_morning:
                periods.append(PeriodSlot(
                    id=f"d{day}_p{p_num}",
                    day_of_week=day,
                    session="morning",
                    period=p_num,
                    time_range=t_range,
                    class_name="",
                    subject="",
                    room="",
                    lesson_title="",
                    lesson_objective="",
                    notes="",
                    drive_files=[],
                    analyzed_file_ids=[]
                ))
            for p_num, t_range in time_slots_afternoon:
                periods.append(PeriodSlot(
                    id=f"d{day}_p{p_num}",
                    day_of_week=day,
                    session="afternoon",
                    period=p_num,
                    time_range=t_range,
                    class_name="",
                    subject="",
                    room="",
                    lesson_title="",
                    lesson_objective="",
                    notes="",
                    drive_files=[],
                    analyzed_file_ids=[]
                ))

        settings = StorageService.get_settings()
        start_date = settings.get("start_date", "2026-09-07")

        metadata = TimetableMetadata(
            teacher_name=teacher_name,
            academic_year=year,
            semester=semester,
            week=week,
            applied_date=datetime.now().strftime("%Y-%m-%d"),
            start_date=start_date,
            total_periods=0,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        return Timetable(metadata=metadata, schedule=periods)

    @staticmethod
    def get_timetable(
        year: Optional[str] = None,
        semester: Optional[str] = None,
        week: Optional[int] = None
    ) -> Timetable:
        settings = StorageService.get_settings()
        target_year = year or settings.get("current_year", "2025-2026")
        target_sem = semester or settings.get("current_semester", "HK1")
        target_week = week or settings.get("current_week", 1)

        path = StorageService._get_timetable_path(target_year, target_sem, target_week)

        if not path.exists():
            # Nếu tuần 1 chưa có, thử copy từ template
            empty_tt = StorageService.create_empty_schedule(
                teacher_name=settings.get("teacher_name", "Giáo viên"),
                subject=settings.get("subject", "Toàn trường"),
                year=target_year,
                semester=target_sem,
                week=target_week
            )
            StorageService.save_timetable(empty_tt)
            return empty_tt

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                tt = Timetable(**data)
                tt.metadata.week = target_week
                return tt
        except Exception:
            return StorageService.create_empty_schedule(year=target_year, semester=target_sem, week=target_week)

    @staticmethod
    def save_timetable(timetable: Timetable) -> Timetable:
        year = timetable.metadata.academic_year
        sem = timetable.metadata.semester
        week = timetable.metadata.week or 1
        path = StorageService._get_timetable_path(year, sem, week)

        occupied_count = sum(1 for slot in timetable.schedule if slot.class_name.strip())
        timetable.metadata.total_periods = occupied_count
        timetable.metadata.updated_at = datetime.now().isoformat()

        with open(path, "w", encoding="utf-8") as f:
            json.dump(timetable.model_dump(by_alias=True), f, ensure_ascii=False, indent=2)

        # Lưu đồng bộ timetable.json nếu là tuần 1
        if week == 1:
            try:
                legacy_path = TIMETABLES_DIR / year / sem / "timetable.json"
                with open(legacy_path, "w", encoding="utf-8") as f:
                    json.dump(timetable.model_dump(by_alias=True), f, ensure_ascii=False, indent=2)
            except Exception:
                pass

        return timetable

    @staticmethod
    def create_new_week(year: str, semester: str, copy_from_week: Optional[int] = None) -> Timetable:
        """Tạo tuần học tiếp theo trong kỳ (kế thừa khung thời khoá biểu các lớp để cô chuẩn bị bài mới)"""
        existing_weeks = StorageService.list_weeks(year, semester)
        next_week = max(existing_weeks) + 1 if existing_weeks else 1

        source_week = copy_from_week or (max(existing_weeks) if existing_weeks else 1)
        source_tt = StorageService.get_timetable(year, semester, source_week)

        settings = StorageService.get_settings()
        new_tt = StorageService.create_empty_schedule(
            teacher_name=source_tt.metadata.teacher_name or settings.get("teacher_name", "Giáo viên"),
            subject=settings.get("subject", "Toàn trường"),
            year=year,
            semester=semester,
            week=next_week
        )

        # Kế thừa khung lịch (Lớp học, môn, phòng, thời gian) để giáo viên không phải nhập lại TKB
        for s_slot, n_slot in zip(source_tt.schedule, new_tt.schedule):
            n_slot.class_name = s_slot.class_name
            n_slot.subject = s_slot.subject
            n_slot.room = s_slot.room
            n_slot.time_range = s_slot.time_range
            # Bài dạy của tuần mới để trống để giáo viên soạn
            n_slot.lesson_title = ""
            n_slot.lesson_objective = ""
            n_slot.notes = ""
            n_slot.drive_files = []
        new_tt.metadata.start_date = source_tt.metadata.start_date or settings.get("start_date", "2026-09-07")
        new_tt.metadata.total_periods = source_tt.metadata.total_periods
        StorageService.save_timetable(new_tt)
        return new_tt

    @staticmethod
    def delete_week(year: str, semester: str, week: int) -> bool:
        """Xoá một tuần học trong kỳ"""
        semester_dir = TIMETABLES_DIR / year / semester
        target_file = semester_dir / f"week_{week}.json"
        if target_file.exists():
            target_file.unlink()

        # Kiểm tra nếu hết tuần thì tạo lại tuần 1 rỗng
        remaining = StorageService.list_weeks(year, semester)
        if not remaining:
            empty = StorageService.create_empty_schedule(year=year, semester=semester, week=1)
            StorageService.save_timetable(empty)
        return True

    @staticmethod
    def create_new_term(year: str, semester: str, start_date: Optional[str] = None) -> Timetable:
        """Tạo năm học hoặc học kỳ mới (cho phép cấu hình ngày bắt đầu tuần 1)"""
        semester_dir = TIMETABLES_DIR / year / semester
        semester_dir.mkdir(parents=True, exist_ok=True)
        
        settings = StorageService.get_settings()
        if start_date:
            settings["start_date"] = start_date
            StorageService.save_settings(settings)

        tt = StorageService.create_empty_schedule(
            teacher_name=settings.get("teacher_name", "Giáo viên"),
            subject=settings.get("subject", "Toàn trường"),
            year=year,
            semester=semester,
            week=1
        )
        if start_date:
            tt.metadata.start_date = start_date

        StorageService.save_timetable(tt)
        return tt

    @staticmethod
    def delete_term(year: str, semester: str) -> bool:
        """Xoá học kỳ / năm học"""
        semester_dir = TIMETABLES_DIR / year / semester
        if semester_dir.exists():
            shutil.rmtree(semester_dir, ignore_errors=True)
            
        year_dir = TIMETABLES_DIR / year
        if year_dir.exists() and not any(year_dir.iterdir()):
            year_dir.rmdir()
        return True

    @staticmethod
    def reuse_for_next_year(from_year: str, from_semester: str, to_year: Optional[str] = None) -> Dict[str, Any]:
        """
        Tái sử dụng toàn bộ thời khoá biểu & giáo án sang năm tiếp theo:
        Ví dụ: 2025-2026 (HK1) -> 2026-2027 (HK1)
        """
        if not to_year:
            # Tự động tính năm học tiếp theo
            match = re.match(r"(\d{4})-(\d{4})", from_year)
            if match:
                y1 = int(match.group(1)) + 1
                y2 = int(match.group(2)) + 1
                to_year = f"{y1}-{y2}"
            else:
                to_year = "2026-2027"

        source_dir = TIMETABLES_DIR / from_year / from_semester
        target_dir = TIMETABLES_DIR / to_year / from_semester
        target_dir.mkdir(parents=True, exist_ok=True)

        copied_weeks = 0
        if source_dir.exists():
            for file in source_dir.glob("*.json"):
                try:
                    with open(file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if "metadata" in data:
                        data["metadata"]["academicYear"] = to_year
                        data["metadata"]["semester"] = from_semester
                        data["metadata"]["updatedAt"] = datetime.now().isoformat()
                    with open(target_dir / file.name, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    copied_weeks += 1
                except Exception as e:
                    print(f"[Reuse Copy Error]: {e}")

        return {
            "from_year": from_year,
            "from_semester": from_semester,
            "to_year": to_year,
            "to_semester": from_semester,
            "copied_weeks": copied_weeks
        }

    @staticmethod
    def list_archived_semesters() -> List[Dict[str, Any]]:
        """Lấy danh sách các năm học và kỳ học đã lưu trữ trên hệ thống"""
        result = []
        if not TIMETABLES_DIR.exists():
            return result

        current_settings = StorageService.get_settings()
        cur_year = current_settings.get("current_year", "2025-2026")
        cur_sem = current_settings.get("current_semester", "HK1")

        for year_dir in sorted(TIMETABLES_DIR.iterdir(), reverse=True):
            if year_dir.is_dir() and not year_dir.name.startswith("."):
                for sem_dir in sorted(year_dir.iterdir(), reverse=True):
                    if sem_dir.is_dir():
                        weeks = StorageService.list_weeks(year_dir.name, sem_dir.name)
                        latest_week = max(weeks) if weeks else 1
                        tt_file = StorageService._get_timetable_path(year_dir.name, sem_dir.name, latest_week)
                        
                        meta = {}
                        if tt_file.exists():
                            try:
                                with open(tt_file, "r", encoding="utf-8") as f:
                                    data = json.load(f)
                                    meta = data.get("metadata", {})
                            except Exception:
                                pass

                        is_current = (year_dir.name == cur_year and sem_dir.name == cur_sem)
                        result.append({
                            "year": year_dir.name,
                            "semester": sem_dir.name,
                            "weeks_count": len(weeks),
                            "teacher_name": meta.get("teacherName", "Giáo viên"),
                            "total_periods": meta.get("totalPeriods", 0),
                            "updated_at": meta.get("updatedAt", ""),
                            "is_current": is_current
                        })
        return result

    @staticmethod
    def update_lesson_detail(
        year: str,
        semester: str,
        week: int,
        period_id: str,
        updates: Dict[str, Any],
        auto_analyze_ai: bool = False
    ) -> Optional[PeriodSlot]:
        timetable = StorageService.get_timetable(year, semester, week)
        target_slot = None

        for slot in timetable.schedule:
            if slot.id == period_id:
                target_slot = slot
                for key, val in updates.items():
                    if val is not None and hasattr(slot, key):
                        setattr(slot, key, val)
                break

        if target_slot:
            # KIỂM TRA ĐỘ KHÁC NHAU VÀ TỰ ĐỘNG PHÂN TÍCH TÀI LIỆU BẰNG AI:
            # Chỉ gọi AI khi:
            # 1. Người dùng yêu cầu (auto_analyze_ai = True) HOẶC
            # 2. Tiết học có đính kèm file VÀ (chưa có Tên bài học HOẶC danh sách file thay đổi so với lần phân tích trước)
            current_file_ids = [f.id for f in target_slot.drive_files]
            prev_analyzed_ids = getattr(target_slot, "analyzed_file_ids", []) or []

            files_changed = set(current_file_ids) != set(prev_analyzed_ids)
            has_no_content = not target_slot.lesson_title.strip()

            if target_slot.drive_files and (auto_analyze_ai or (files_changed and has_no_content)):
                # Lấy file đính kèm mới nhất để đọc
                latest_file = target_slot.drive_files[-1]
                file_id = latest_file.id
                
                # Tìm file cục bộ trong UPLOAD_DIR
                matches = list(UPLOAD_DIR.glob(f"{file_id}.*"))
                try:
                    from app.services.gemini_service import GeminiService
                    settings = StorageService.get_settings()
                    subject = target_slot.subject or settings.get("subject", "Ngữ văn")
                    ai_info = None

                    if matches:
                        ai_info = GeminiService.analyze_lesson_document(
                            file_path=str(matches[0]),
                            class_name=target_slot.class_name,
                            subject=subject
                        )
                    else:
                        # Thử tải từ Drive hoặc fallback phân tích theo tên file giáo án
                        try:
                            from app.services.drive_service import DriveService
                            file_bytes = DriveService.download_file_content(file_id=file_id, mime_type=latest_file.mime_type)
                            if file_bytes:
                                ext = ".docx" if "word" in (latest_file.mime_type or "") else (".pdf" if "pdf" in (latest_file.mime_type or "") else ".txt")
                                temp_p = UPLOAD_DIR / f"{file_id}{ext}"
                                with open(temp_p, "wb") as f:
                                    f.write(file_bytes)
                                ai_info = GeminiService.analyze_lesson_document(
                                    file_path=str(temp_p),
                                    class_name=target_slot.class_name,
                                    subject=subject
                                )
                        except Exception:
                            pass

                        if not ai_info:
                            ai_info = GeminiService.analyze_lesson_document(
                                file_name=latest_file.name,
                                class_name=target_slot.class_name,
                                subject=subject
                            )

                    if ai_info:
                        if ai_info.get("lesson_title") and not target_slot.lesson_title.strip():
                            target_slot.lesson_title = ai_info["lesson_title"]
                        if ai_info.get("lesson_objective") and not target_slot.lesson_objective.strip():
                            target_slot.lesson_objective = ai_info["lesson_objective"]
                        target_slot.analyzed_file_ids = current_file_ids
                except Exception as e:
                    print(f"[AI Auto-Analyze Notice]: {e}")

            StorageService.save_timetable(timetable)
        return target_slot

    @staticmethod
    def attach_drive_file(year: str, semester: str, week: int, period_id: str, drive_file: DriveFile) -> Optional[PeriodSlot]:
        timetable = StorageService.get_timetable(year, semester, week)
        target_slot = None
        for slot in timetable.schedule:
            if slot.id == period_id:
                target_slot = slot
                if not any(f.id == drive_file.id for f in slot.drive_files):
                    slot.drive_files.append(drive_file)
                break
        if target_slot:
            StorageService.save_timetable(timetable)
        return target_slot

    @staticmethod
    def detach_drive_file(year: str, semester: str, week: int, period_id: str, file_id: str) -> Optional[PeriodSlot]:
        timetable = StorageService.get_timetable(year, semester, week)
        target_slot = None
        for slot in timetable.schedule:
            if slot.id == period_id:
                target_slot = slot
                slot.drive_files = [f for f in slot.drive_files if f.id != file_id]
                break
        if target_slot:
            StorageService.save_timetable(timetable)
        return target_slot

    @staticmethod
    def get_chat_history() -> List[Dict[str, Any]]:
        if not CHAT_HISTORY_FILE.exists():
            return []
        try:
            with open(CHAT_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    @staticmethod
    def save_chat_history(messages: List[Dict[str, Any]]) -> None:
        with open(CHAT_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)
