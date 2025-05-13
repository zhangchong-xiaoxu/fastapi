from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional, List, Dict, Any
import os
import json
import shutil
from datetime import datetime
from pathlib import Path

from app.services import network_service
from app.models import FileUploadResponse
from app.dependencies import get_current_user, get_settings
from app.config import Settings
from app.logger import get_logger

router = APIRouter(prefix="/files", tags=["files"])
logger = get_logger()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    settings: Settings = Depends(get_settings)
):
    """
    上传文件到系统
    """
    # 检查文件类型
    file_extension = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = ['.csv', '.json', '.graphml', '.xml']
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件类型。允许的文件类型: {', '.join(allowed_extensions)}"
        )
    
    # 创建唯一文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    
    # 确保上传目录存在
    upload_dir = os.path.join(settings.data_dir, "input")
    os.makedirs(upload_dir, exist_ok=True)
    
    # 保存文件
    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    logger.info(f"文件已上传: {file_path}")
    
    # 创建元数据
    metadata = {
        "original_filename": file.filename,
        "stored_filename": safe_filename,
        "upload_date": datetime.now().isoformat(),
        "name": name,
        "description": description,
        "file_type": file_extension[1:],  # 去掉前导点
        "size_bytes": os.path.getsize(file_path)
    }
    
    # 保存元数据
    metadata_file = os.path.join(upload_dir, f"{os.path.splitext(safe_filename)[0]}_meta.json")
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    return FileUploadResponse(
        success=True,
        message="文件上传成功",
        filename=safe_filename,
        original_filename=file.filename,
        file_path=file_path
    )

@router.get("/input/{file_path:path}")
async def get_input_file(
    file_path: str,
    settings: Settings = Depends(get_settings)
):
    """
    获取上传目录中的文件
    """
    full_path = os.path.join(settings.data_dir, "input", file_path)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="文件未找到")
    
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=400, detail="请求的路径不是文件")
    
    return FileResponse(full_path)

@router.get("/list")
async def list_files(
    settings: Settings = Depends(get_settings)
):
    """
    列出上传目录中的所有文件
    """
    upload_dir = os.path.join(settings.data_dir, "input")
    if not os.path.exists(upload_dir):
        return {"files": []}
    
    files = []
    for filename in os.listdir(upload_dir):
        if os.path.isfile(os.path.join(upload_dir, filename)) and not filename.endswith('_meta.json'):
            # 尝试查找对应的元数据文件
            metadata_file = os.path.join(upload_dir, f"{os.path.splitext(filename)[0]}_meta.json")
            metadata = {}
            if os.path.exists(metadata_file):
                try:
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                except Exception as e:
                    logger.error(f"读取元数据文件出错: {metadata_file}, 错误: {e}")
            
            files.append({
                "filename": filename,
                "path": f"/input/{filename}",
                "size": os.path.getsize(os.path.join(upload_dir, filename)),
                "metadata": metadata
            })
    
    return {"files": files}

@router.delete("/{filename}")
async def delete_file(
    filename: str,
    settings: Settings = Depends(get_settings)
):
    """
    删除上传的文件
    """
    file_path = os.path.join(settings.data_dir, "input", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件未找到")
    
    try:
        os.remove(file_path)
        
        # 删除元数据文件（如果存在）
        metadata_file = os.path.join(settings.data_dir, "input", f"{os.path.splitext(filename)[0]}_meta.json")
        if os.path.exists(metadata_file):
            os.remove(metadata_file)
        
        return {"success": True, "message": "文件删除成功"}
    except Exception as e:
        logger.error(f"删除文件失败: {file_path}, 错误: {e}")
        raise HTTPException(status_code=500, detail=f"删除文件失败: {str(e)}") 