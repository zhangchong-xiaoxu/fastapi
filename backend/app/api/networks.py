from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import pandas as pd
import networkx as nx
import io
import csv
import json

from ..models.network import (
    Network,
    NetworkListItem,
    NetworkDetail,
    NetworkData,
    NetworkCreate,
    NetworkUpdate,
    NetworkMetrics,
    NetworkComparisonResult,
    Node,
    Edge,
    CentralityResult,
    CommunityResult,
    RandomNetworkParams
)
from ..services.network_service import (
    calculate_network_metrics,
    calculate_centrality,
    detect_communities,
    compare_networks,
    generate_random_network
)

router = APIRouter(prefix="/networks", tags=["networks"])

# In-memory storage for demo purposes
# In a real application, this would use a database
networks_db = {}


@router.get("/", response_model=List[NetworkListItem])
async def get_networks():
    """获取所有网络列表"""
    result = []
    for network_id, network in networks_db.items():
        result.append(NetworkListItem(
            id=network.id,
            name=network.name,
            description=network.description,
            node_count=len(network.data.nodes),
            edge_count=len(network.data.edges),
            created_at=network.created_at,
            updated_at=network.updated_at
        ))
    return result


@router.post("/", response_model=NetworkDetail)
async def create_network(network: NetworkCreate):
    """创建新网络"""
    network_id = str(uuid.uuid4())
    now = datetime.now()
    
    # Calculate metrics
    metrics = calculate_network_metrics(network.data)
    
    new_network = Network(
        id=network_id,
        name=network.name,
        description=network.description,
        data=network.data,
        metrics=metrics,
        created_at=now,
        updated_at=now
    )
    
    networks_db[network_id] = new_network
    
    return NetworkDetail(
        id=new_network.id,
        name=new_network.name,
        description=new_network.description,
        data=new_network.data,
        metrics=metrics,
        created_at=new_network.created_at,
        updated_at=new_network.updated_at
    )


@router.get("/{network_id}", response_model=NetworkDetail)
async def get_network(network_id: str):
    """获取特定网络详情"""
    if network_id not in networks_db:
        raise HTTPException(status_code=404, detail="Network not found")
    
    network = networks_db[network_id]
    
    return NetworkDetail(
        id=network.id,
        name=network.name,
        description=network.description,
        data=network.data,
        metrics=network.metrics,
        created_at=network.created_at,
        updated_at=network.updated_at
    )


@router.put("/{network_id}", response_model=NetworkDetail)
async def update_network(network_id: str, network_update: NetworkUpdate):
    """更新网络信息"""
    if network_id not in networks_db:
        raise HTTPException(status_code=404, detail="Network not found")
    
    network = networks_db[network_id]
    
    if network_update.name is not None:
        network.name = network_update.name
    
    if network_update.description is not None:
        network.description = network_update.description
    
    if network_update.data is not None:
        network.data = network_update.data
        # Recalculate metrics if data changes
        network.metrics = calculate_network_metrics(network.data)
    
    network.updated_at = datetime.now()
    networks_db[network_id] = network
    
    return NetworkDetail(
        id=network.id,
        name=network.name,
        description=network.description,
        data=network.data,
        metrics=network.metrics,
        created_at=network.created_at,
        updated_at=network.updated_at
    )


@router.delete("/{network_id}")
async def delete_network(network_id: str):
    """删除网络"""
    if network_id not in networks_db:
        raise HTTPException(status_code=404, detail="Network not found")
    
    del networks_db[network_id]
    return {"message": "Network deleted successfully"}


@router.post("/upload", response_model=NetworkDetail)
async def upload_network_files(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    nodes_file: UploadFile = File(...),
    edges_file: UploadFile = File(...)
):
    """从CSV文件上传网络数据"""
    try:
        # Read nodes CSV
        nodes_content = await nodes_file.read()
        nodes_df = pd.read_csv(io.StringIO(nodes_content.decode('utf-8')))
        
        # Read edges CSV
        edges_content = await edges_file.read()
        edges_df = pd.read_csv(io.StringIO(edges_content.decode('utf-8')))
        
        # Convert to NetworkData format
        nodes = []
        for _, row in nodes_df.iterrows():
            node_data = {
                "id": str(row["id"]),
                "label": row.get("label", str(row["id"])),
                "group": int(row.get("group", 1)),
                "properties": {}
            }
            
            # Add any additional columns as properties
            for col in nodes_df.columns:
                if col not in ["id", "label", "group"]:
                    node_data["properties"][col] = row[col]
            
            nodes.append(Node(**node_data))
        
        edges = []
        for _, row in edges_df.iterrows():
            edge_data = {
                "source": str(row["source"]),
                "target": str(row["target"]),
                "weight": float(row.get("weight", 1.0)),
                "properties": {}
            }
            
            # Add any additional columns as properties
            for col in edges_df.columns:
                if col not in ["source", "target", "weight"]:
                    edge_data["properties"][col] = row[col]
            
            edges.append(Edge(**edge_data))
        
        network_data = NetworkData(nodes=nodes, edges=edges)
        
        # Create network
        network_create = NetworkCreate(
            name=name,
            description=description,
            data=network_data
        )
        
        return await create_network(network_create)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing files: {str(e)}")


@router.post("/generate", response_model=NetworkDetail)
async def generate_network(params: RandomNetworkParams):
    """生成随机网络"""
    try:
        network_data = generate_random_network(params)
        
        network_create = NetworkCreate(
            name=f"Random {params.model.title()} Network ({params.n} nodes)",
            description=f"Random network generated using {params.model} model with {params.n} nodes",
            data=network_data
        )
        
        return await create_network(network_create)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating network: {str(e)}")


@router.get("/{network_id}/centrality/{centrality_type}", response_model=CentralityResult)
async def get_centrality(
    network_id: str,
    centrality_type: str = Query(..., description="Type of centrality: degree, betweenness, closeness, eigenvector")
):
    """计算网络中心性"""
    if network_id not in networks_db:
        raise HTTPException(status_code=404, detail="Network not found")
    
    network = networks_db[network_id]
    
    allowed_types = ["degree", "betweenness", "closeness", "eigenvector"]
    if centrality_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid centrality type. Must be one of: {', '.join(allowed_types)}")
    
    return calculate_centrality(network.data, centrality_type)


@router.get("/{network_id}/communities/{algorithm}", response_model=CommunityResult)
async def get_communities(
    network_id: str,
    algorithm: str = Query(..., description="Community detection algorithm: louvain, label_propagation, girvan_newman")
):
    """检测网络社区"""
    if network_id not in networks_db:
        raise HTTPException(status_code=404, detail="Network not found")
    
    network = networks_db[network_id]
    
    allowed_algorithms = ["louvain", "label_propagation", "girvan_newman"]
    if algorithm not in allowed_algorithms:
        raise HTTPException(status_code=400, detail=f"Invalid algorithm. Must be one of: {', '.join(allowed_algorithms)}")
    
    return detect_communities(network.data, algorithm)


@router.post("/compare", response_model=NetworkComparisonResult)
async def compare_two_networks(
    network_id1: str = Query(..., description="ID of first network"),
    network_id2: str = Query(..., description="ID of second network")
):
    """比较两个网络的差异"""
    if network_id1 not in networks_db:
        raise HTTPException(status_code=404, detail=f"Network {network_id1} not found")
    
    if network_id2 not in networks_db:
        raise HTTPException(status_code=404, detail=f"Network {network_id2} not found")
    
    network1 = networks_db[network_id1]
    network2 = networks_db[network_id2]
    
    return compare_networks(network1.data, network2.data) 