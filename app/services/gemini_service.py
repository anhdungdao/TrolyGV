import json
import re
import os
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path

import google.generativeai as genai
from PIL import Image

from app.services.storage_service import StorageService
from app.models.schemas import Timetable, PeriodSlot, TimetableMetadata

SYSTEM_PROMPT = """Bạn là trợ lý AI chuyên nghiệp dành riêng cho giáo viên tại Việt Nam.
Nhiệm vụ chính của bạn là hỗ trợ đọc, phân tích các file thời khoá biểu (file bảng tính Excel, ảnh chụp, file Word/PDF, văn bản...) và trò chuyện giải đáp chuyên môn sư phạm.

QUY TẮC PHÂN TÍCH THỜI KHOÁ BIỂU:
1. Đọc và nhận diện dữ liệu:
   - File thời khoá biểu thường là bảng tổng thể của toàn trường hoặc tổ bộ môn gồm nhiều lớp (10A1, 10A2...), nhiều giáo viên.
   - Tên giáo viên trong bảng thường được viết tắt kèm môn dạy (Ví dụ: 'Nam T', 'Linh V', 'Hương Văn',...). Hãy luôn đối chiếu với tên và môn dạy của giáo viên hiện tại.
   - Lưới thời gian trong tuần: Thứ 2 (dayOfWeek: 2) đến Thứ 7 (dayOfWeek: 7).
   - Quy ước tiết:
     + Buổi Sáng: Tiết 1, 2, 3, 4, 5 -> session: "morning", period tương ứng 1, 2, 3, 4, 5.
     + Buổi Chiều: Tiết 1, 2, 3, 4, 5 Chiều -> session: "afternoon", period tương ứng 6, 7, 8, 9, 10 (Tiết 1 Chiều = 6, Tiết 2 Chiều = 7, Tiết 3 Chiều = 8,...).

2. Quy trình xử lý:
   - NẾU ĐÃ CÓ FILE/NỘI DUNG VÀ THÔNG TIN GIÁO VIÊN: Hãy chủ động tìm và trích xuất TẤT CẢ các tiết dạy trong tuần của giáo viên đó, tạo thành danh sách tiết hoàn chỉnh trong `timetable.schedule`.
     Đặt `status`: "PENDING_CONFIRMATION" kèm câu xác nhận thân thiện, ân cần (ví dụ: "Em đã lên xong thời khoá biểu cho thầy/cô rồi ạ! Thầy/Cô xem lịch như vậy đã đúng chưa ạ? Thầy/Cô có thể bấm nút Xác nhận bên dưới để áp dụng sang Tab 2 hoặc nhắn em sửa lại nhé!").
   - NẾU FILE KHÔNG CÓ LỊCH CỦA GIÁO VIÊN HOẶC CHƯA RÕ GIÁO VIÊN NÀO: Hỏi lại ngắn gọn, lịch sự -> `status`: "NEED_INFO".
   - NẾU CHỈ HỎI ĐÁP BÌNH THƯỜNG: Trả lời tự nhiên -> `status`: "NORMAL".

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Bạn PHẢI LUÔN TRẢ VỀ DUY NHẤT MỘT JSON OBJECT theo đúng cấu trúc sau (không kèm markdown ngoài JSON):
{
  "reply_text": "Nội dung phản hồi thân thiện gửi đến giáo viên",
  "status": "NEED_INFO" | "PENDING_CONFIRMATION" | "NORMAL",
  "timetable": {
    "metadata": {
      "teacherName": "Tên giáo viên",
      "academicYear": "2025-2026",
      "semester": "HK1",
      "appliedDate": "2026-09-07",
      "totalPeriods": 0,
      "notes": ""
    },
    "schedule": [
      {
        "id": "d2_p3",
        "dayOfWeek": 2,
        "session": "morning",
        "period": 3,
        "timeRange": "08:45 - 09:30",
        "className": "10A8",
        "subject": "Ngữ văn",
        "room": "",
        "lessonTitle": "",
        "notes": ""
      }
    ]
  }
}
* Lưu ý: `timetable` chỉ cần trả về khi `status` là "PENDING_CONFIRMATION".
"""

