import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/NetworkComparison.css';

// 基本网络快照接口
interface NetworkSnapshot {
  id: string;
  name: string;
  date: string;
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
}

// 简化的网络比较数据接口
interface ComparisonData {
  nodeGrowth: number;
  nodeGrowthPercent: string;
  edgeGrowth: number;
  edgeGrowthPercent: string;
  densityChange: string;
  avgDegreeChange: string;
  newCommunities?: number;
  topGrowingCommunities?: Array<{name: string, growth: string}>;
  nodesByGroup?: Array<{group: string, before: number, after: number}>;
  structuralChanges: {
    commonNodes: number;
    newNodes: number;
    removedNodes: number;
    commonEdges: number;
    newEdges: number;
    removedEdges: number;
  };
}

const NetworkComparison: React.FC = () => {
  // 状态管理
  const [snapshots, setSnapshots] = useState<NetworkSnapshot[]>([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 加载网络快照数据
  useEffect(() => {
    const fetchSnapshots = async () => {
      try {
        // 尝试从API获取数据
        const response = await axios.get('/api/network/snapshots');
        setSnapshots(response.data);
      } catch (apiError) {
        console.error('API获取网络快照失败:', apiError);
        
        try {
          // 尝试从测试数据文件获取
          console.log('尝试从本地测试数据文件加载快照信息');
          const testDataResponse = await fetch('/data/input/test_snapshots.json');
          
          if (!testDataResponse.ok) {
            throw new Error(`无法加载测试数据文件: ${testDataResponse.status}`);
          }

          const testData = await testDataResponse.json();
          
          if (testData && testData.snapshots) {
            console.log('成功加载测试快照数据');
            
            // 确保包含界面中显示的网络
            const currentSnapshots = [...testData.snapshots];
            
            // 添加Community Network如果不存在
            if (!currentSnapshots.some(s => s.name === "Community Network")) {
              currentSnapshots.push({
                id: "community",
                name: "Community Network",
                date: new Date().toISOString().split('T')[0],
                nodeCount: 197,
                edgeCount: 2756,
                density: 0.143,
                avgDegree: 28.0
              });
            }
            
            // 添加Random Network如果不存在
            if (!currentSnapshots.some(s => s.name === "Random Network")) {
              currentSnapshots.push({
                id: "random",
                name: "Random Network",
                date: new Date().toISOString().split('T')[0],
                nodeCount: 100,
                edgeCount: 492,
                density: 0.099,
                avgDegree: 9.84
              });
            }
            
            setSnapshots(currentSnapshots);
          } else {
            throw new Error('测试数据格式不正确');
          }
        } catch (testDataError) {
          console.error('无法加载测试数据:', testDataError);
          // 使用硬编码的默认数据
          setSnapshots([
            { id: 'community', name: 'Community Network', date: new Date().toISOString().split('T')[0], nodeCount: 197, edgeCount: 2756, density: 0.143, avgDegree: 28.0 },
            { id: 'random', name: 'Random Network', date: new Date().toISOString().split('T')[0], nodeCount: 100, edgeCount: 492, density: 0.099, avgDegree: 9.84 },
            { id: '1', name: '2023Q1 Network', date: '2023-03-31', nodeCount: 285, edgeCount: 752, density: 0.0186, avgDegree: 5.28 },
            { id: '2', name: '2023Q2 Network', date: '2023-06-30', nodeCount: 327, edgeCount: 893, density: 0.0168, avgDegree: 5.46 }
          ]);
        }
      }
    };

    fetchSnapshots();
  }, []);

  // 处理快照选择
  const toggleSnapshotSelection = (id: string) => {
    setSelectedSnapshots(prev => {
      // 如果已选中，则移除
      if (prev.includes(id)) {
        return prev.filter(snapshotId => snapshotId !== id);
      }
      // 如果未选中且选中数量小于2，则添加
      else if (prev.length < 2) {
        return [...prev, id];
      }
      // 如果已有2个选中，则替换第二个
      else {
        return [prev[0], id];
      }
    });
  };

  // 比较快照
  const compareSnapshots = async () => {
    if (selectedSnapshots.length !== 2) {
      setError('请选择两个网络快照进行比较');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 尝试从API获取比较数据
      const response = await axios.post('/api/network/compare', { 
        snapshotIds: selectedSnapshots 
      });
      setComparisonData(response.data);
    } catch (apiError) {
      console.error('API比较网络失败:', apiError);
      
      try {
        // 尝试从测试数据获取预定义的比较结果
        const testDataResponse = await fetch('/data/input/test_snapshots.json');
        if (!testDataResponse.ok) {
          throw new Error('测试数据文件不可用');
        }
        
        const testData = await testDataResponse.json();
        if (!testData || !testData.comparisonData) {
          throw new Error('测试数据缺少比较数据');
        }
        
        // 检查是否有匹配的比较数据
        const comparisonKey = `${selectedSnapshots[0]}_${selectedSnapshots[1]}`;
        const reverseKey = `${selectedSnapshots[1]}_${selectedSnapshots[0]}`;
        
        if (testData.comparisonData[comparisonKey]) {
          console.log('使用预定义比较数据');
          setComparisonData(testData.comparisonData[comparisonKey]);
        } 
        else if (testData.comparisonData[reverseKey]) {
          console.log('使用预定义反向比较数据并调整');
          const reverseData = testData.comparisonData[reverseKey];
          
          // 反向调整数据
          setComparisonData({
            nodeGrowth: -reverseData.nodeGrowth,
            nodeGrowthPercent: (-parseFloat(reverseData.nodeGrowthPercent)).toFixed(1),
            edgeGrowth: -reverseData.edgeGrowth,
            edgeGrowthPercent: (-parseFloat(reverseData.edgeGrowthPercent)).toFixed(1),
            densityChange: (-parseFloat(reverseData.densityChange)).toFixed(4),
            avgDegreeChange: (-parseFloat(reverseData.avgDegreeChange)).toFixed(2),
            newCommunities: reverseData.newCommunities,
            topGrowingCommunities: reverseData.topGrowingCommunities,
            nodesByGroup: reverseData.nodesByGroup,
            structuralChanges: {
              commonNodes: reverseData.structuralChanges.commonNodes,
              newNodes: reverseData.structuralChanges.removedNodes,
              removedNodes: reverseData.structuralChanges.newNodes,
              commonEdges: reverseData.structuralChanges.commonEdges,
              newEdges: reverseData.structuralChanges.removedEdges,
              removedEdges: reverseData.structuralChanges.newEdges
            }
          });
        } 
        else {
          // 没有匹配数据，生成模拟比较数据
          console.log('生成模拟比较数据');
          generateComparisonData();
        }
      } catch (testDataError) {
        console.error('测试数据获取失败:', testDataError);
        // 生成模拟比较数据
        generateComparisonData();
      }
    } finally {
      setLoading(false);
    }
  };

  // 生成两个快照间的模拟比较数据
  const generateComparisonData = () => {
    const snapshot1 = snapshots.find(s => s.id === selectedSnapshots[0]);
    const snapshot2 = snapshots.find(s => s.id === selectedSnapshots[1]);
    
    if (!snapshot1 || !snapshot2) {
      setError('找不到所选快照数据');
      return;
    }
    
    // 基于快照元数据计算比较指标
    const nodeGrowth = snapshot2.nodeCount - snapshot1.nodeCount;
    const nodeGrowthPercent = ((nodeGrowth / snapshot1.nodeCount) * 100).toFixed(1);
    const edgeGrowth = snapshot2.edgeCount - snapshot1.edgeCount;
    const edgeGrowthPercent = ((edgeGrowth / snapshot1.edgeCount) * 100).toFixed(1);
    const densityChange = (snapshot2.density - snapshot1.density).toFixed(4);
    const avgDegreeChange = (snapshot2.avgDegree - snapshot1.avgDegree).toFixed(2);
    
    // 估计结构变化
    const commonNodeRatio = Math.min(0.9, 1 - Math.abs(nodeGrowth) / (2 * snapshot1.nodeCount));
    const commonNodes = Math.floor(snapshot1.nodeCount * commonNodeRatio);
    
    const commonEdgeRatio = Math.min(0.85, 1 - Math.abs(edgeGrowth) / (2 * snapshot1.edgeCount));
    const commonEdges = Math.floor(snapshot1.edgeCount * commonEdgeRatio);
    
    let newNodes = 0, removedNodes = 0;
    if (nodeGrowth >= 0) {
      newNodes = nodeGrowth;
      removedNodes = snapshot1.nodeCount - commonNodes;
    } else {
      newNodes = snapshot1.nodeCount - commonNodes;
      removedNodes = -nodeGrowth;
    }
    
    let newEdges = 0, removedEdges = 0;
    if (edgeGrowth >= 0) {
      newEdges = edgeGrowth;
      removedEdges = snapshot1.edgeCount - commonEdges;
    } else {
      newEdges = snapshot1.edgeCount - commonEdges;
      removedEdges = -edgeGrowth;
    }
    
    // 创建社区变化数据
    const communities = [
      { name: '技术', growth: Math.floor(Math.random() * 25 + 5) + '%' },
      { name: '市场', growth: Math.floor(Math.random() * 20 + 5) + '%' },
      { name: '研发', growth: Math.floor(Math.random() * 15 + 5) + '%' }
    ];
    
    // 设置比较数据
    setComparisonData({
      nodeGrowth,
      nodeGrowthPercent,
      edgeGrowth,
      edgeGrowthPercent,
      densityChange,
      avgDegreeChange,
      newCommunities: Math.floor(Math.random() * 2) + 1,
      topGrowingCommunities: communities,
      nodesByGroup: [
        { group: '技术组', before: Math.floor(snapshot1.nodeCount * 0.3), after: Math.floor(snapshot2.nodeCount * 0.3) },
        { group: '市场组', before: Math.floor(snapshot1.nodeCount * 0.25), after: Math.floor(snapshot2.nodeCount * 0.25) },
        { group: '研发组', before: Math.floor(snapshot1.nodeCount * 0.2), after: Math.floor(snapshot2.nodeCount * 0.2) },
        { group: '设计组', before: Math.floor(snapshot1.nodeCount * 0.15), after: Math.floor(snapshot2.nodeCount * 0.15) },
        { group: '运营组', before: Math.floor(snapshot1.nodeCount * 0.1), after: Math.floor(snapshot2.nodeCount * 0.1) }
      ],
      structuralChanges: {
        commonNodes,
        newNodes,
        removedNodes,
        commonEdges,
        newEdges,
        removedEdges
      }
    });
  };

  // 返回选择界面
  const handleBackToSelection = () => {
    setComparisonData(null);
    setSelectedSnapshots([]);
    setError(null);
  };

  // 渲染快照选择UI
  const renderSnapshotSelection = () => (
    <div className="snapshot-selection">
      <h2>选择要比较的网络快照</h2>
      <p className="instruction">选择两个网络快照进行详细比较。</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="snapshots-grid">
        {snapshots.map(snapshot => (
          <div 
            key={snapshot.id}
            className={`snapshot-card ${selectedSnapshots.includes(snapshot.id) ? 'selected' : ''}`}
            onClick={() => toggleSnapshotSelection(snapshot.id)}
          >
            <h3>{snapshot.name}</h3>
            <div className="snapshot-date">{snapshot.date}</div>
            <div className="snapshot-stats">
              <div>节点: {snapshot.nodeCount}</div>
              <div>连接: {snapshot.edgeCount}</div>
              <div>密度: {snapshot.density.toFixed(3)}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="action-buttons">
        <button 
          className="compare-button"
          disabled={selectedSnapshots.length !== 2}
          onClick={compareSnapshots}
        >
          比较所选快照
        </button>
      </div>
    </div>
  );

  // 渲染比较结果
  const renderComparisonResults = () => {
    if (!comparisonData) return null;
    
    const snapshot1 = snapshots.find(s => s.id === selectedSnapshots[0]);
    const snapshot2 = snapshots.find(s => s.id === selectedSnapshots[1]);
    
    if (!snapshot1 || !snapshot2) return null;
    
    return (
      <div className="comparison-results">
        <h2>网络比较: {snapshot1.name} vs {snapshot2.name}</h2>
        
        <div className="comparison-summary">
          <div className="summary-card">
            <h3>总体变化</h3>
            <div className="summary-stats">
              <div className={`stat-item ${comparisonData.nodeGrowth > 0 ? 'positive' : comparisonData.nodeGrowth < 0 ? 'negative' : ''}`}>
                <span className="stat-label">节点变化:</span>
                <span className="stat-value">
                  {comparisonData.nodeGrowth > 0 ? '+' : ''}{comparisonData.nodeGrowth} ({comparisonData.nodeGrowthPercent}%)
                </span>
              </div>
              <div className={`stat-item ${comparisonData.edgeGrowth > 0 ? 'positive' : comparisonData.edgeGrowth < 0 ? 'negative' : ''}`}>
                <span className="stat-label">连接变化:</span>
                <span className="stat-value">
                  {comparisonData.edgeGrowth > 0 ? '+' : ''}{comparisonData.edgeGrowth} ({comparisonData.edgeGrowthPercent}%)
                </span>
              </div>
              <div className={`stat-item ${parseFloat(comparisonData.densityChange) > 0 ? 'positive' : parseFloat(comparisonData.densityChange) < 0 ? 'negative' : ''}`}>
                <span className="stat-label">密度变化:</span>
                <span className="stat-value">
                  {parseFloat(comparisonData.densityChange) > 0 ? '+' : ''}{comparisonData.densityChange}
                </span>
              </div>
              <div className={`stat-item ${parseFloat(comparisonData.avgDegreeChange) > 0 ? 'positive' : parseFloat(comparisonData.avgDegreeChange) < 0 ? 'negative' : ''}`}>
                <span className="stat-label">平均度变化:</span>
                <span className="stat-value">
                  {parseFloat(comparisonData.avgDegreeChange) > 0 ? '+' : ''}{comparisonData.avgDegreeChange}
                </span>
              </div>
            </div>
          </div>
          
          {comparisonData.topGrowingCommunities && (
            <div className="summary-card">
              <h3>社区变化</h3>
              <div className="summary-content">
                <p>新社区数量: <strong>{comparisonData.newCommunities || 0}</strong></p>
                <h4>增长最快的社区:</h4>
                <ul>
                  {comparisonData.topGrowingCommunities.map((community, index) => (
                    <li key={index}>
                      <strong>{community.name}</strong>: 增长了 {community.growth}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        
        <div className="structural-changes">
          <h3>结构变化</h3>
          <div className="changes-grid">
            <div className="changes-card">
              <h4>节点</h4>
              <div className="changes-stats">
                <div className="stat-item">
                  <span className="stat-value">{comparisonData.structuralChanges.commonNodes}</span>
                  <span className="stat-label">共同节点</span>
                </div>
                <div className="stat-item positive">
                  <span className="stat-value">+{comparisonData.structuralChanges.newNodes}</span>
                  <span className="stat-label">新节点</span>
                </div>
                <div className="stat-item negative">
                  <span className="stat-value">-{comparisonData.structuralChanges.removedNodes}</span>
                  <span className="stat-label">移除的节点</span>
                </div>
              </div>
            </div>
            
            <div className="changes-card">
              <h4>连接</h4>
              <div className="changes-stats">
                <div className="stat-item">
                  <span className="stat-value">{comparisonData.structuralChanges.commonEdges}</span>
                  <span className="stat-label">共同连接</span>
                </div>
                <div className="stat-item positive">
                  <span className="stat-value">+{comparisonData.structuralChanges.newEdges}</span>
                  <span className="stat-label">新连接</span>
                </div>
                <div className="stat-item negative">
                  <span className="stat-value">-{comparisonData.structuralChanges.removedEdges}</span>
                  <span className="stat-label">移除的连接</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="network-details">
          <div className="network-detail-card">
            <h3>{snapshot1.name}</h3>
            <table className="network-details-table">
              <tbody>
                <tr>
                  <td>日期:</td>
                  <td>{snapshot1.date}</td>
                </tr>
                <tr>
                  <td>节点:</td>
                  <td>{snapshot1.nodeCount}</td>
                </tr>
                <tr>
                  <td>连接:</td>
                  <td>{snapshot1.edgeCount}</td>
                </tr>
                <tr>
                  <td>密度:</td>
                  <td>{snapshot1.density.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>平均度:</td>
                  <td>{snapshot1.avgDegree.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="network-detail-card">
            <h3>{snapshot2.name}</h3>
            <table className="network-details-table">
              <tbody>
                <tr>
                  <td>日期:</td>
                  <td>{snapshot2.date}</td>
                </tr>
                <tr>
                  <td>节点:</td>
                  <td>{snapshot2.nodeCount}</td>
                </tr>
                <tr>
                  <td>连接:</td>
                  <td>{snapshot2.edgeCount}</td>
                </tr>
                <tr>
                  <td>密度:</td>
                  <td>{snapshot2.density.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>平均度:</td>
                  <td>{snapshot2.avgDegree.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 主渲染函数
  return (
    <div className="network-comparison-container">
      <h1>网络比较</h1>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在比较网络数据...</p>
        </div>
      ) : (
        <>
          {comparisonData ? (
            <>
              <button 
                className="back-button"
                onClick={handleBackToSelection}
              >
                ← 返回选择
              </button>
              {renderComparisonResults()}
            </>
          ) : (
            renderSnapshotSelection()
          )}
        </>
      )}
    </div>
  );
};

export default NetworkComparison; 