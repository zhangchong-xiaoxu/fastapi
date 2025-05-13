import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Analysis.css';
import CommunityView from '../components/CommunityView';
import UserActivityPredictions, { UserActivityPrediction } from '../components/UserActivityPredictions';
import UserInfluenceNetwork from '../components/UserInfluenceNetwork';
import { networkApi, analysisApi } from '../services/api';

interface Community {
  id: string;
  name: string;
  size: number;
  density: number;
  avgDegree: number;
  keyNodes: string[];
}

interface Metric {
  name: string;
  value: number;
  description: string;
}

interface NetworkData {
  nodes: Array<{
    id: string;
    name: string;
    group: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
}

const formatMetricName = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatMetricValue = (key: string, value: any): string => {
  if (typeof value === 'number') {
    // 根据不同的指标类型返回不同格式的数值
    if (key.includes('ratio') || key.includes('coefficient') || key.includes('centrality')) {
      return value.toFixed(3);
    } else if (Number.isInteger(value)) {
      return value.toString();
    } else {
      return value.toFixed(2);
    }
  }
  return String(value);
};

const getMetricDescription = (key: string): string => {
  const descriptions: {[key: string]: string} = {
    nodeCount: "网络中用户总数",
    edgeCount: "用户之间连接的总数",
    density: "实际连接占潜在连接的比例",
    averageDegree: "每个用户平均连接数",
    averageClusteringCoefficient: "用户聚集程度的衡量",
    diameter: "任意两个用户之间的最大距离",
    averagePathLength: "所有用户对之间的平均最短路径长度",
    modularity: "网络划分为社区的强度",
    // 添加更多指标描述
  };
  
  return descriptions[key] || "表示结构属性的网络指标";
};

const Analysis: React.FC = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 用户行为预测状态
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isPredictingActivity, setIsPredictingActivity] = useState<boolean>(false);
  const [activityPredictions, setActivityPredictions] = useState<UserActivityPrediction[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [showActivityPredictions, setShowActivityPredictions] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserActivityPrediction | null>(null);

  useEffect(() => {
    // 获取社区、网络指标和网络数据
    const fetchData = async () => {
      setLoading(true);
      try {
        // Use relative URLs instead of hardcoded paths
        const communitiesResponse = await axios.get('/api/network/communities');
        const metricsResponse = await axios.get('/api/network/metrics');
        const networkResponse = await axios.get('/api/network');
        
        setCommunities(communitiesResponse.data);
        setMetrics(metricsResponse.data);
        
        // Transform network data format if needed
        const networkData = networkResponse.data;
        if (networkData.edges && !networkData.links) {
          // Convert edges to links if needed by the frontend components
          networkData.links = networkData.edges.map((edge: any) => ({
            source: edge.source,
            target: edge.target,
            weight: edge.weight || 1
          }));
        }
        
        setNetworkData(networkData);
      } catch (error) {
        console.error('获取网络分析数据出错:', error);
        
        // More detailed error logging
        if (axios.isAxiosError(error)) {
          if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
          } else if (error.request) {
            console.error('No response received:', error.request);
          } else {
            console.error('Error setting up request:', error.message);
          }
        }
        
        // Mock data for development - keep this as fallback
        setCommunities([
          { 
            id: 'c1', 
            name: '技术部门', 
            size: 42, 
            density: 0.186, 
            avgDegree: 7.8,
            keyNodes: ['张三', '李四', '王五', '赵六']
          },
          { 
            id: 'c2', 
            name: '市场部门', 
            size: 38, 
            density: 0.154, 
            avgDegree: 5.9,
            keyNodes: ['刘一', '陈二', '孙七']
          },
          { 
            id: 'c3', 
            name: '研发部门', 
            size: 29, 
            density: 0.218, 
            avgDegree: 6.3,
            keyNodes: ['周八', '吴九', '郑十']
          },
          { 
            id: 'c4', 
            name: '管理层', 
            size: 15, 
            density: 0.390, 
            avgDegree: 5.8,
            keyNodes: ['钱十一', '孙十二']
          },
          { 
            id: 'c5', 
            name: '工程部门', 
            size: 31, 
            density: 0.210, 
            avgDegree: 6.5,
            keyNodes: ['周十三', '吴十四', '郑十五']
          }
        ]);
        
        setMetrics([
          { name: '密度', value: 0.087, description: '实际连接与所有可能连接的比率' },
          { name: '传递性', value: 0.286, description: '相邻节点连接的概率' },
          { name: '平均路径长度', value: 3.14, description: '沿最短路径的平均步数' },
          { name: '直径', value: 7, description: '任意节点对之间的最大距离' },
          { name: '模块度', value: 0.62, description: '社区划分强度的度量' }
        ]);
        
        // Mock network data
        setNetworkData({
          nodes: [
            { id: '1', name: '张三', group: 1 },
            { id: '2', name: '李四', group: 1 },
            { id: '3', name: '王五', group: 1 },
            { id: '4', name: '刘一', group: 2 },
            { id: '5', name: '陈二', group: 2 },
            { id: '6', name: '周八', group: 3 },
            { id: '7', name: '钱十一', group: 4 },
            { id: '8', name: '周十三', group: 5 }
          ],
          links: [
            { source: '1', target: '2', weight: 3 },
            { source: '1', target: '3', weight: 2 },
            { source: '2', target: '3', weight: 4 },
            { source: '4', target: '5', weight: 3 },
            { source: '6', target: '8', weight: 2 },
            { source: '1', target: '6', weight: 1 },
            { source: '3', target: '8', weight: 2 },
            { source: '5', target: '7', weight: 3 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 安全地查找指标，带空值检查
  const getMetricValue = (name: string): number => {
    const metric = metrics.find(m => m.name === name);
    return metric ? metric.value : 0;
  };
  
  const handlePredictUserActivity = async () => {
    if (!networkData || networkData.nodes.length === 0) {
      setActivityError("没有可用于预测的网络数据");
      return;
    }
    
    setIsPredictingActivity(true);
    setActivityError(null);
    setShowActivityPredictions(true);
    
    try {
      // Convert the networkData format if needed
      const apiData = {
        nodes: networkData.nodes,
        edges: networkData.links.map(link => ({
          source: link.source,
          target: link.target,
          weight: link.weight
        }))
      };
      
      // Use the API directly without the URL hardcoding
      const response = await axios.post(
        '/api/analysis/predict-user-activity',
        apiData,
        { params: { top_k: 10 } }
      );
      
      // Convert the response to the expected format for UserActivityPrediction
      const predictions = response.data.map((user: any) => ({
        id: user.id,
        name: user.name,
        current_activity: user.degree, // Use degree as current activity
        predicted_activity: user.predicted_activity,
        probability: 0.7, // Default probability since it might not be provided
        change: 0 // We'll calculate this if needed
      }));
      
      setActivityPredictions(predictions);
    } catch (error) {
      console.error('预测用户活动出错:', error);
      setActivityError("预测用户活动失败，请稍后再试。");

      // Use mock data in case of error (for development only)
      setActivityPredictions([
        { id: '1', name: '张三', current_activity: 0.75, predicted_activity: 0.89, probability: 0.85, change: 0.14 },
        { id: '2', name: '李四', current_activity: 0.62, predicted_activity: 0.76, probability: 0.78, change: 0.14 },
        { id: '8', name: '周十三', current_activity: 0.65, predicted_activity: 0.72, probability: 0.82, change: 0.07 },
        { id: '3', name: '王五', current_activity: 0.70, predicted_activity: 0.65, probability: 0.75, change: -0.05 },
        { id: '5', name: '陈二', current_activity: 0.45, predicted_activity: 0.58, probability: 0.70, change: 0.13 },
        { id: '4', name: '刘一', current_activity: 0.58, predicted_activity: 0.52, probability: 0.88, change: -0.06 },
        { id: '6', name: '周八', current_activity: 0.52, predicted_activity: 0.48, probability: 0.65, change: -0.04 },
        { id: '7', name: '钱十一', current_activity: 0.40, predicted_activity: 0.35, probability: 0.72, change: -0.05 }
      ]);
    } finally {
      setIsPredictingActivity(false);
    }
  };
  
  const handleSelectUser = (user: UserActivityPrediction) => {
    // 设置选中的用户以便在可视化中突出显示
    setSelectedUser(user);
    console.log('选中用户:', user);
  };

  return (
    <div className="analysis-container">
      <h1>网络分析</h1>
      <p className="description">深入分析社交网络结构、用户行为和社区互动模式</p>
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载网络分析数据...</p>
        </div>
      ) : activityError ? (
        <div className="error-message">
          <p>加载网络分析数据失败: {activityError}</p>
          <button className="secondary-button" onClick={() => window.location.reload()}>重试</button>
        </div>
      ) : (
        <>
          <div className="analysis-grid">
            <div className="metrics-section">
              <h2>网络指标分析</h2>
              <div className="section-description">关键网络特征指标展示与解读</div>
              <div className="metrics-cards">
                {metrics.map((metric, index) => (
                  <div className="metrics-card" key={index} data-aos="fade-up" data-aos-delay={index * 100}>
                    <h3>{metric.name}</h3>
                    <p className="metric-value">{formatMetricValue('', metric.value)}</p>
                    <p className="metric-description">{metric.description}</p>
                    <div className="metric-trend">
                      <span className="trend-icon">↗</span>
                      <span className="trend-text">较上周提升 5%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="communities-section">
              <h2>社区结构分析</h2>
              <div className="section-description">社区划分与群组互动特征分析</div>
              {communities && communities.length > 0 ? (
                <div className="community-content" data-aos="fade-up">
                  <CommunityView 
                    communities={communities}
                    onSelectCommunity={setSelectedCommunity}
                    selectedCommunity={selectedCommunity} 
                  />
                  <div className="community-stats">
                    <div className="stat-item">
                      <span className="stat-label">社区总数</span>
                      <span className="stat-value">{communities.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">平均规模</span>
                      <span className="stat-value">
                        {Math.round(communities.reduce((acc, curr) => acc + curr.size, 0) / communities.length)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>暂无可用的社区数据</p>
                  <button className="secondary-button" onClick={() => window.location.reload()}>刷新数据</button>
                </div>
              )}
            </div>
          </div>

          <div className="analysis-section insights-section">
            <h2>用户行为预测</h2>
            {isPredictingActivity ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>正在生成用户活动预测...</p>
              </div>
            ) : (
              <>
                {!showActivityPredictions ? (
                  <div className="action-buttons">
                    <button 
                      className="primary-button" 
                      onClick={handlePredictUserActivity}
                      disabled={isPredictingActivity}
                    >
                      {isPredictingActivity ? '处理中...' : '预测用户活动'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="action-buttons">
                      <button 
                        className="secondary-button" 
                        onClick={() => {
                          setShowActivityPredictions(false);
                          setSelectedUser(null);
                        }}
                      >
                        隐藏预测
                      </button>
                    </div>
                    
                    <div className="activity-analysis-container">
                      <UserActivityPredictions 
                        predictions={activityPredictions}
                        onUserSelect={handleSelectUser}
                        selectedUser={selectedUser}
                      />
                      
                      <div className="influence-visualization-container">
                        <div className="influence-network-card">
                          <h3>用户影响力可视化</h3>
                          <p className="network-description">
                            此网络显示用户关系和预测的活动水平。
                            更大且更深的节点表示预测活动更高的用户。
                            点击表中的用户以突出显示他们的连接。
                          </p>
                          <UserInfluenceNetwork 
                            networkData={networkData || {nodes: [], links: []}}
                            activityPredictions={activityPredictions}
                            selectedUser={selectedUser}
                            width={500}
                            height={400}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analysis;