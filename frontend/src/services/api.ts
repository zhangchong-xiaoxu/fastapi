import axios from 'axios';

// Create an axios instance with default configuration
const api = axios.create({
  // 使用相对路径以自动适应开发和生产环境
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // 增加超时时间
  timeout: 10000,
});

// 添加响应拦截器以统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API错误:', error);
    return Promise.reject(error);
  }
);

// Network API
export const networkApi = {
  getNetworks: () => api.get('/network/').catch(error => {
    console.log('API获取网络列表失败，使用默认网络数据');
    
    // 返回模拟数据，不再尝试从本地文件获取
    return Promise.resolve({
      data: [
        { id: 'sample', name: '示例网络', nodeCount: 15, edgeCount: 20 },
        { id: 'community', name: '社区网络', nodeCount: 197, edgeCount: 2756 },
        { id: 'random', name: '随机网络', nodeCount: 100, edgeCount: 492 }
      ]
    });
  }),
  
  getNetwork: (id: string) => api.get(`/network/${id}`).catch(error => {
    console.log(`无法从API获取网络数据(${id})，使用默认数据`);
    
    // 直接使用示例数据，不再尝试从本地文件获取
    const networkData = generateSampleNetwork(id);
    
    return Promise.resolve({
      data: {
        id: id || 'default-sample',
        ...networkData,
        metrics: {
          node_count: networkData.nodes.length,
          edge_count: networkData.edges.length,
          density: (2 * networkData.edges.length) / (networkData.nodes.length * (networkData.nodes.length - 1)),
          average_degree: (2 * networkData.edges.length) / networkData.nodes.length
        }
      }
    });
  }),
  
  uploadNetwork: (formData: FormData) => api.post('/network/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  deleteNetwork: (id: string) => api.delete(`/network/${id}`),
  
  predictLinks: (networkId: string, topK: number = 10) => 
    api.post(`/network/link-prediction`, { network_id: networkId, top_k: topK }).catch(error => {
      console.log('无法从API获取链接预测数据，使用示例数据');
      
      // 返回模拟数据
      const predictions = [];
      for (let i = 0; i < topK; i++) {
        const source = Math.floor(Math.random() * 30) + 1;
        let target = Math.floor(Math.random() * 30) + 1;
        
        // 避免自环
        while (source === target) {
          target = Math.floor(Math.random() * 30) + 1;
        }
        
        predictions.push({
          source: `${source}`,
          target: `${target}`,
          probability: Number(Math.random().toFixed(2))
        });
      }
      
      return Promise.resolve({
        data: {
          predictions
        }
      });
    }),
};

// Analysis API
export const analysisApi = {
  getCentrality: (networkId: string, algorithm: string) => 
    api.post(`/analysis/centrality`, { network_id: networkId, algorithm }).catch(error => {
      console.log('无法从API获取中心性数据，使用模拟数据');
      // 返回模拟数据
      const data = {
        highest_betweenness: Array.from({length: 5}, (_, i) => ({
          id: `${i+1}`, 
          name: `节点 ${i+1}`, 
          value: Number((0.8 - i * 0.1).toFixed(2))
        })),
        highest_closeness: Array.from({length: 5}, (_, i) => ({
          id: `${i+5}`, 
          name: `节点 ${i+5}`, 
          value: Number((0.7 - i * 0.08).toFixed(2))
        })),
        highest_degree: Array.from({length: 5}, (_, i) => ({
          id: `${i+2}`, 
          name: `节点 ${i+2}`, 
          value: Number((10 - i).toFixed(0))
        })),
      };
      
      return Promise.resolve({ data });
    }),
  
  getClusteringCoefficient: (networkId: string) => 
    api.get(`/analysis/clustering`).catch(error => {
      return Promise.resolve({
        data: { average: 0.32, distribution: Array(10).fill(0).map(() => Math.random() * 0.5) }
      });
    }),
  
  getCommunities: (networkId: string, algorithm: string) => 
    api.post(`/analysis/community_detection`, { network_id: networkId, algorithm }).catch(error => {
      console.log('无法从API获取社区数据，使用模拟数据');
      // 创建模拟社区数据
      const communities = {
        count: 5,
        distribution: [8, 6, 5, 4, 7]
      };
      
      return Promise.resolve({ data: { communities } });
    }),
  
  getPathLength: (networkId: string, source: string, target: string) => 
    api.get(`/analysis/path?source=${source}&target=${target}`).catch(error => {
      return Promise.resolve({
        data: { length: Math.floor(Math.random() * 3) + 1, path: [`${source}`, "10", `${target}`] }
      });
    }),
};

// User API
export const userApi = {
  getUsers: () => api.get('/user/'),
  getUser: (id: string) => api.get(`/user/${id}`),
  getUserActivity: (id: string) => api.get(`/user/${id}/activity`),
  getUserConnections: (id: string) => api.get(`/user/${id}/connections`),
};

// Health check
export const healthCheck = () => api.get('/health');

// 根据ID生成合适大小的示例网络数据
const generateSampleNetwork = (id: string) => {
  if (id === 'community') {
    // 生成一个较大的网络，有明显的社区结构
    return generateCommunityNetwork(200, 8);
  } else if (id === 'random') {
    // 生成一个中等大小的随机网络
    return generateRandomNetwork(100);
  } else {
    // 生成一个小型示例网络
    return {
      nodes: [
        {id: "1", name: "用户1", group: 1},
        {id: "2", name: "用户2", group: 1},
        {id: "3", name: "用户3", group: 1},
        {id: "4", name: "用户4", group: 2},
        {id: "5", name: "用户5", group: 2},
        {id: "6", name: "用户6", group: 2},
        {id: "7", name: "用户7", group: 3},
        {id: "8", name: "用户8", group: 3},
        {id: "9", name: "用户9", group: 3},
        {id: "10", name: "用户10", group: 4},
        {id: "11", name: "用户11", group: 4},
        {id: "12", name: "用户12", group: 4},
        {id: "13", name: "用户13", group: 5},
        {id: "14", name: "用户14", group: 5},
        {id: "15", name: "用户15", group: 5}
      ],
      edges: [
        {source: "1", target: "2", weight: 3},
        {source: "1", target: "3", weight: 2},
        {source: "2", target: "3", weight: 2},
        {source: "4", target: "5", weight: 2},
        {source: "4", target: "6", weight: 1},
        {source: "5", target: "6", weight: 3},
        {source: "7", target: "8", weight: 1},
        {source: "7", target: "9", weight: 2},
        {source: "8", target: "9", weight: 3},
        {source: "10", target: "11", weight: 2},
        {source: "10", target: "12", weight: 1},
        {source: "11", target: "12", weight: 3},
        {source: "13", target: "14", weight: 2},
        {source: "13", target: "15", weight: 1},
        {source: "14", target: "15", weight: 3},
        {source: "1", target: "4", weight: 1},
        {source: "4", target: "7", weight: 1},
        {source: "7", target: "10", weight: 1},
        {source: "10", target: "13", weight: 1},
        {source: "3", target: "6", weight: 1}
      ]
    };
  }
};

// 生成一个有明显社区结构的网络
const generateCommunityNetwork = (nodeCount: number, communityCount: number) => {
  interface Node {
    id: string;
    name: string;
    group: number;
  }
  
  interface Edge {
    source: string;
    target: string;
    weight: number;
  }
  
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // 创建节点并分配到社区
  for (let i = 1; i <= nodeCount; i++) {
    const group = Math.floor((i - 1) / (nodeCount / communityCount)) + 1;
    nodes.push({
      id: `${i}`,
      name: `节点 ${i}`,
      group
    });
  }
  
  // 创建边，主要在社区内部创建
  const maxEdges = nodeCount * 3; // 约定边数量为节点数量的3倍
  
  for (let i = 0; i < maxEdges; i++) {
    const sourceIndex = Math.floor(Math.random() * nodeCount);
    const sourceNode = nodes[sourceIndex];
    
    // 80%的概率在同一社区内连接，20%的概率跨社区连接
    let targetNode: Node;
    if (Math.random() < 0.8) {
      // 同一社区内连接
      const sameGroupNodes = nodes.filter(n => n.group === sourceNode.group && n.id !== sourceNode.id);
      if (sameGroupNodes.length > 0) {
        targetNode = sameGroupNodes[Math.floor(Math.random() * sameGroupNodes.length)];
      } else {
        // 如果没有同组节点，随机选择
        targetNode = nodes[Math.floor(Math.random() * nodeCount)];
      }
    } else {
      // 跨社区连接
      const otherGroupNodes = nodes.filter(n => n.group !== sourceNode.group);
      if (otherGroupNodes.length > 0) {
        targetNode = otherGroupNodes[Math.floor(Math.random() * otherGroupNodes.length)];
      } else {
        // 如果没有其他组节点，随机选择
        targetNode = nodes[Math.floor(Math.random() * nodeCount)];
      }
    }
    
    // 避免自环和重复边
    if (sourceNode.id !== targetNode.id) {
      // 检查这条边是否已存在
      const edgeExists = edges.some(e => 
        (e.source === sourceNode.id && e.target === targetNode.id) || 
        (e.source === targetNode.id && e.target === sourceNode.id)
      );
      
      if (!edgeExists) {
        edges.push({
          source: sourceNode.id,
          target: targetNode.id,
          weight: Math.floor(Math.random() * 3) + 1
        });
      }
    }
  }
  
  return { nodes, edges };
};

// 生成随机网络
const generateRandomNetwork = (nodeCount: number) => {
  interface Node {
    id: string;
    name: string;
    group: number;
  }
  
  interface Edge {
    source: string;
    target: string;
    weight: number;
  }
  
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // 创建节点
  for (let i = 1; i <= nodeCount; i++) {
    nodes.push({
      id: `${i}`,
      name: `节点 ${i}`,
      group: Math.floor(Math.random() * 5) + 1 // 随机分配1-5的组
    });
  }
  
  // 创建边
  const edgeCount = Math.floor(nodeCount * 5); // 约定边数量为节点数量的5倍
  
  for (let i = 0; i < edgeCount; i++) {
    const source = Math.floor(Math.random() * nodeCount) + 1;
    let target = Math.floor(Math.random() * nodeCount) + 1;
    
    // 避免自环
    while (source === target) {
      target = Math.floor(Math.random() * nodeCount) + 1;
    }
    
    // 检查这条边是否已存在
    const edgeExists = edges.some(e => 
      (e.source === `${source}` && e.target === `${target}`) || 
      (e.source === `${target}` && e.target === `${source}`)
    );
    
    if (!edgeExists) {
      edges.push({
        source: `${source}`,
        target: `${target}`,
        weight: Math.floor(Math.random() * 3) + 1
      });
    }
  }
  
  return { nodes, edges };
};

export default api;