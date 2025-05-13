# 社交网络数据指南

本文档提供有关社交网络分析系统中使用的数据格式、数据来源以及如何导入数据的详细指南。

## 目录

1. [数据格式](#数据格式)
2. [示例数据生成](#示例数据生成)
3. [数据来源](#数据来源)
4. [数据导入](#数据导入)
5. [数据隐私与伦理考虑](#数据隐私与伦理考虑)
6. [网络快照与时间序列分析](#网络快照与时间序列分析)

## 数据格式

本系统支持多种格式的网络数据导入。以下是主要支持的格式：

### CSV 格式

最基本且通用的格式，包含以下列：

- `source`: 源节点ID
- `target`: 目标节点ID
- `weight` (可选): 边的权重
- `timestamp` (可选): 交互发生的时间戳

**示例:**
```csv
source,target,weight,timestamp
user1,user2,1,2023-01-01T12:00:00
user1,user3,2,2023-01-02T14:30:00
user2,user3,1,2023-01-03T09:15:00
```

### JSON 格式

更灵活的格式，支持节点和边的更多属性：

```json
{
  "nodes": [
    {
      "id": "user1",
      "name": "用户1",
      "attributes": {
        "age": 28,
        "gender": "male",
        "region": "北京",
        "interests": ["技术", "音乐"]
      }
    },
    ...
  ],
  "edges": [
    {
      "source": "user1",
      "target": "user2",
      "weight": 1,
      "type": "follow",
      "timestamp": "2023-01-01T12:00:00"
    },
    ...
  ]
}
```

### GraphML 格式

用于复杂网络分析的XML格式：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="d0" for="node" attr.name="name" attr.type="string"/>
  <key id="d1" for="edge" attr.name="weight" attr.type="double"/>
  <graph id="G" edgedefault="directed">
    <node id="user1">
      <data key="d0">用户1</data>
    </node>
    <node id="user2">
      <data key="d0">用户2</data>
    </node>
    <edge source="user1" target="user2">
      <data key="d1">1.0</data>
    </edge>
  </graph>
</graphml>
```

## 示例数据生成

为测试系统功能，我们提供了以下示例数据生成脚本：

### 小型随机网络生成

```python
import networkx as nx
import pandas as pd
import random
import datetime

def generate_random_network(n_nodes=100, p_edge=0.05, with_attributes=True):
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
    
    return pd.DataFrame(edges)

# 使用示例
df = generate_random_network()
df.to_csv('data/input/random_network.csv', index=False)
```

### 社区结构网络生成

```python
import networkx as nx
import pandas as pd
import random
import datetime

def generate_community_network(n_communities=5, min_nodes=20, max_nodes=50, p_in=0.3, p_out=0.01):
    # 创建带有社区结构的网络
    nodes_per_community = [random.randint(min_nodes, max_nodes) for _ in range(n_communities)]
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
    
    return pd.DataFrame(edges)

# 使用示例
df = generate_community_network()
df.to_csv('data/input/community_network.csv', index=False)
```

### 时间序列网络生成

为了测试网络比较功能，可以生成多个时间点的网络快照：

```python
import networkx as nx
import pandas as pd
import random
import datetime
import os

def generate_evolving_network(n_snapshots=4, start_nodes=100, growth_rate=0.2):
    # 创建目录
    os.makedirs('data/input/snapshots', exist_ok=True)
    
    # 初始图
    current_nodes = start_nodes
    G = nx.gnp_random_graph(current_nodes, 0.05, directed=True)
    
    # 为每个时间点生成快照
    for i in range(n_snapshots):
        snapshot_date = datetime.datetime.now() - datetime.timedelta(days=90*(n_snapshots-i-1))
        
        # 添加新节点和边
        if i > 0:
            new_nodes = int(current_nodes * growth_rate)
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
        df.to_csv(f'data/input/snapshots/network_{snapshot_name}.csv', index=False)
        
        # 创建快照元数据
        metadata = {
            'id': str(i+1),
            'name': f'{snapshot_date.strftime("%Y年%m月")}网络',
            'date': snapshot_date.strftime('%Y-%m-%d'),
            'node_count': current_nodes,
            'edge_count': len(edges)
        }
        with open(f'data/input/snapshots/network_{snapshot_name}_meta.json', 'w', encoding='utf-8') as f:
            import json
            json.dump(metadata, f, ensure_ascii=False, indent=2)

# 使用示例
generate_evolving_network()
```

## 数据来源

对于真实社交网络数据，主要有以下几种来源：

### 1. 公开数据集

- [Stanford Network Analysis Project (SNAP)](https://snap.stanford.edu/data/)：提供多种社交网络数据集，如Twitter关注关系、Facebook友谊网络等
- [Network Repository](https://networkrepository.com/)：大型的网络数据存储库，包含各类网络数据
- [KONECT - The Koblenz Network Collection](http://konect.cc/)：包含各种类型的网络数据集
- [Harvard Dataverse](https://dataverse.harvard.edu/)：提供学术研究中使用的网络数据

### 2. API获取数据

从社交媒体平台的API获取数据，需注意API使用限制和隐私政策：

- Twitter API
- LinkedIn API
- Facebook Graph API
- 微博开放平台API
- 知乎API

### 3. 网络爬虫

使用网络爬虫收集公开社交网络数据。需注意：
- 遵守网站的robots.txt规则
- 遵守相关法律法规
- 考虑服务器负载和访问频率
- 确保数据脱敏和隐私保护

## 数据导入

导入数据到系统有以下几种方式：

### 1. 通过Web界面上传

1. 导航到系统的"数据上传"页面
2. 选择文件类型（CSV、JSON、GraphML等）
3. 拖放文件或点击选择文件
4. 设置导入参数（如分隔符、编码等）
5. 点击上传并处理
6. 系统会显示导入进度和结果摘要

### 2. 通过API导入

使用REST API导入数据：

```bash
# 上传CSV文件
curl -X POST http://localhost:5000/api/network/upload \
  -F "file=@/path/to/your/network.csv" \
  -F "format=csv" \
  -F "name=我的网络" \
  -F "description=这是一个测试网络"

# 上传JSON文件
curl -X POST http://localhost:5000/api/network/upload \
  -F "file=@/path/to/your/network.json" \
  -F "format=json" \
  -F "name=我的JSON网络"
```

### 3. 直接导入数据库

对于大型数据集，可以直接导入到数据库：

1. 将数据文件放入`data/input/`目录
2. 运行导入脚本：

```bash
python -m scripts.import_network --file data/input/my_network.csv --format csv --name "我的大型网络"
```

## 数据隐私与伦理考虑

处理社交网络数据时，务必考虑：

1. **数据脱敏**：确保个人身份信息被移除或加密
2. **隐私保护**：遵守GDPR、CCPA等隐私法规
3. **同意和透明**：确保数据收集过程获得了适当的同意
4. **数据存储安全**：使用适当的安全措施保护存储的数据
5. **伦理使用**：考虑分析结果可能对个人和群体的影响

本系统默认会对所有用户ID进行哈希处理，并提供附加的隐私保护功能。

## 网络快照与时间序列分析

### 创建网络快照

为了使用网络比较功能，需要创建网络的时间序列快照：

1. 根据时间戳将数据分割成多个阶段
2. 为每个阶段创建独立的网络数据文件
3. 上传每个快照并标记日期信息

### 使用快照API

```bash
# 上传带有时间信息的快照
curl -X POST http://localhost:5000/api/network/snapshot \
  -F "file=@/path/to/your/january_network.csv" \
  -F "format=csv" \
  -F "name=一月网络" \
  -F "date=2023-01-15"
```

### 快照管理

系统提供以下快照管理功能：

- 创建、更新和删除快照
- 比较任意两个快照的差异
- 查看网络演变的时间线
- 分析关键指标的变化趋势

通过这些功能，可以深入了解网络的动态变化过程，识别关键变化点，并预测未来可能的发展趋势。 