"""
Activities API for the Social Network Analysis System.
Provides endpoints for tracking and retrieving user activities.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import List
import random
import uuid

router = APIRouter()

# Sample activities based on the uploaded sample files
SAMPLE_ACTIVITIES = [
    {
        "id": str(uuid.uuid4()),
        "type": "upload",
        "description": "上传了基础社交网络数据 (sample-network.csv)",
        "date": (datetime.now() - timedelta(hours=2)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "type": "upload",
        "description": "上传了社区结构网络数据 (community-network.csv)",
        "date": (datetime.now() - timedelta(hours=1)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "type": "upload",
        "description": "上传了大型网络数据集 (large-sample-network.csv)",
        "date": (datetime.now() - timedelta(minutes=30)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "type": "analysis",
        "description": "使用Louvain算法对社区网络进行社区检测",
        "date": (datetime.now() - timedelta(minutes=25)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "type": "analysis",
        "description": "计算大型网络数据集的中心性指标",
        "date": (datetime.now() - timedelta(minutes=20)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "type": "export",
        "description": "将社区检测结果导出为JSON格式",
        "date": (datetime.now() - timedelta(minutes=15)).isoformat()
    }
]

@router.get("/", response_model=List[dict])
async def get_recent_activities():
    """
    Retrieve a list of recent activities.
    
    Returns:
        List[dict]: A list of recent activities with type, description, and timestamp.
    """
    # In a real application, these would be retrieved from a database
    return SAMPLE_ACTIVITIES 