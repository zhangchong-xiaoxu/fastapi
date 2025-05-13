from fastapi import FastAPI, Query, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import random
import logging
import datetime

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = FastAPI()

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有源，在生产环境中应该更严格
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "message": "API is running"}

@app.get("/api/network/communities")
async def get_communities():
    """获取社区数据的模拟端点"""
    return {
        "communities": [
            {"id": 1, "size": 15, "nodes": ["user1", "user2", "user3"]},
            {"id": 2, "size": 10, "nodes": ["user4", "user5", "user6"]},
            {"id": 3, "size": 8, "nodes": ["user7", "user8", "user9"]}
        ]
    }

@app.get("/api/network/metrics")
async def get_metrics():
    """获取网络指标的模拟端点"""
    return {
        "node_count": 100,
        "edge_count": 450,
        "density": 0.091,
        "average_degree": 9.0,
        "diameter": 6,
        "average_shortest_path_length": 2.5
    }

@app.post("/api/analysis/predict-user-activity/debug")
async def debug_predict_user_activity(request: Request, top_k: Optional[int] = Query(None), body: Dict = Body(...)):
    """调试用户活动预测请求"""
    # 记录请求信息
    logger.info(f"Request URL: {request.url}")
    logger.info(f"Query params: {dict(request.query_params)}")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Body content: {body}")
    
    # 返回收到的请求信息
    return {
        "status": "debug_info",
        "request_info": {
            "url": str(request.url),
            "method": request.method,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "body": body
        }
    }

@app.post("/api/analysis/predict-user-activity")
async def predict_user_activity(top_k: int = Query(10), body: Optional[Dict] = Body(None)):
    """预测用户活动的模拟端点"""
    # 记录请求
    if body:
        logger.info(f"Received predict-user-activity request with body: {body}")
    logger.info(f"Using top_k value: {top_k}")
    
    # 生成一些模拟数据
    predictions = []
    for i in range(1, top_k + 1):
        predictions.append({
            "userId": f"user{i}",
            "score": round(random.random() * 100, 2),
            "currentActivity": round(random.random() * 5, 2),
            "predictedActivity": round(random.random() * 8, 2),
            "change": round(random.random() * 100 - 50, 2)
        })
    
    return {
        "status": "success",
        "data": {
            "predictions": predictions,
            "modelInfo": {
                "accuracy": 0.85,
                "trainDate": "2023-10-01"
            }
        }
    }

@app.get("/api/network")
async def get_network_data():
    """获取网络数据的模拟端点"""
    return {
        "nodes": [
            {"id": "user1", "name": "用户1", "group": 1},
            {"id": "user2", "name": "用户2", "group": 1},
            {"id": "user3", "name": "用户3", "group": 2},
            {"id": "user4", "name": "用户4", "group": 3},
            {"id": "user5", "name": "用户5", "group": 2}
        ],
        "edges": [
            {"source": "user1", "target": "user2", "weight": 5},
            {"source": "user1", "target": "user3", "weight": 3},
            {"source": "user2", "target": "user3", "weight": 2},
            {"source": "user3", "target": "user4", "weight": 4},
            {"source": "user4", "target": "user5", "weight": 1},
            {"source": "user5", "target": "user1", "weight": 2}
        ]
    }

@app.get("/api/analysis/centrality")
async def get_centrality(algorithm: str = Query("degree")):
    """获取中心性分析的模拟端点"""
    centrality_data = {}
    for i in range(1, 11):
        centrality_data[f"user{i}"] = round(random.random(), 4)
    
    return {
        "algorithm": algorithm,
        "centrality": centrality_data
    }

@app.get("/api/analysis/community-detection")
async def get_community_detection(algorithm: str = Query("louvain")):
    """获取社区检测的模拟端点"""
    community_data = {}
    for i in range(1, 20):
        community_data[f"user{i}"] = random.randint(0, 3)
    
    return {
        "algorithm": algorithm,
        "communities": community_data,
        "community_count": 4
    }

@app.get("/api/network/advanced-metrics")
async def get_advanced_metrics():
    """获取高级网络指标的模拟端点"""
    return {
        "density": 0.091,
        "average_degree": 9.0,
        "diameter": 6,
        "average_shortest_path_length": 2.5,
        "clustering_coefficient": 0.32,
        "assortativity": -0.12,
        "reciprocity": 0.45,
        "transitivity": 0.28,
        "connected_components": 1,
        "largest_component_size": 100,
        "largest_component_percentage": 100.0
    }