class GeminiService:
    @staticmethod
    def extract_file_content(file_path: str) -> Tuple[Optional[Any], Optional[str]]:
        """
        Đọc và chuyển đổi nội dung file tải lên thành format phù hợp cho Gemini:
        - Ảnh (.jpg, .jpeg, .png, .webp, .bmp): PIL Image
        - Excel (.xlsx, .xls): bảng tính kèm xử lý merged cells sang text bảng biểu
        - Word (.docx): nội dung văn bản và bảng biểu
        - PDF (.pdf): trích xuất text từ các trang
        - Văn bản (.txt, .csv, ...): chuỗi ký tự UTF-8
        """
        if not file_path or not os.path.exists(file_path):
            return None, None

        ext = Path(file_path).suffix.lower()

        # 1. File Excel (.xlsx, .xls)
        if ext in [".xlsx", ".xls"]:
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_path, data_only=True)
                sheets_text = []
                for sheet_name in wb.sheetnames:
                    sheet = wb[sheet_name]
                    # Điền giá trị cho các ô bị gộp (merged cells) để không bị mất thông tin Thứ / Buổi / Tiết
                    for merged_range in list(sheet.merged_cells.ranges):
                        min_col, min_row, max_col, max_row = merged_range.bounds
                        top_left_val = sheet.cell(row=min_row, column=min_col).value
                        sheet.unmerge_cells(str(merged_range))
                        for r in range(min_row, max_row + 1):
                            for c in range(min_col, max_col + 1):
                                sheet.cell(row=r, column=c, value=top_left_val)

                    rows_text = [f"=== BẢNG TÍNH / SHEET: {sheet_name} ==="]
                    for row in sheet.iter_rows(values_only=True):
                        if any(cell is not None and str(cell).strip() for cell in row):
                            cleaned_row = [str(c).replace("\n", " ").strip() if c is not None else "" for c in row]
                            while cleaned_row and cleaned_row[-1] == "":
                                cleaned_row.pop()
                            if cleaned_row:
                                rows_text.append(" | ".join(cleaned_row))
                    sheets_text.append("\n".join(rows_text))
                return None, "\n\n".join(sheets_text)
            except Exception as e1:
                try:
                    import pandas as pd
                    excel_file = pd.ExcelFile(file_path)
                    sheets_text = []
                    for s_name in excel_file.sheet_names:
                        df = pd.read_excel(file_path, sheet_name=s_name)
                        sheets_text.append(f"=== Sheet: {s_name} ===\n" + df.to_string(index=False))
                    return None, "\n\n".join(sheets_text)
                except Exception as e2:
                    return None, f"[Không thể đọc file Excel: {str(e2)}]"

        # 2. File Word (.docx)
        elif ext in [".docx"]:
            try:
                import docx
                doc = docx.Document(file_path)
                lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                for t in doc.tables:
                    for r in t.rows:
                        cv = [c.text.replace("\n", " ").strip() for c in r.cells]
                        if any(cv):
                            lines.append(" | ".join(cv))
                return None, "\n".join(lines)
            except Exception as e:
                return None, f"[Không thể đọc file Word: {str(e)}]"

        # 2.1 File PowerPoint (.pptx)
        elif ext in [".pptx"]:
            try:
                from pptx import Presentation
                prs = Presentation(file_path)
                slides_text = []
                for i, slide in enumerate(prs.slides):
                    slide_lines = []
                    for shape in slide.shapes:
                        if shape.has_text_frame:
                            for paragraph in shape.text_frame.paragraphs:
                                text = paragraph.text.strip()
                                if text:
                                    slide_lines.append(text)
                    if slide_lines:
                        slides_text.append(f"--- Slide {i + 1} ---\n" + "\n".join(slide_lines))
                return None, "\n\n".join(slides_text)
            except Exception as e:
                return None, f"[Không thể đọc file PowerPoint: {str(e)}]"

        # 3. File PDF (.pdf)
        elif ext in [".pdf"]:
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                pages = []
                for i, p in enumerate(reader.pages):
                    txt = p.extract_text() or ""
                    if txt.strip():
                        pages.append(f"--- Trang {i + 1} ---\n{txt.strip()}")
                return None, "\n\n".join(pages)
            except Exception as e:
                return None, f"[Không thể đọc file PDF: {str(e)}]"

        # 4. File Ảnh (.jpg, .jpeg, .png, .webp, .bmp)
        elif ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            try:
                img = Image.open(file_path)
                return img, None
            except Exception as e:
                return None, f"[Không thể đọc file ảnh: {str(e)}]"

        # 5. File văn bản / CSV / Text
        else:
            for enc in ["utf-8-sig", "utf-8", "cp1258", "latin-1"]:
                try:
                    with open(file_path, "r", encoding=enc, errors="ignore") as f:
                        content = f.read(50000)
                        return None, content
                except Exception:
                    continue
            return None, "[Không thể đọc nội dung file văn bản]"

    @staticmethod
    def is_quota_or_rate_limit(err: Exception) -> bool:
        """Kiểm tra xem lỗi có phải do hết quota, giới hạn token/lượt gọi (429, ResourceExhausted) hay không"""
        err_str = str(err).lower()
        return any(k in err_str for k in [
            "429", "resource_exhausted", "resourceexhausted", 
            "quota", "rate limit", "too many requests", "exhausted", "tpm", "rpm", "rpd"
        ])

    @staticmethod
    def get_candidate_models(chosen_model: Optional[str] = None) -> List[str]:
        """
        Xác định danh sách model ưu tiên:
        - Mặc định: Luân chuyển giữa gemini-3.1-flash-lite và gemini-3.5-flash-lite (RPD 500, RPM 15) khi hết quota
        - Dự phòng: gemini-flash-lite-latest, gemini-2.5-flash-lite, gemini-2.5-flash
        """
        if not chosen_model or chosen_model in ["auto-rotate", "gemini-3.1-flash-lite"]:
            primary = "gemini-3.1-flash-lite"
            secondary = "gemini-3.5-flash-lite"
        elif chosen_model == "gemini-3.5-flash-lite":
            primary = "gemini-3.5-flash-lite"
            secondary = "gemini-3.1-flash-lite"
        else:
            primary = chosen_model
            secondary = "gemini-3.1-flash-lite"

        candidates = [primary]
        for m in [secondary, "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"]:
            if m not in candidates:
                candidates.append(m)
        return candidates

    @staticmethod
    def get_client(custom_api_key: Optional[str] = None, model_name: Optional[str] = None):
        settings = StorageService.get_settings()
        api_key = custom_api_key or settings.get("gemini_api_key") or os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        target_model = model_name or settings.get("gemini_model") or "gemini-3.1-flash-lite"
        if target_model == "auto-rotate":
            target_model = "gemini-3.1-flash-lite"
        return genai.GenerativeModel(
            model_name=target_model,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.3
            },
            system_instruction=SYSTEM_PROMPT
        )

    @staticmethod
    def process_chat(
        user_message: str,
        chat_history: List[Dict[str, Any]],
        file_path: Optional[str] = None,
        file_type: Optional[str] = None,
        custom_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Xử lý tin nhắn và file gửi từ người dùng thông qua Gemini"""
        settings = StorageService.get_settings()
        api_key = custom_api_key or settings.get("gemini_api_key") or os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            return {
                "reply_text": "⚠️ Cô chưa cài đặt Gemini API Key. Vui lòng bấm vào biểu tượng ⚙️ Cài đặt ở góc trên bên phải để nhập API Key nhé!",
                "status": "NORMAL",
                "timetable": None
            }

        chosen_model = settings.get("gemini_model") or "gemini-3.1-flash-lite"
        candidate_models = GeminiService.get_candidate_models(chosen_model)

        teacher_name = settings.get("teacher_name", "Giáo viên")
        subject = settings.get("subject", "Toàn trường")
        current_year = settings.get("current_year", "2025-2026")
        current_semester = settings.get("current_semester", "HK1")

        # Chuẩn bị nội dung gửi Gemini
        contents = []

        # Ghép lịch sử trò chuyện gần nhất (tối đa 4 tin nhắn trước đó) để giữ ngữ cảnh
        recent_history = chat_history[-4:] if len(chat_history) > 4 else chat_history
        if recent_history:
            history_summary = "Lịch sử hội thoại gần nhất:\n"
            for msg in recent_history:
                role = "Giáo viên" if msg.get("sender") == "user" else "AI"
                history_summary += f"- {role}: {msg.get('text', '')}\n"
            contents.append(history_summary)

        # Xử lý file đính kèm nếu có
        if file_path and os.path.exists(file_path):
            img_obj, text_content = GeminiService.extract_file_content(file_path)
            if img_obj:
                contents.append(img_obj)
                contents.append("Dưới đây là hình ảnh thời khoá biểu được tải lên:")
            elif text_content:
                contents.append(f"Dưới đây là nội dung thời khoá biểu trích xuất từ file:\n```\n{text_content}\n```")

        # Bổ sung thông tin giáo viên và câu lệnh
        prompt_text = user_message.strip() or "Hãy phân tích thời khoá biểu này và trích xuất lịch dạy cho tôi."
        instruction_text = (
            f"Thông tin giáo viên đang sử dụng hệ thống:\n"
            f"- Họ tên: {teacher_name}\n"
            f"- Môn phụ trách: {subject}\n"
            f"- Năm học: {current_year} - Học kỳ: {current_semester}\n"
            f"(Lưu ý quan trọng: Trong bảng thời khoá biểu, tên giáo viên thường viết tắt như '{teacher_name}', tên kèm môn như '{teacher_name} {subject}',... Hãy tìm đúng các tiết có giáo viên này để trích xuất đầy đủ).\n\n"
            f"Yêu cầu của giáo viên: {prompt_text}"
        )
        contents.append(instruction_text)

        try:
            raw_text = None
            last_error = None
            used_model = None

            for model_candidate in candidate_models:
                try:
                    model = GeminiService.get_client(custom_api_key=custom_api_key, model_name=model_candidate)
                    if not model:
                        continue
                    response = model.generate_content(contents)
                    raw_text = response.text.strip()
                    if raw_text:
                        used_model = model_candidate
                        break
                except Exception as e:
                    last_error = e
                    err_str = str(e).lower()
                    is_quota = GeminiService.is_quota_or_rate_limit(e)
                    # Nếu hết quota (429, ResourceExhausted) hoặc 404/503, tự động chuyển sang model tiếp theo
                    if is_quota or "404" in err_str or "not found" in err_str or "503" in err_str or "unavailable" in err_str:
                        print(f"[Gemini Quota/Limit]: Model {model_candidate} gặp lỗi ({e}). Tự động đổi sang model tiếp theo trong danh sách...")
                        continue
                    raise e

            if raw_text is None:
                if last_error:
                    raise last_error
                raise RuntimeError("Không nhận được phản hồi từ Gemini.")

            # Nếu mô hình luân chuyển khác mô hình đang lưu, cập nhật settings để lần sau ưu tiên model đang còn hạn ngạch
            if used_model and used_model != settings.get("gemini_model") and settings.get("gemini_model") != "auto-rotate":
                try:
                    settings["gemini_model"] = used_model
                    StorageService.save_settings(settings)
                except Exception:
                    pass

            # Parse JSON kết quả
            cleaned_text = raw_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            try:
                data = json.loads(cleaned_text)
            except Exception:
                match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                else:
                    data = {"reply_text": cleaned_text, "status": "NORMAL"}

            # Đảm bảo format chuẩn
            reply_text = data.get("reply_text", "Em đã xử lý xong yêu cầu của cô!")
            status = data.get("status", "NORMAL")
            raw_tt = data.get("timetable")

            timetable_obj = None
            if status == "PENDING_CONFIRMATION" and raw_tt:
                year = raw_tt.get("metadata", {}).get("academicYear") or current_year
                sem = raw_tt.get("metadata", {}).get("semester") or current_semester
                teacher = raw_tt.get("metadata", {}).get("teacherName") or teacher_name

                # Lấy lưới rỗng và merge các tiết AI đã trích xuất vào
                base_tt = StorageService.create_empty_schedule(teacher_name=teacher, year=year, semester=sem)
                extracted_slots = raw_tt.get("schedule", [])

                slot_map = {}
                for slot in extracted_slots:
                    d = slot.get("dayOfWeek")
                    p = slot.get("period")
                    sess = slot.get("session", "morning")
                    # Chuẩn hoá nếu AI trả về tiết chiều là 1-5 thay vì 6-10
                    if sess == "afternoon" and p is not None and 1 <= int(p) <= 5:
                        p = int(p) + 5
                    if d and p:
                        slot_map[(int(d), int(p))] = slot

                for base_slot in base_tt.schedule:
                    key = (base_slot.day_of_week, base_slot.period)
                    if key in slot_map:
                        found = slot_map[key]
                        base_slot.class_name = found.get("className", "")
                        base_slot.subject = found.get("subject", subject)
                        base_slot.room = found.get("room", "")
                        base_slot.lesson_title = found.get("lessonTitle", "")
                        base_slot.notes = found.get("notes", "")

                base_tt.metadata.teacher_name = teacher
                base_tt.metadata.academic_year = year
                base_tt.metadata.semester = sem
                base_tt.metadata.total_periods = len(slot_map)
                timetable_obj = base_tt.model_dump(by_alias=True)

            return {
                "reply_text": reply_text,
                "status": status,
                "timetable": timetable_obj
            }

        except Exception as e:
            # Fallback nếu lỗi kết nối hoặc parse JSON
            err_msg = str(e)
            if "API_KEY_INVALID" in err_msg or "400" in err_msg:
                err_text = "⚠️ Gemini API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong mục ⚙️ Cài đặt."
            else:
                err_text = f"Em gặp lỗi khi xử lý: {err_msg}. Cô thử gửi lại nhé!"
            return {
                "reply_text": err_text,
                "status": "NORMAL",
                "timetable": None
            }

    @staticmethod
    def analyze_lesson_document(
        file_path: Optional[str] = None,
        file_name: str = "",
        text_override: Optional[str] = None,
        class_name: str = "",
        subject: str = "Ngữ văn",
        custom_api_key: Optional[str] = None
    ) -> Dict[str, str]:
        """
        AI đọc tài liệu giáo án/bài giảng (Word, PDF, PowerPoint, Excel, Text) 
        và tự động trích xuất Tên bài học và Mục tiêu bài học (chuẩn sư phạm).
        """
        img_obj, text_content = None, None
        if text_override:
            text_content = text_override
        elif file_path and os.path.exists(file_path):
            img_obj, text_content = GeminiService.extract_file_content(file_path)
        elif file_name:
            # Nếu chỉ có tên file (ví dụ file Google Drive chưa tải về được)
            text_content = f"Tài liệu bài giảng: {file_name}"

        if not img_obj and not text_content:
            return {"lesson_title": "", "lesson_objective": ""}

        settings = StorageService.get_settings()
        chosen_model = settings.get("gemini_model") or "gemini-3.1-flash-lite"
        candidate_models = GeminiService.get_candidate_models(chosen_model)

        prompt_intro = (
            f"Bạn là chuyên gia sư phạm THPT tại Việt Nam. "
            f"Hãy phân tích tài liệu/giáo án đính kèm sau đây của môn {subject} ({class_name or 'THPT'}):\n"
        )
        contents = []
        if img_obj:
            contents.append(img_obj)
            contents.append(prompt_intro + "Hãy đọc tài liệu trên và trích xuất thông tin bài học thành JSON chuẩn.")
        elif text_content:
            doc_sample = text_content[:15000]
            contents.append(
                f"{prompt_intro}```\n{doc_sample}\n```\n\n"
                f"YÊU CẦU ĐẦU RA BẮT BUỘC (DUY NHẤT 1 JSON OBJECT):\n"
                f"{{\n"
                f'  "lesson_title": "Tên bài học / Tiết dạy chuẩn SGK (Ví dụ: Bài 1: Truyện về các vị thần sáng tạo thế giới)",\n'
                f'  "lesson_objective": "Mục tiêu bài học (1-2 câu súc tích nêu rõ kiến thức trọng tâm, năng lực hoặc phẩm chất cần đạt)"\n'
                f"}}"
            )

        for model_candidate in candidate_models:
            try:
                model = GeminiService.get_client(custom_api_key=custom_api_key, model_name=model_candidate)
                if not model:
                    continue
                resp = model.generate_content(contents)
                raw_text = resp.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                elif raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

                try:
                    data = json.loads(raw_text)
                    if isinstance(data, list) and len(data) > 0:
                        data = data[0]
                    return {
                        "lesson_title": data.get("lesson_title", "").strip(),
                        "lesson_objective": data.get("lesson_objective", "").strip()
                    }
                except Exception:
                    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                    if match:
                        data = json.loads(match.group(0))
                        return {
                            "lesson_title": data.get("lesson_title", "").strip(),
                            "lesson_objective": data.get("lesson_objective", "").strip()
                        }
            except Exception as e:
                is_quota = GeminiService.is_quota_or_rate_limit(e)
                if is_quota or "404" in str(e).lower() or "503" in str(e).lower():
                    continue
                break

        return {"lesson_title": "", "lesson_objective": ""}

