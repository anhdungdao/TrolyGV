import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import STATIC_DIR
from app.routers import settings, chat, timetable, drive

app = FastAPI(
    title="Trợ Lý Giáo Viên AI - Quản Lý Thời Khoá Biểu & Giáo Án",
    description="Hệ thống trợ lý AI hỗ trợ quản lý thời khoá biểu, giáo án và tích hợp Google Drive",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(settings.router)
app.include_router(chat.router)
app.include_router(timetable.router)
app.include_router(drive.router)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
async def serve_index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    # Fallback search if current working directory shifted on Vercel
    alt_paths = [
        Path("static/index.html"),
        Path("/var/task/static/index.html"),
        Path(__file__).resolve().parent.parent / "static" / "index.html"
    ]
    for alt in alt_paths:
        if alt.exists():
            return FileResponse(str(alt))
    return {"message": "Hệ thống đang khởi động, vui lòng kiểm tra thư mục static"}
