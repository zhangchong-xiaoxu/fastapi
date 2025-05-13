from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from datetime import datetime

from app.routes import network_routes, user_routes, analysis_routes, file_routes
from app.dependencies import get_settings
from app.config import Settings
from app.logger import get_logger, setup_logging

logger = get_logger()

def create_app() -> FastAPI:
    app = FastAPI(
        title="Social Network Analysis API",
        description="提供社交网络数据分析与可视化的后端API服务",
        version="0.1.0"
    )
    
    settings = get_settings()
    
    # 配置CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 在生产环境中应限制为特定域名
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 添加路由
    app.include_router(network_routes.router)
    app.include_router(user_routes.router)
    app.include_router(analysis_routes.router)
    app.include_router(file_routes.router)
    
    # 设置静态文件目录
    # 创建data目录路由以访问数据文件
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    if os.path.exists(data_dir):
        app.mount("/data", StaticFiles(directory=data_dir), name="data")
        logger.info(f"已挂载数据目录: {data_dir}")
    else:
        logger.warning(f"数据目录不存在: {data_dir}")
    
    @app.get("/health")
    async def health_check():
        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "version": app.version
        }
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = datetime.now()
        response = await call_next(request)
        process_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.2f}ms")
        return response
    
    return app

app = create_app()

def start():
    import uvicorn
    setup_logging()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    start() 