from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Form, Depends
from typing import List, Dict, Any, Optional
import json
import pandas as pd
from io import StringIO

from app.models.network import (
    NetworkData, NetworkMetrics, Node, Edge, 
    CentralityResult, CommunityResult, 
    NetworkComparisonResult, RandomNetworkParams,
    NetworkSnapshot
)
from app.services.network_service import (
    calculate_basic_metrics, calculate_centrality,
    detect_communities, compare_networks,
    generate_random_network, network_data_to_networkx
)

router = APIRouter()


@router.post("/analyze", response_model=NetworkMetrics)
async def analyze_network(network_data: NetworkData):
    """分析网络并返回基本指标"""
    try:
        G = network_data_to_networkx(network_data)
        metrics = calculate_basic_metrics(G)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"网络分析失败: {str(e)}")


@router.post("/centrality", response_model=Dict[str, CentralityResult])
async def compute_centrality(network_data: NetworkData):
    """计算网络的中心性指标"""
    try:
        G = network_data_to_networkx(network_data)
        centrality_results = calculate_centrality(G)
        return centrality_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"中心性计算失败: {str(e)}")


@router.post("/community", response_model=Dict[str, CommunityResult])
async def detect_network_communities(network_data: NetworkData):
    """检测网络中的社区结构"""
    try:
        G = network_data_to_networkx(network_data)
        community_results = detect_communities(G)
        return community_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"社区检测失败: {str(e)}")


@router.post("/compare", response_model=NetworkComparisonResult)
async def compare_two_networks(
    network1: NetworkData = Body(..., embed=True),
    network2: NetworkData = Body(..., embed=True)
):
    """比较两个网络并返回差异"""
    try:
        result = compare_networks(network1, network2)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"网络比较失败: {str(e)}")


@router.post("/random", response_model=NetworkData)
async def create_random_network(params: RandomNetworkParams):
    """根据指定参数生成随机网络"""
    try:
        random_network = generate_random_network(params)
        return random_network
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"随机网络生成失败: {str(e)}")


@router.post("/upload/csv", response_model=NetworkData)
async def upload_csv_network(
    nodes_file: UploadFile = File(...),
    edges_file: UploadFile = File(...),
    node_id_col: str = Form(...),
    node_label_col: Optional[str] = Form(None),
    node_group_col: Optional[str] = Form(None),
    edge_source_col: str = Form(...),
    edge_target_col: str = Form(...),
    edge_weight_col: Optional[str] = Form(None)
):
    """从CSV文件上传网络数据"""
    try:
        # 读取节点文件
        nodes_content = await nodes_file.read()
        nodes_df = pd.read_csv(StringIO(nodes_content.decode('utf-8')))
        
        # 读取边文件
        edges_content = await edges_file.read()
        edges_df = pd.read_csv(StringIO(edges_content.decode('utf-8')))
        
        # 创建节点列表
        nodes = []
        for _, row in nodes_df.iterrows():
            node_id = row[node_id_col]
            
            # 处理可选列
            node_label = str(row[node_label_col]) if node_label_col and node_label_col in row else str(node_id)
            node_group = int(row[node_group_col]) if node_group_col and node_group_col in row else 1
            
            # 收集额外属性
            properties = {}
            for col in nodes_df.columns:
                if col not in [node_id_col, node_label_col, node_group_col]:
                    properties[col] = row[col]
            
            nodes.append(Node(
                id=node_id,
                label=node_label,
                group=node_group,
                properties=properties
            ))
        
        # 创建边列表
        edges = []
        for _, row in edges_df.iterrows():
            source = row[edge_source_col]
            target = row[edge_target_col]
            
            # 处理可选的权重列
            weight = float(row[edge_weight_col]) if edge_weight_col and edge_weight_col in row else 1.0
            
            # 收集额外属性
            properties = {}
            for col in edges_df.columns:
                if col not in [edge_source_col, edge_target_col, edge_weight_col]:
                    properties[col] = row[col]
            
            edges.append(Edge(
                source=source,
                target=target,
                weight=weight,
                properties=properties
            ))
        
        return NetworkData(nodes=nodes, edges=edges)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV文件处理失败: {str(e)}")


@router.post("/upload/json", response_model=NetworkData)
async def upload_json_network(file: UploadFile = File(...)):
    """从JSON文件上传网络数据"""
    try:
        content = await file.read()
        data = json.loads(content)
        
        # 验证JSON结构
        if not isinstance(data, dict) or 'nodes' not in data or 'edges' not in data:
            raise ValueError("JSON格式无效，必须包含'nodes'和'edges'字段")
            
        return NetworkData(**data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JSON文件处理失败: {str(e)}") 