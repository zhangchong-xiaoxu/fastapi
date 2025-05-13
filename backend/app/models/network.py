from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class Node(BaseModel):
    """网络节点数据模型"""
    id: str
    label: str
    group: int = 1
    properties: Dict[str, Any] = Field(default_factory=dict)


class Edge(BaseModel):
    """网络边数据模型"""
    source: str
    target: str
    weight: float = 1.0
    properties: Dict[str, Any] = Field(default_factory=dict)


class NetworkData(BaseModel):
    """网络数据结构"""
    nodes: List[Node]
    edges: List[Edge]


class NetworkMetrics(BaseModel):
    """网络度量指标"""
    node_count: int
    edge_count: int
    density: float
    average_degree: float
    clustering_coefficient: float
    diameter: Optional[float] = None
    average_path_length: Optional[float] = None
    connected_components: int
    is_connected: bool
    degree_distribution: Dict[int, int]


class Network(BaseModel):
    """网络数据库模型"""
    id: str
    name: str
    description: Optional[str] = None
    data: NetworkData
    metrics: NetworkMetrics
    created_at: datetime
    updated_at: datetime


class NetworkListItem(BaseModel):
    """网络列表项模型"""
    id: str
    name: str
    description: Optional[str] = None
    node_count: int
    edge_count: int
    created_at: datetime
    updated_at: datetime


class NetworkDetail(BaseModel):
    """网络详情模型"""
    id: str
    name: str
    description: Optional[str] = None
    data: NetworkData
    metrics: NetworkMetrics
    created_at: datetime
    updated_at: datetime


class NetworkCreate(BaseModel):
    """创建网络请求模型"""
    name: str
    description: Optional[str] = None
    data: NetworkData


class NetworkUpdate(BaseModel):
    """更新网络请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    data: Optional[NetworkData] = None


class NodeCSV(BaseModel):
    """节点CSV文件模型"""
    id: str
    label: Optional[str] = None
    group: Optional[int] = None
    

class EdgeCSV(BaseModel):
    """边CSV文件模型"""
    source: str
    target: str
    weight: Optional[float] = None


class RandomNetworkParams(BaseModel):
    """随机网络生成参数"""
    model: str = Field(..., description="Network model: erdos_renyi, barabasi_albert, watts_strogatz")
    n: int = Field(..., description="Number of nodes")
    m: Optional[int] = Field(None, description="Number of edges for Barabasi-Albert model")
    p: Optional[float] = Field(None, description="Probability for Erdos-Renyi model")
    k: Optional[int] = Field(None, description="Number of nearest neighbors for Watts-Strogatz model")
    beta: Optional[float] = Field(None, description="Rewiring probability for Watts-Strogatz model")


class CentralityScores(BaseModel):
    """中心性分数"""
    node_id: str
    score: float


class CentralityResult(BaseModel):
    """中心性计算结果"""
    centrality_type: str
    scores: List[CentralityScores]


class CommunityMember(BaseModel):
    """社区成员"""
    node_id: str
    community_id: int


class CommunityResult(BaseModel):
    """社区检测结果"""
    algorithm: str
    community_count: int
    communities: List[CommunityMember]
    modularity: Optional[float] = None


class NetworkDifference(BaseModel):
    """网络差异"""
    added_nodes: List[Node] = []
    removed_nodes: List[Node] = []
    added_edges: List[Edge] = []
    removed_edges: List[Edge] = []
    metrics_difference: Dict[str, float] = {}


class NetworkComparisonResult(BaseModel):
    """网络比较结果"""
    network1_id: str
    network2_id: str
    network1_name: str
    network2_name: str
    differences: NetworkDifference
    similarity_score: float


class NetworkSnapshot(BaseModel):
    """网络快照模型，用于比较和时间序列分析"""
    id: str
    name: str
    timestamp: str
    network_data: NetworkData
    metrics: Optional[NetworkMetrics] = None


class NetworkUploadResponse(BaseModel):
    """网络上传响应模型"""
    id: str
    name: str
    node_count: int
    edge_count: int 