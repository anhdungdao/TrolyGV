import sys
import os

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn

if __name__ == "__main__":
    print(">> Đang khởi động Trợ Lý Giáo Viên AI - Thời khoá biểu & Giáo án...")
    print(">> Truy cập cục bộ tại: http://localhost:8000")
    print(">> Truy cập nội bộ mạng LAN: http://0.0.0.0:8000")
    print(">> API Documentation (Swagger): http://localhost:8000/docs")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
