#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
社交网络测试数据生成脚本
用于生成测试用的社交网络数据，包括随机网络、社区结构网络和时间序列演化网络
"""

import networkx as nx
import pandas as pd
import random
import datetime
import os
import json
import argparse

def generate_random_network(n_nodes=100, p_edge=0.05, with_attributes=True):
    """
    生成随机网络
    
    参数:
        n_nodes (int): 节点数量
        p_edge (float): 边的概率
        with_attributes (bool): 是否生成属性
        
    返回:
        pandas.DataFrame: 网络边的数据帧
    """
    print(f"生成具有 {n_nodes} 个节点和约 {int(n_nodes * n_nodes * p_edge)} 条边的随机网络...")
    
    # 创建随机图
    G = nx.gnp_random_graph(n_nodes, p_edge, directed=True)
    
    # 为边添加随机权重
    for u, v in G.edges():
        G[u][v]['weight'] = random.randint(1, 5)
    
    # 生成节点属性
    if with_attributes:
        groups = ['技术', '市场', '研发', '设计', '运营']
        for i in range(n_nodes):
            G.nodes[i]['name'] = f'用户{i+1}'
            G.nodes[i]['group'] = random.choice(range(len(groups)))
            G.nodes[i]['group_name'] = groups[G.nodes[i]['group']]
    
    # 转换为数据帧
    edges = []
    for u, v, d in G.edges(data=True):
        timestamp = datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 365))
        edges.append({
            'source': f'user{u+1}',
            'target': f'user{v+1}',
            'weight': d.get('weight', 1),
            'timestamp': timestamp.isoformat()
        })
    
    df = pd.DataFrame(edges)
    print(f"已生成 {len(df)} 条边")
    return df

def generate_community_network(n_communities=5, min_nodes=20, max_nodes=50, p_in=0.3, p_out=0.01):
    """
    生成带有社区结构的网络
    
    参数:
        n_communities (int): 社区数量
        min_nodes (int): 每个社区最小节点数
        max_nodes (int): 每个社区最大节点数
        p_in (float): 社区内边的概率
        p_out (float): 社区间边的概率
        
    返回:
        pandas.DataFrame: 网络边的数据帧
    """
    print(f"生成具有 {n_communities} 个社区的网络结构...")
    
    # 创建带有社区结构的网络
    nodes_per_community = [random.randint(min_nodes, max_nodes) for _ in range(n_communities)]
    total_nodes = sum(nodes_per_community)
    print(f"总节点数: {total_nodes}，社区分布: {nodes_per_community}")
    
    G = nx.random_partition_graph(nodes_per_community, p_in, p_out, directed=True)
    
    # 添加属性和权重
    community_id = 0
    node_id = 0
    community_map = {}
    
    for community_size in nodes_per_community:
        for _ in range(community_size):
            G.nodes[node_id]['community'] = community_id
            G.nodes[node_id]['name'] = f'用户{node_id+1}'
            community_map[node_id] = community_id
            node_id += 1
        community_id += 1
    
    # 添加边权重
    for u, v in G.edges():
        # 同社区的边权重通常更高
        if community_map[u] == community_map[v]:
            G[u][v]['weight'] = random.randint(3, 5)
        else:
            G[u][v]['weight'] = random.randint(1, 2)
    
    # 转换为数据帧
    edges = []
    for u, v, d in G.edges(data=True):
        timestamp = datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 365))
        edges.append({
            'source': f'user{u+1}',
            'target': f'user{v+1}',
            'weight': d.get('weight', 1),
            'timestamp': timestamp.isoformat()
        })
    
    df = pd.DataFrame(edges)
    print(f"已生成 {len(df)} 条边")
    return df

def generate_evolving_network(n_snapshots=4, start_nodes=100, growth_rate=0.2):
    """
    生成演化网络快照序列
    
    参数:
        n_snapshots (int): 快照数量
        start_nodes (int): 初始节点数量
        growth_rate (float): 每个快照的增长率
        
    返回:
        list: 生成的文件路径列表
    """
    print(f"生成 {n_snapshots} 个时间点的网络快照...")
    
    # 创建目录
    output_dir = 'data/input/snapshots'
    os.makedirs(output_dir, exist_ok=True)
    
    # 初始图
    current_nodes = start_nodes
    G = nx.gnp_random_graph(current_nodes, 0.05, directed=True)
    
    generated_files = []
    
    # 为每个时间点生成快照
    for i in range(n_snapshots):
        snapshot_date = datetime.datetime.now() - datetime.timedelta(days=90*(n_snapshots-i-1))
        
        # 添加新节点和边
        if i > 0:
            new_nodes = int(current_nodes * growth_rate)
            print(f"快照 {i+1}: 添加 {new_nodes} 个新节点")
            
            for j in range(current_nodes, current_nodes + new_nodes):
                G.add_node(j)
                # 连接到现有节点
                for k in range(random.randint(1, 5)):
                    target = random.randint(0, current_nodes-1)
                    G.add_edge(j, target, weight=random.randint(1, 3))
            
            current_nodes += new_nodes
            
            # 随机删除一些边模拟关系变化
            edges = list(G.edges())
            edges_to_remove = random.sample(edges, min(len(edges)//10, 10))
            for edge in edges_to_remove:
                G.remove_edge(*edge)
            
            # 添加一些新边
            for _ in range(len(edges_to_remove)):
                u = random.randint(0, current_nodes-1)
                v = random.randint(0, current_nodes-1)
                if u != v and not G.has_edge(u, v):
                    G.add_edge(u, v, weight=random.randint(1, 3))
        
        # 为所有边添加权重
        for u, v in G.edges():
            if 'weight' not in G[u][v]:
                G[u][v]['weight'] = random.randint(1, 5)
        
        # 转换为数据帧
        edges = []
        for u, v, d in G.edges(data=True):
            edges.append({
                'source': f'user{u+1}',
                'target': f'user{v+1}',
                'weight': d.get('weight', 1)
            })
        
        snapshot_name = snapshot_date.strftime('%Y%m%d')
        df = pd.DataFrame(edges)
        
        # 保存CSV
        csv_file = f'{output_dir}/network_{snapshot_name}.csv'
        df.to_csv(csv_file, index=False)
        generated_files.append(csv_file)
        
        # 创建快照元数据
        metadata = {
            'id': str(i+1),
            'name': f'{snapshot_date.strftime("%Y年%m月")}网络',
            'date': snapshot_date.strftime('%Y-%m-%d'),
            'node_count': current_nodes,
            'edge_count': len(edges),
            'density': (2 * len(edges)) / (current_nodes * (current_nodes - 1)),
            'avgDegree': (2 * len(edges)) / current_nodes
        }
        
        # 保存元数据
        meta_file = f'{output_dir}/network_{snapshot_name}_meta.json'
        with open(meta_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        generated_files.append(meta_file)
        
        print(f"快照 {i+1} ({snapshot_date.strftime('%Y-%m-%d')}): {len(edges)} 条边, {current_nodes} 个节点")

    return generated_files

def generate_export_json(df, output_file):
    """
    将边数据转换为完整的JSON格式
    
    参数:
        df (pandas.DataFrame): 边数据
        output_file (str): 输出文件路径
    """
    # 提取唯一节点
    sources = set(df['source'].unique())
    targets = set(df['target'].unique())
    nodes = list(sources.union(targets))
    
    # 创建映射到组
    node_groups = {}
    for node in nodes:
        node_groups[node] = random.randint(0, 4)
    
    # 创建JSON结构
    json_data = {
        "nodes": [
            {
                "id": node,
                "name": node.replace("user", "用户"),
                "group": node_groups[node]
            } for node in nodes
        ],
        "edges": [
            {
                "source": row['source'],
                "target": row['target'],
                "weight": row['weight']
            } for _, row in df.iterrows()
        ]
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    
    print(f"已将完整网络数据保存到 {output_file}")

def main():
    parser = argparse.ArgumentParser(description='生成社交网络测试数据')
    parser.add_argument('--type', type=str, choices=['random', 'community', 'evolving', 'all'], 
                      default='all', help='生成的网络类型')
    parser.add_argument('--nodes', type=int, default=100, help='节点数量')
    parser.add_argument('--communities', type=int, default=5, help='社区数量')
    parser.add_argument('--snapshots', type=int, default=4, help='时间快照数量')
    
    args = parser.parse_args()
    
    # 创建输入目录
    os.makedirs('data/input', exist_ok=True)
    
    if args.type in ['random', 'all']:
        # 随机网络
        df_random = generate_random_network(n_nodes=args.nodes)
        random_csv = 'data/input/random_network.csv'
        df_random.to_csv(random_csv, index=False)
        print(f"随机网络已保存到 {random_csv}")
        
        # 同时生成JSON格式
        random_json = 'data/input/random_network.json'
        generate_export_json(df_random, random_json)
    
    if args.type in ['community', 'all']:
        # 社区结构网络
        df_community = generate_community_network(n_communities=args.communities)
        community_csv = 'data/input/community_network.csv'
        df_community.to_csv(community_csv, index=False)
        print(f"社区网络已保存到 {community_csv}")
        
        # 同时生成JSON格式
        community_json = 'data/input/community_network.json'
        generate_export_json(df_community, community_json)
    
    if args.type in ['evolving', 'all']:
        # 演化网络
        files = generate_evolving_network(n_snapshots=args.snapshots)
        print(f"演化网络序列已保存到 {', '.join(files)}")
    
    print("数据生成完成！")
    print("您可以通过以下方式导入数据:")
    print("1. 使用Web界面上传文件")
    print("2. 使用API: curl -X POST http://localhost:5000/api/network/upload -F \"file=@data/input/random_network.csv\" -F \"format=csv\" -F \"name=随机网络\"")
    print("3. 使用导入脚本: python -m scripts.import_network --file data/input/random_network.csv --format csv --name \"随机网络\"")

if __name__ == "__main__":
    main() 