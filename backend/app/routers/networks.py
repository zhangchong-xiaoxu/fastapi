from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
import uuid
import os
import json
import networkx as nx
import pandas as pd
from ..models import NetworkModel, NetworkListItem, NodeModel, EdgeModel
from ..utils.auth import get_current_user
from ..services.network_service import calculate_basic_metrics

router = APIRouter(
    prefix="/networks",
    tags=["networks"],
)

# 模拟数据存储
NETWORKS = {}

@router.get("/", response_model=List[NetworkListItem])
async def get_networks():
    """获取所有网络列表"""
    return [
        NetworkListItem(
            id=net_id,
            name=network.name,
            nodeCount=len(network.nodes),
            edgeCount=len(network.edges)
        )
        for net_id, network in NETWORKS.items()
    ]

@router.get("/{network_id}", response_model=NetworkModel)
async def get_network(network_id: str):
    """获取特定网络详情"""
    if network_id not in NETWORKS:
        raise HTTPException(status_code=404, detail="Network not found")
    return NETWORKS[network_id]

@router.post("/", response_model=NetworkModel)
async def create_network(network: NetworkModel):
    """创建新网络"""
    if not network.id:
        network.id = str(uuid.uuid4())
    
    # 计算基本指标
    G = nx.Graph()
    for node in network.nodes:
        G.add_node(node.id, name=node.name, group=node.group)
    
    for edge in network.edges:
        G.add_edge(edge.source, edge.target, weight=edge.weight)
    
    network.metrics = calculate_basic_metrics(G)
    NETWORKS[network.id] = network
    return network

@router.put("/{network_id}", response_model=NetworkModel)
async def update_network(network_id: str, network: NetworkModel):
    """更新网络"""
    if network_id not in NETWORKS:
        raise HTTPException(status_code=404, detail="Network not found")
    
    network.id = network_id
    NETWORKS[network_id] = network
    return network

@router.delete("/{network_id}")
async def delete_network(network_id: str):
    """删除网络"""
    if network_id not in NETWORKS:
        raise HTTPException(status_code=404, detail="Network not found")
    
    del NETWORKS[network_id]
    return {"message": "Network deleted successfully"}

@router.post("/upload/json")
async def upload_json_network(
    file: UploadFile = File(...),
    name: str = Form(...),
):
    """上传JSON格式的网络数据"""
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    content = await file.read()
    data = json.loads(content)
    
    # 验证数据格式
    if "nodes" not in data or "links" not in data:
        raise HTTPException(status_code=400, detail="Invalid network format. Must contain 'nodes' and 'links'")
    
    # 创建网络模型
    network_id = str(uuid.uuid4())
    nodes = [NodeModel(id=str(node.get("id")), name=node.get("name"), group=node.get("group"))
             for node in data["nodes"]]
    
    edges = [EdgeModel(source=str(link.get("source")), target=str(link.get("target")), 
                      weight=link.get("value", 1.0))
             for link in data["links"]]
    
    network = NetworkModel(id=network_id, name=name, nodes=nodes, edges=edges)
    
    # 计算基本指标
    G = nx.Graph()
    for node in network.nodes:
        G.add_node(node.id, name=node.name, group=node.group)
    
    for edge in network.edges:
        G.add_edge(edge.source, edge.target, weight=edge.weight)
    
    network.metrics = calculate_basic_metrics(G)
    NETWORKS[network_id] = network
    
    return network

@router.post("/upload/csv")
async def upload_csv_network(
    nodes_file: UploadFile = File(...),
    edges_file: UploadFile = File(...),
    name: str = Form(...)
):
    """上传CSV格式的网络数据（节点和边两个文件）"""
    if not nodes_file.filename.endswith('.csv') or not edges_file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Both files must be CSV format")
    
    # 读取节点CSV
    nodes_content = await nodes_file.read()
    nodes_df = pd.read_csv(pd.io.common.BytesIO(nodes_content))
    
    # 读取边CSV
    edges_content = await edges_file.read()
    edges_df = pd.read_csv(pd.io.common.BytesIO(edges_content))
    
    # 验证必要的列
    if 'id' not in nodes_df.columns:
        raise HTTPException(status_code=400, detail="Nodes CSV must contain 'id' column")
    
    if 'source' not in edges_df.columns or 'target' not in edges_df.columns:
        raise HTTPException(status_code=400, detail="Edges CSV must contain 'source' and 'target' columns")
    
    # 创建网络模型
    network_id = str(uuid.uuid4())
    
    nodes = []
    for _, row in nodes_df.iterrows():
        node = {"id": str(row['id'])}
        if 'name' in row:
            node["name"] = row['name']
        if 'group' in row:
            node["group"] = row['group']
        nodes.append(NodeModel(**node))
    
    edges = []
    for _, row in edges_df.iterrows():
        edge = {"source": str(row['source']), "target": str(row['target'])}
        if 'weight' in row:
            edge["weight"] = row['weight']
        edges.append(EdgeModel(**edge))
    
    network = NetworkModel(id=network_id, name=name, nodes=nodes, edges=edges)
    
    # 计算基本指标
    G = nx.Graph()
    for node in network.nodes:
        G.add_node(node.id, name=node.name, group=node.group)
    
    for edge in network.edges:
        G.add_edge(edge.source, edge.target, weight=edge.weight)
    
    network.metrics = calculate_basic_metrics(G)
    NETWORKS[network_id] = network
    
    return network

@router.post("/generate/random")
async def generate_random_network(
    name: str,
    nodes: int,
    edge_probability: float = 0.1
):
    """生成随机网络"""
    if nodes <= 0:
        raise HTTPException(status_code=400, detail="Number of nodes must be positive")
    
    if edge_probability <= 0 or edge_probability > 1:
        raise HTTPException(status_code=400, detail="Edge probability must be between 0 and 1")
    
    # 使用Erdos-Renyi随机图模型
    G = nx.erdos_renyi_graph(nodes, edge_probability)
    
    # 添加权重和分组
    for u, v in G.edges():
        G[u][v]['weight'] = round(0.1 + 0.9 * nx.random.random.random(), 2)
    
    # 创建网络模型
    network_id = str(uuid.uuid4())
    
    node_models = [
        NodeModel(
            id=str(n),
            name=f"Node {n}",
            group=n % 5  # 简单分组
        )
        for n in G.nodes()
    ]
    
    edge_models = [
        EdgeModel(
            source=str(u),
            target=str(v),
            weight=G[u][v].get('weight', 1.0)
        )
        for u, v in G.edges()
    ]
    
    network = NetworkModel(
        id=network_id,
        name=name,
        nodes=node_models,
        edges=edge_models
    )
    
    network.metrics = calculate_basic_metrics(G)
    NETWORKS[network_id] = network
    
    return network 