# 网络快照和比较相关端点
@app.get("/api/network/snapshots")
async def get_network_snapshots():
    """获取可用的网络快照列表"""
    snapshots = []
    for i in range(1, 4):
        base_nodes = 50 + i * 10
        base_edges = base_nodes * 3
        
        snapshots.append({
            "id": str(i),
            "name": f"2023年{8+i}月网络",
            "date": f"2023-{8+i}-15",
            "node_count": base_nodes,
            "edge_count": base_edges,
            "created_at": f"2023-{8+i}-15T12:00:00Z",
            "density": round(random.uniform(0.01, 0.2), 3),
            "average_degree": round(2 * base_edges / base_nodes, 2),
            "community_count": random.randint(3, 8)
        })
    
    return snapshots

@app.get("/api/network/snapshot/{snapshot_id}")
async def get_network_snapshot(snapshot_id: str):
    """获取特定快照的网络数据"""
    # 生成不同的示例网络，基于快照ID
    nodes = []
    edges = []
    
    # 基础节点数量根据快照ID变化
    base_nodes = 50 + int(snapshot_id) * 10
    
    # 生成节点
    for i in range(1, base_nodes + 1):
        group = (i % 5) + 1
        nodes.append({
            "id": f"user{i}",
            "name": f"用户{i}",
            "group": group
        })
    
    # 生成边
    edge_count = base_nodes * 3
    for i in range(1, edge_count + 1):
        source_id = f"user{random.randint(1, base_nodes)}"
        target_id = f"user{random.randint(1, base_nodes)}"
        if source_id != target_id:  # 避免自环
            edges.append({
                "source": source_id,
                "target": target_id,
                "weight": random.randint(1, 10)
            })
    
    return {
        "id": snapshot_id,
        "name": f"快照 {snapshot_id}",
        "date": f"2023-{9 + int(snapshot_id)}-15",
        "nodes": nodes,
        "edges": edges
    }

@app.post("/api/network/compare")
async def compare_networks(request: Request, body: Dict = Body(...)):
    """比较两个网络快照"""
    # 日志记录请求内容
    logger.info(f"收到网络比较请求: {body}")
    
    # 从请求体获取要比较的快照ID
    snapshot_ids = body.get("snapshotIds", [])
    if len(snapshot_ids) < 2:
        return {"error": "需要至少两个快照ID进行比较"}
    
    # 获取第一个和第二个快照ID
    snapshot1_id = snapshot_ids[0]
    snapshot2_id = snapshot_ids[1]
    
    # 确保所有ID都是字符串
    snapshot1_id = str(snapshot1_id)
    snapshot2_id = str(snapshot2_id)
    
    # 生成比较结果
    comparison = {
        "id": f"comp_{snapshot1_id}_{snapshot2_id}",
        "created_at": "2023-11-20T12:00:00Z",
        "snapshot1": {
            "id": snapshot1_id,
            "name": f"快照 {snapshot1_id}",
            "node_count": 50 + int(snapshot1_id) * 10,
            "edge_count": (50 + int(snapshot1_id) * 10) * 3,
            "nodes": [f"user{i}" for i in range(1, 50 + int(snapshot1_id) * 10 + 1)],
            "edges": []
        },
        "snapshot2": {
            "id": snapshot2_id,
            "name": f"快照 {snapshot2_id}",
            "node_count": 50 + int(snapshot2_id) * 10,
            "edge_count": (50 + int(snapshot2_id) * 10) * 3,
            "nodes": [f"user{i}" for i in range(1, 50 + int(snapshot2_id) * 10 + 1)],
            "edges": []
        },
        "changes": {
            "added_nodes": int(snapshot2_id) * 5,
            "removed_nodes": int(snapshot1_id) * 2,
            "added_edges": int(snapshot2_id) * 15,
            "removed_edges": int(snapshot1_id) * 5,
            "common_nodes": 50 + int(snapshot1_id) * 8,
            "common_edges": (50 + int(snapshot1_id) * 10) * 2,
            "node_growth_percentage": float(int(snapshot2_id) * 5) / (50 + int(snapshot1_id) * 10) * 100,
            "edge_growth_percentage": float(int(snapshot2_id) * 15) / ((50 + int(snapshot1_id) * 10) * 3) * 100,
            "added_node_list": [f"user{i}" for i in range(1, int(snapshot2_id) * 5 + 1)],
            "removed_node_list": [f"user{i}" for i in range(1, int(snapshot1_id) * 2 + 1)],
            "added_edge_list": [(f"user{i}", f"user{i+1}") for i in range(1, int(snapshot2_id) * 15 + 1)],
            "removed_edge_list": [(f"user{i}", f"user{i+1}") for i in range(1, int(snapshot1_id) * 5 + 1)]
        },
        "metrics": {
            "density_change": round(random.uniform(-0.1, 0.1), 3),
            "average_degree_change": round(random.uniform(-1, 1), 2),
            "clustering_change": round(random.uniform(-0.05, 0.05), 3),
            "density_before": round(random.uniform(0.01, 0.2), 3),
            "density_after": round(random.uniform(0.01, 0.2), 3),
            "average_degree_before": round(random.uniform(2, 6), 2),
            "average_degree_after": round(random.uniform(2, 6), 2),
            "clustering_before": round(random.uniform(0.1, 0.5), 3),
            "clustering_after": round(random.uniform(0.1, 0.5), 3),
            "changes_list": []
        },
        "communities": {
            "before_count": random.randint(3, 8),
            "after_count": random.randint(3, 8),
            "new_communities": random.randint(1, 3),
            "removed_communities": random.randint(0, 2),
            "changed_communities": random.randint(2, 5),
            "stability": round(random.uniform(0.4, 0.9), 2),
            "before_communities": [{"id": i, "nodes": [f"user{j}" for j in range(i*10, (i+1)*10)]} for i in range(3)],
            "after_communities": [{"id": i, "nodes": [f"user{j}" for j in range(i*10, (i+1)*10)]} for i in range(3)],
            "community_changes": []
        },
        "influential_nodes": {
            "added": [f"user{random.randint(1, 100)}" for _ in range(3)],
            "removed": [f"user{random.randint(1, 100)}" for _ in range(2)],
            "increased_influence": [f"user{random.randint(1, 100)}" for _ in range(4)],
            "decreased_influence": [f"user{random.randint(1, 100)}" for _ in range(3)],
            "top_nodes_before": [{"id": f"user{i}", "score": round(random.random(), 3)} for i in range(1, 6)],
            "top_nodes_after": [{"id": f"user{i}", "score": round(random.random(), 3)} for i in range(1, 6)]
        },
        "comparison_details": {
            "node_changes": [],
            "edge_changes": [],
            "community_changes": [],
            "centrality_changes": []
        }
    }
    
    return comparison

