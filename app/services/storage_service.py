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
            (6, "14:00 - 14:45"),
            (7, "14:55 - 15:40"),
            (8, "15:50 - 16:35")
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
            # Thử tìm tuần gần nhất trong kỳ học để kế thừa khung phân công thời khoá biểu!
            parent_dir = path.parent
            base_template = None
            if parent_dir.exists():
                existing_weeks = sorted([
                    int(f.stem.replace("week_", ""))
                    for f in parent_dir.glob("week_*.json")
                    if f.stem.replace("week_", "").isdigit()
                ])
                for prev_w in existing_weeks:
                    prev_path = parent_dir / f"week_{prev_w}.json"
                    try:
                        with open(prev_path, "r", encoding="utf-8") as pf:
                            prev_data = json.load(pf)
                            base_tt = Timetable(**prev_data)
                            new_schedule = []
                            for slot in base_tt.schedule:
                                # Chỉ giữ 8 tiết chuẩn (5 sáng + 3 chiều)
                                if slot.period > 8:
                                    continue
                                new_slot = slot.copy(deep=True)
                                new_slot.lesson_title = ""
                                new_slot.lesson_objective = ""
                                new_slot.notes = ""
                                new_slot.drive_files = []
                                new_slot.analyzed_file_ids = []
                                new_schedule.append(new_slot)
                            base_template = Timetable(
                                metadata=TimetableMetadata(
                                    teacher_name=base_tt.metadata.teacher_name,
                                    academic_year=target_year,
                                    semester=target_sem,
                                    week=target_week,
                                    applied_date=datetime.now().strftime("%Y-%m-%d"),
                                    start_date=base_tt.metadata.start_date,
                                    total_periods=base_tt.metadata.total_periods,
                                    created_at=datetime.now().isoformat(),
                                    updated_at=datetime.now().isoformat()
                                ),
                                schedule=new_schedule
                            )
                            break
                    except Exception:
                        pass

            if base_template:
                StorageService.save_timetable(base_template)
                return base_template

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
                # Lọc bỏ tiết 9, 10 cũ nếu có trong file
                if "schedule" in data:
                    data["schedule"] = [s for s in data["schedule"] if s.get("period", 0) <= 8]
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
    def propagate_schedule_to_all_weeks(
        source_timetable: Timetable,
        total_weeks: int = 20
    ) -> int:
        """Lan truyền khung phân công thời khoá biểu (lớp, môn, phòng) sang tất cả các tuần của kỳ học.
        Bảo toàn bài dạy và tài liệu nếu tuần đó đã có sẵn."""
        year = source_timetable.metadata.academic_year
        sem = source_timetable.metadata.semester
        source_week = source_timetable.metadata.week or 1

        # Map khung phân công từ source (chỉ lấy 8 tiết chuẩn)
        assignment_map = {}
        for slot in source_timetable.schedule:
            if slot.period <= 8:
                assignment_map[f"{slot.day_of_week}_{slot.period}"] = {
                    "class_name": slot.class_name,
                    "subject": slot.subject,
                    "room": slot.room
                }

        count_updated = 0
        for w in range(1, total_weeks + 1):
            if w == source_week:
                continue
            path = StorageService._get_timetable_path(year, sem, w)
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        w_data = json.load(f)
                    w_tt = Timetable(**w_data)
                    # Lọc bỏ tiết 9, 10 cũ nếu có
                    w_tt.schedule = [s for s in w_tt.schedule if s.period <= 8]
                    # Cập nhật khung phân công lớp mà không ghi đè bài dạy / tài liệu
                    for slot in w_tt.schedule:
                        key = f"{slot.day_of_week}_{slot.period}"
                        if key in assignment_map:
                            slot.class_name = assignment_map[key]["class_name"]
                            slot.subject = assignment_map[key]["subject"]
                            slot.room = assignment_map[key]["room"]
                    StorageService.save_timetable(w_tt)
                    count_updated += 1
                except Exception:
                    pass
            else:
                # Tạo mới tuần w kế thừa khung phân công
                new_schedule = []
                for slot in source_timetable.schedule:
                    if slot.period > 8:
                        continue
                    new_slot = slot.copy(deep=True)
                    new_slot.lesson_title = ""
                    new_slot.lesson_objective = ""
                    new_slot.notes = ""
                    new_slot.drive_files = []
                    new_slot.analyzed_file_ids = []
                    new_schedule.append(new_slot)
                new_tt = Timetable(
                    metadata=TimetableMetadata(
                        teacher_name=source_timetable.metadata.teacher_name,
                        academic_year=year,
                        semester=sem,
                        week=w,
                        applied_date=datetime.now().strftime("%Y-%m-%d"),
                        start_date=source_timetable.metadata.start_date,
                        total_periods=source_timetable.metadata.total_periods,
                        created_at=datetime.now().isoformat(),
                        updated_at=datetime.now().isoformat()
                    ),
                    schedule=new_schedule
                )
                StorageService.save_timetable(new_tt)
                count_updated += 1

        return count_updated

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
                target_slot.updated_at = datetime.now().isoformat()
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

    @staticmethod
    def backup_all_data() -> Dict[str, Any]:
        """Gom toàn bộ Cài đặt và Thời khoá biểu các tuần/học kỳ để đồng bộ lên Google Drive"""
        settings = StorageService.get_settings()
        timetables_data: Dict[str, Dict[str, Dict[str, Any]]] = {}

        if TIMETABLES_DIR.exists():
            for year_dir in TIMETABLES_DIR.iterdir():
                if year_dir.is_dir() and not year_dir.name.startswith("."):
                    year = year_dir.name
                    timetables_data[year] = {}
                    for sem_dir in year_dir.iterdir():
                        if sem_dir.is_dir():
                            sem = sem_dir.name
                            timetables_data[year][sem] = {}
                            for file in sem_dir.glob("*.json"):
                                try:
                                    with open(file, "r", encoding="utf-8") as f:
                                        timetables_data[year][sem][file.stem] = json.load(f)
                                except Exception as e:
                                    print(f"[Backup Error reading {file}]: {e}")

        return {
            "version": "2.0",
            "exported_at": datetime.now().isoformat(),
            "settings": settings,
            "timetables": timetables_data
        }

    @staticmethod
    def restore_all_data(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Khôi phục toàn bộ Cài đặt và Thời khoá biểu từ gói đồng bộ Google Drive"""
        restored_files = 0
        settings = payload.get("settings")
        if settings and isinstance(settings, dict):
            StorageService.save_settings(settings)

        timetables_data = payload.get("timetables", {})
        if isinstance(timetables_data, dict):
            for year, sems in timetables_data.items():
                if isinstance(sems, dict):
                    for sem, files in sems.items():
                        if isinstance(files, dict):
                            sem_dir = TIMETABLES_DIR / year / sem
                            sem_dir.mkdir(parents=True, exist_ok=True)
                            for file_stem, file_content in files.items():
                                target_path = sem_dir / f"{file_stem}.json"
                                try:
                                    with open(target_path, "w", encoding="utf-8") as f:
                                        json.dump(file_content, f, ensure_ascii=False, indent=2)
                                    restored_files += 1
                                except Exception as e:
                                    print(f"[Restore Error writing {target_path}]: {e}")

        return {
            "success": True,
            "restored_files": restored_files,
            "settings_restored": bool(settings)
        }

