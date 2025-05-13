import math
import random
from typing import Dict, List, Optional, Tuple

import networkx as nx
import numpy as np
from community import best_partition
from networkx.algorithms import community as nx_community

from app.models.network import (
    NetworkData, 
    NetworkMetrics, 
    Node, 
    Edge, 
    CentralityResult, 
    CommunityResult, 
    NetworkComparisonResult,
    RandomNetworkParams
)

def calculate_basic_metrics(G: nx.Graph) -> NetworkMetrics:
    """计算网络的基本指标"""
    
    # 基本指标
    node_count = G.number_of_nodes()
    edge_count = G.number_of_edges()
    
    # 如果网络为空，返回零值指标
    if node_count == 0 or node_count == 1:
        return NetworkMetrics(
            nodeCount=node_count,
            edgeCount=edge_count,
            density=0.0,
            averageDegree=0.0,
            averagePathLength=0.0,
            diameter=0,
            clusteringCoefficient=0.0,
            connectedComponents=0 if node_count == 0 else 1
        )
    
    # 密度
    density = nx.density(G)
    
    # 平均度
    degree_values = [d for n, d in G.degree()]
    average_degree = sum(degree_values) / node_count
    
    # 连通分量
    connected_components = nx.number_connected_components(G)
    
    # 平均路径长度和直径 (仅计算最大连通分量)
    largest_cc = max(nx.connected_components(G), key=len)
    largest_cc_subgraph = G.subgraph(largest_cc)
    
    try:
        average_path_length = nx.average_shortest_path_length(largest_cc_subgraph)
    except nx.NetworkXError:
        average_path_length = 0.0
    
    try:
        diameter = nx.diameter(largest_cc_subgraph)
    except nx.NetworkXError:
        diameter = 0
    
    # 聚类系数
    clustering_coefficient = nx.average_clustering(G)
    
    return NetworkMetrics(
        nodeCount=node_count,
        edgeCount=edge_count,
        density=density,
        averageDegree=average_degree,
        averagePathLength=average_path_length,
        diameter=diameter,
        clusteringCoefficient=clustering_coefficient,
        connectedComponents=connected_components
    )

def calculate_centrality(G: nx.Graph) -> Dict[str, CentralityResult]:
    """计算网络的中心性指标"""
    
    results = {}
    
    # 度中心性
    degree_centrality = nx.degree_centrality(G)
    results["degree"] = CentralityResult(
        algorithm="degree",
        description="节点的连接数量，反映节点的直接影响力",
        values=degree_centrality
    )
    
    # 介数中心性
    try:
        betweenness_centrality = nx.betweenness_centrality(G)
        results["betweenness"] = CentralityResult(
            algorithm="betweenness",
            description="节点作为其他节点之间最短路径的中介频率，反映节点的控制能力",
            values=betweenness_centrality
        )
    except Exception:
        pass
    
    # 接近中心性
    try:
        connected_components = list(nx.connected_components(G))
        if len(connected_components) > 0:
            largest_cc = max(connected_components, key=len)
            largest_cc_subgraph = G.subgraph(largest_cc)
            
            closeness_centrality = nx.closeness_centrality(largest_cc_subgraph)
            
            # 扩展到所有节点，不在最大连通分量中的节点中心性为0
            full_closeness = {node: 0 for node in G.nodes()}
            full_closeness.update(closeness_centrality)
            
            results["closeness"] = CentralityResult(
                algorithm="closeness",
                description="节点到所有其他节点的平均距离的倒数，反映节点的可达性",
                values=full_closeness
            )
    except Exception:
        pass
    
    # 特征向量中心性
    try:
        eigenvector_centrality = nx.eigenvector_centrality(G, max_iter=300)
        results["eigenvector"] = CentralityResult(
            algorithm="eigenvector",
            description="基于节点连接的其他节点的重要性，反映节点的影响力和声望",
            values=eigenvector_centrality
        )
    except Exception:
        pass
    
    return results

def detect_communities(G: nx.Graph) -> Dict[str, CommunityResult]:
    """使用不同算法检测社区"""
    
    results = {}
    
    # Louvain算法
    try:
        louvain_partition = best_partition(G)
        communities_dict = {}
        for node, community_id in louvain_partition.items():
            if community_id not in communities_dict:
                communities_dict[community_id] = []
            communities_dict[community_id].append(node)
        
        louvain_communities = list(communities_dict.values())
        modularity = nx_community.modularity(G, louvain_communities)
        
        results["louvain"] = CommunityResult(
            algorithm="louvain",
            description="基于模块度优化的社区检测方法，适用于大型网络",
            communities=louvain_communities,
            modularityScore=modularity
        )
    except Exception:
        pass
    
    # Label Propagation算法
    try:
        lpa_communities = list(nx_community.label_propagation_communities(G))
        lpa_modularity = nx_community.modularity(G, lpa_communities)
        
        results["label_propagation"] = CommunityResult(
            algorithm="label_propagation",
            description="基于标签传播的社区检测方法，计算效率高",
            communities=lpa_communities,
            modularityScore=lpa_modularity
        )
    except Exception:
        pass
    
    # Girvan-Newman算法 (仅计算一个层次以避免计算开销)
    try:
        if G.number_of_nodes() < 100:  # 仅对较小网络执行
            gn_communities = list(nx_community.girvan_newman(G))
            # 只取第一个划分结果
            first_partition = tuple(sorted(c) for c in next(gn_communities))
            gn_modularity = nx_community.modularity(G, first_partition)
            
            results["girvan_newman"] = CommunityResult(
                algorithm="girvan_newman",
                description="基于边介数的层次社区检测方法，适用于小型网络",
                communities=first_partition,
                modularityScore=gn_modularity
            )
    except Exception:
        pass
    
    return results

