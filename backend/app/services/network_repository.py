import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

import networkx as nx
from pymongo import MongoClient
from bson.objectid import ObjectId

from app.models.network import NetworkData, NetworkMetrics, NetworkDetail, NetworkListItem, NetworkCreate, NetworkUpdate, NetworkSnapshot
from app.services.network_service import calculate_basic_metrics
from app.config import settings

class NetworkRepository:
    def __init__(self):
        self.client = MongoClient(settings.MONGODB_URI)
        self.db = self.client[settings.MONGODB_DATABASE]
        self.networks_collection = self.db["networks"]
        self.snapshots_collection = self.db["network_snapshots"]
    
    def list_networks(self) -> List[NetworkListItem]:
        networks = self.networks_collection.find({}, {
            "name": 1,
            "description": 1,
            "nodeCount": 1,
            "edgeCount": 1,
            "createdAt": 1,
            "updatedAt": 1
        })
        
        result = []
        for network in networks:
            result.append(NetworkListItem(
                id=str(network["_id"]),
                name=network["name"],
                description=network.get("description"),
                nodeCount=network["nodeCount"],
                edgeCount=network["edgeCount"],
                createdAt=network["createdAt"],
                updatedAt=network["updatedAt"]
            ))
        
        return result
    
    def get_network(self, network_id: str) -> Optional[NetworkDetail]:
        network = self.networks_collection.find_one({"_id": ObjectId(network_id)})
        
        if not network:
            return None
        
        return NetworkDetail(
            id=str(network["_id"]),
            name=network["name"],
            description=network.get("description"),
            data=NetworkData(**network["data"]),
            metrics=NetworkMetrics(**network["metrics"]),
            createdAt=network["createdAt"],
            updatedAt=network["updatedAt"]
        )
    
    def create_network(self, network_create: NetworkCreate) -> str:
        # 创建NetworkX图进行指标计算
        G = nx.Graph()
        
        # 添加节点
        for node in network_create.data.nodes:
            G.add_node(node.id, **node.dict(exclude={"id"}))
        
        # 添加边
        for edge in network_create.data.edges:
            G.add_edge(edge.source, edge.target, **edge.dict(exclude={"source", "target"}))
        
        # 计算基本指标
        metrics = calculate_basic_metrics(G)
        
        now = datetime.utcnow()
        
        network_dict = {
            "name": network_create.name,
            "description": network_create.description,
            "data": network_create.data.dict(),
            "metrics": metrics.dict(),
            "nodeCount": len(network_create.data.nodes),
            "edgeCount": len(network_create.data.edges),
            "createdAt": now,
            "updatedAt": now
        }
        
        result = self.networks_collection.insert_one(network_dict)
        return str(result.inserted_id)
    
    def update_network(self, network_id: str, network_update: NetworkUpdate) -> bool:
        network = self.networks_collection.find_one({"_id": ObjectId(network_id)})
        
        if not network:
            return False
        
        update_dict = {"updatedAt": datetime.utcnow()}
        
        if network_update.name is not None:
            update_dict["name"] = network_update.name
        
        if network_update.description is not None:
            update_dict["description"] = network_update.description
        
        if network_update.data is not None:
            # 创建NetworkX图进行指标计算
            G = nx.Graph()
            
            # 添加节点
            for node in network_update.data.nodes:
                G.add_node(node.id, **node.dict(exclude={"id"}))
            
            # 添加边
            for edge in network_update.data.edges:
                G.add_edge(edge.source, edge.target, **edge.dict(exclude={"source", "target"}))
            
            # 计算基本指标
            metrics = calculate_basic_metrics(G)
            
            update_dict["data"] = network_update.data.dict()
            update_dict["metrics"] = metrics.dict()
            update_dict["nodeCount"] = len(network_update.data.nodes)
            update_dict["edgeCount"] = len(network_update.data.edges)
        
        result = self.networks_collection.update_one(
            {"_id": ObjectId(network_id)},
            {"$set": update_dict}
        )
        
        return result.modified_count > 0
    
    def delete_network(self, network_id: str) -> bool:
        # 删除所有相关的快照
        self.snapshots_collection.delete_many({"networkId": network_id})
        
        # 删除网络
        result = self.networks_collection.delete_one({"_id": ObjectId(network_id)})
        return result.deleted_count > 0
    
    def create_snapshot(self, network_id: str, name: str, description: Optional[str] = None) -> str:
        network = self.networks_collection.find_one({"_id": ObjectId(network_id)})
        
        if not network:
            raise ValueError(f"Network with id {network_id} not found")
        
        snapshot_dict = {
            "networkId": network_id,
            "name": name,
            "description": description,
            "data": network["data"],
            "metrics": network["metrics"],
            "createdAt": datetime.utcnow()
        }
        
        result = self.snapshots_collection.insert_one(snapshot_dict)
        return str(result.inserted_id)
    
    def get_network_snapshots(self, network_id: str) -> List[NetworkSnapshot]:
        snapshots = self.snapshots_collection.find({"networkId": network_id})
        
        result = []
        for snapshot in snapshots:
            result.append(NetworkSnapshot(
                id=str(snapshot["_id"]),
                networkId=snapshot["networkId"],
                name=snapshot["name"],
                description=snapshot.get("description"),
                data=NetworkData(**snapshot["data"]),
                metrics=NetworkMetrics(**snapshot["metrics"]),
                createdAt=snapshot["createdAt"]
            ))
        
        return result
    
    def get_snapshot(self, snapshot_id: str) -> Optional[NetworkSnapshot]:
        snapshot = self.snapshots_collection.find_one({"_id": ObjectId(snapshot_id)})
        
        if not snapshot:
            return None
        
        return NetworkSnapshot(
            id=str(snapshot["_id"]),
            networkId=snapshot["networkId"],
            name=snapshot["name"],
            description=snapshot.get("description"),
            data=NetworkData(**snapshot["data"]),
            metrics=NetworkMetrics(**snapshot["metrics"]),
            createdAt=snapshot["createdAt"]
        )
    
    def delete_snapshot(self, snapshot_id: str) -> bool:
        result = self.snapshots_collection.delete_one({"_id": ObjectId(snapshot_id)})
        return result.deleted_count > 0 