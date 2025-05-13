from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# 网络模型
class NodeModel(BaseModel):
    id: str
    name: Optional[str] = None
    group: Optional[int] = None
    
class EdgeModel(BaseModel):
    source: str
    target: str
    weight: Optional[float] = 1.0

class NetworkModel(BaseModel):
    id: str
    name: str
    nodes: List[NodeModel]
    edges: List[EdgeModel]
    metrics: Optional[Dict[str, Any]] = None

class NetworkListItem(BaseModel):
    id: str
    name: str
    nodeCount: int
    edgeCount: int

# 用户模型
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    
class UserCreate(UserBase):
    password: str
    
class UserInDB(UserBase):
    id: str
    hashed_password: str
    disabled: Optional[bool] = False
    
class User(UserBase):
    id: str
    disabled: Optional[bool] = False

# 分析结果模型
class CentralityResult(BaseModel):
    algorithm: str
    results: Dict[str, float]
    
class CommunityResult(BaseModel):
    algorithm: str
    communities: Dict[str, int]
    modularity: Optional[float] = None

class LinkPredictionResult(BaseModel):
    source: str
    target: str
    probability: float

# 认证模型
class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenData(BaseModel):
    username: Optional[str] = None

# 文件上传模型
class FileUploadResponse(BaseModel):
    success: bool
    message: str
    filename: str
    original_filename: str
    file_path: str 