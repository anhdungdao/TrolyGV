import os
from pathlib import Path
from fastapi import FastAPI, Request
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

# Vercel Serverless Path Normalizer Middleware
@app.middleware("http")
async def normalize_vercel_path_middleware(request: Request, call_next):
    raw_path = request.scope.get("path", "")
    if raw_path in ("/api/index.py", "/api/index.py/", "/api/index", "/api"):
        matched = request.headers.get("x-matched-path") or request.headers.get("x-invoke-path")
        if matched and matched not in ("/api/index.py", "/api/index"):
            request.scope["path"] = matched
    return await call_next(request)

# Include Routers with /api prefix (cho client gọi /api/chat/send, /api/settings...)
app.include_router(settings.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(timetable.router, prefix="/api")
app.include_router(drive.router, prefix="/api")

# Include Routers WITHOUT /api prefix (cho trường hợp Vercel Serverless strip /api)
app.include_router(settings.router, prefix="")
app.include_router(chat.router, prefix="")
app.include_router(timetable.router, prefix="")
app.include_router(drive.router, prefix="")

# Mount static files (Hỗ trợ cả /static, /css và /js để Local hiển thị đẹp 100% không bị 404)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/css", StaticFiles(directory=str(STATIC_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(STATIC_DIR / "js")), name="js")

@app.get("/")
async def serve_index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    # Fallback search if current working directory shifted on Vercel
    alt_paths = [
        Path("static/index.html"),
        Path("public/index.html"),
        Path("/var/task/static/index.html"),
        Path("/var/task/public/index.html"),
        Path(__file__).resolve().parent.parent / "static" / "index.html",
        Path(__file__).resolve().parent.parent / "public" / "index.html"
    ]
    for alt in alt_paths:
        if alt.exists():
            return FileResponse(str(alt))
    return {"message": "Hệ thống đang khởi động, vui lòng kiểm tra thư mục static"}