def compare_networks(network1: NetworkData, network2: NetworkData) -> NetworkComparisonResult:
    """比较两个网络并找出差异"""
    
    # 创建节点和边的集合，便于比较
    nodes1_set = {node.id for node in network1.nodes}
    nodes2_set = {node.id for node in network2.nodes}
    
    edges1_set = {(edge.source, edge.target) for edge in network1.edges}
    edges2_set = {(edge.source, edge.target) for edge in network2.edges}
    
    # 找出添加和删除的节点
    added_nodes = list(nodes2_set - nodes1_set)
    removed_nodes = list(nodes1_set - nodes2_set)
    
    # 找出添加和删除的边
    added_edges = list(edges2_set - edges1_set)
    removed_edges = list(edges1_set - edges2_set)
    
    # 创建NetworkX图计算指标
    G1 = nx.Graph()
    for node in network1.nodes:
        G1.add_node(node.id)
    for edge in network1.edges:
        G1.add_edge(edge.source, edge.target)
    
    G2 = nx.Graph()
    for node in network2.nodes:
        G2.add_node(node.id)
    for edge in network2.edges:
        G2.add_edge(edge.source, edge.target)
    
    # 计算两个网络的基本指标
    metrics1 = calculate_basic_metrics(G1)
    metrics2 = calculate_basic_metrics(G2)
    
    return NetworkComparisonResult(
        addedNodes=added_nodes,
        removedNodes=removed_nodes,
        addedEdges=added_edges,
        removedEdges=removed_edges,
        metrics1=metrics1,
        metrics2=metrics2
    )

def generate_random_network(params: RandomNetworkParams) -> NetworkData:
    """生成随机网络"""
    
    # 根据选择的模型生成网络
    if params.model == "erdos_renyi":
        G = nx.erdos_renyi_graph(params.nodeCount, params.density)
    elif params.model == "barabasi_albert":
        m = max(1, int(params.density * params.nodeCount))
        m = min(m, params.nodeCount - 1)  # 确保m不超过节点数-1
        G = nx.barabasi_albert_graph(params.nodeCount, m)
    elif params.model == "watts_strogatz":
        k = max(2, int(params.density * params.nodeCount))
        k = k if k % 2 == 0 else k - 1  # 确保k是偶数
        k = min(k, params.nodeCount - 1)  # 确保k不超过节点数-1
        p = params.rewiring or 0.1
        G = nx.watts_strogatz_graph(params.nodeCount, k, p)
    else:
        raise ValueError(f"未知的网络模型: {params.model}")
    
    # 创建节点和边列表
    nodes = []
    for i in range(params.nodeCount):
        nodes.append(Node(
            id=str(i),
            label=f"Node {i}",
            group=1
        ))
    
    edges = []
    for u, v in G.edges():
        edges.append(Edge(
            source=str(u),
            target=str(v),
            weight=1.0
        ))
    
    return NetworkData(nodes=nodes, edges=edges)

def networkx_to_network_data(G: nx.Graph) -> NetworkData:
    """将NetworkX图转换为NetworkData"""
    
    nodes = []
    for node_id in G.nodes():
        # 提取节点属性
        attrs = G.nodes[node_id]
        label = attrs.get('label', str(node_id))
        group = attrs.get('group', 1)
        
        # 创建Node对象
        nodes.append(Node(
            id=str(node_id),
            label=label,
            group=group,
            properties={k: v for k, v in attrs.items() if k not in ['label', 'group']}
        ))
    
    edges = []
    for source, target, attrs in G.edges(data=True):
        # 提取边权重
        weight = attrs.get('weight', 1.0)
        
        # 创建Edge对象
        edges.append(Edge(
            source=str(source),
            target=str(target),
            weight=weight,
            properties={k: v for k, v in attrs.items() if k != 'weight'}
        ))
    
    return NetworkData(nodes=nodes, edges=edges)

def network_data_to_networkx(network_data: NetworkData) -> nx.Graph:
    """将NetworkData转换为NetworkX图"""
    
    G = nx.Graph()
    
    # 添加节点
    for node in network_data.nodes:
        properties = node.properties or {}
        G.add_node(
            node.id, 
            label=node.label,
            group=node.group,
            **properties
        )
    
    # 添加边
    for edge in network_data.edges:
        properties = edge.properties or {}
        G.add_edge(
            edge.source, 
            edge.target, 
            weight=edge.weight,
            **properties
        )
    
    return G 