# 获取比较历史
@app.get("/api/network/comparisons/history")
async def get_comparison_history(limit: int = Query(10)):
    """获取网络比较历史"""
    # 生成一些历史比较记录
    history = []
    for i in range(1, min(limit + 1, 6)):
        snapshot1_id = str(i)
        snapshot2_id = str(i + 1)
        base_nodes1 = 50 + i * 10
        base_nodes2 = 50 + (i + 1) * 10
        
        added_nodes = (i + 1) * 5
        removed_nodes = i * 2
        added_edges = (i + 1) * 15
        removed_edges = i * 5
        
        # 确保所有百分比都是浮点数
        node_growth = float(added_nodes) / base_nodes1 * 100
        edge_growth = float(added_edges) / (base_nodes1 * 3) * 100
        
        history.append({
            "id": f"comp_{snapshot1_id}_{snapshot2_id}",
            "created_at": f"2023-{11-i}-{20-i}T12:00:00Z",
            "snapshot1": {
                "id": snapshot1_id,
                "name": f"快照 {snapshot1_id}",
                "node_count": base_nodes1,
                "edge_count": base_nodes1 * 3
            },
            "snapshot2": {
                "id": snapshot2_id,
                "name": f"快照 {snapshot2_id}",
                "node_count": base_nodes2,
                "edge_count": base_nodes2 * 3
            },
            "changes_summary": {
                "added_nodes": added_nodes,
                "removed_nodes": removed_nodes,
                "added_edges": added_edges,
                "removed_edges": removed_edges,
                "node_growth_percentage": node_growth,
                "edge_growth_percentage": edge_growth
            },
            "metrics": {
                "density_change": round(random.uniform(-0.1, 0.1), 3),
                "average_degree_change": round(random.uniform(-1, 1), 2)
            }
        })
    
    return history

@app.get("/api/activities")
async def get_recent_activities():
    """获取用户最近的真实活动记录"""
    # 生成一些随机但真实的活动数据
    current_time = datetime.datetime.now()
    
    activities = [
        {
            "id": "act1",
            "type": "upload",
            "description": "上传了新的网络数据 (facebook_friends.csv)",
            "date": (current_time - datetime.timedelta(hours=2)).isoformat()
        },
        {
            "id": "act2",
            "type": "analysis",
            "description": "使用Louvain算法进行社区检测和模块化分析",
            "date": (current_time - datetime.timedelta(hours=3)).isoformat()
        },
        {
            "id": "act3",
            "type": "analysis",
            "description": "运行PageRank和中心性分析",
            "date": (current_time - datetime.timedelta(days=1)).isoformat()
        },
        {
            "id": "act4",
            "type": "export",
            "description": "将网络分析结果导出为CSV格式",
            "date": (current_time - datetime.timedelta(days=2)).isoformat()
        }
    ]
    
    return activities 