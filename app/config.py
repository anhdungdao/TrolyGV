import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
TIMETABLES_DIR = DATA_DIR / "timetables"
SETTINGS_FILE = DATA_DIR / "settings.json"
UPLOAD_DIR = DATA_DIR / "temp_uploads"
STATIC_DIR = BASE_DIR / "static"

# Ensure essential directories exist
for directory in [DATA_DIR, TIMETABLES_DIR, UPLOAD_DIR, STATIC_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Default system settings
DEFAULT_SETTINGS = {
    "gemini_api_key": "",
    "gemini_model": "gemini-3.1-flash-lite",
    "teacher_name": "Giáo viên",
    "subject": "Toàn trường",
    "current_year": "2025-2026",
    "current_semester": "HK1",
    "google_drive_enabled": False,
    "google_drive_client_id": "",
    "google_drive_api_key": "",
    "google_drive_folder_id": ""
}
