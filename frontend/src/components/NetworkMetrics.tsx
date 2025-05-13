import React, { useState } from 'react';
import './NetworkMetrics.css';

interface NetworkMetricsProps {
  metrics: {
    node_count: number;
    edge_count: number;
    density: number;
    average_degree: number;
    diameter?: number;
    largest_component_size?: number;
    communities?: {
      count: number;
      distribution: number[];
    };
    degree_distribution?: {
      min: number;
      max: number;
      average: number;
      distribution: number[];
    };
    centrality?: {
      highest_betweenness: { id: string; name: string; value: number }[];
      highest_closeness: { id: string; name: string; value: number }[];
      highest_degree: { id: string; name: string; value: number }[];
    };
  };
}

const NetworkMetrics: React.FC<NetworkMetricsProps> = ({ metrics }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'centrality'>('basic');

  const renderBasicMetrics = () => (
    <table className="stats-table">
      <tbody>
        <tr>
          <td>节点数:</td>
          <td>{metrics.node_count}</td>
        </tr>
        <tr>
          <td>边数:</td>
          <td>{metrics.edge_count}</td>
        </tr>
        <tr>
          <td>密度:</td>
          <td>{metrics.density.toFixed(4)}</td>
        </tr>
        <tr>
          <td>平均度:</td>
          <td>{metrics.average_degree.toFixed(2)}</td>
        </tr>
        {metrics.diameter && (
          <tr>
            <td>直径:</td>
            <td>{metrics.diameter}</td>
          </tr>
        )}
        {metrics.largest_component_size && (
          <tr>
            <td>最大连通分量:</td>
            <td>{metrics.largest_component_size} 个节点</td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderAdvancedMetrics = () => (
    <div className="advanced-metrics">
      {metrics.communities && (
        <div className="metric-group">
          <h4>社区结构</h4>
          <p>检测到的社区: <strong>{metrics.communities.count}</strong></p>
          
          <div className="distribution-chart">
            <h5>社区大小分布</h5>
            <div className="bar-chart">
              {metrics.communities.distribution.map((size, idx) => (
                <div key={idx} className="bar-container">
                  <div 
                    className="bar" 
                    style={{ 
                      height: `${Math.min(100, (size / Math.max(...metrics.communities!.distribution)) * 100)}%`,
                      backgroundColor: `var(--group-${idx % 10})`
                    }}
                  ></div>
                  <div className="bar-label">{idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {metrics.degree_distribution && (
        <div className="metric-group">
          <h4>度分布</h4>
          <p>
            最小值: <strong>{metrics.degree_distribution.min}</strong>, 
            最大值: <strong>{metrics.degree_distribution.max}</strong>, 
            平均值: <strong>{metrics.degree_distribution.average.toFixed(2)}</strong>
          </p>
          
          <div className="distribution-chart">
            <div className="bar-chart horizontal">
              {metrics.degree_distribution.distribution.map((count, degree) => (
                count > 0 && (
                  <div key={degree} className="bar-row">
                    <div className="bar-label">{degree}</div>
                    <div className="bar-container">
                      <div 
                        className="bar" 
                        style={{ 
                          width: `${Math.min(100, (count / Math.max(...metrics.degree_distribution!.distribution)) * 100)}%`
                        }}
                      ></div>
                      <span className="bar-value">{count}</span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCentralityMetrics = () => (
    <div className="centrality-metrics">
      {metrics.centrality && (
        <>
          <div className="metric-group">
            <h4>最高度中心性</h4>
            <div className="centrality-list">
              {metrics.centrality.highest_degree.map((node, idx) => (
                <div key={idx} className="centrality-item">
                  <div className="rank">{idx + 1}</div>
                  <div className="node-name">{node.name}</div>
                  <div className="node-value">
                    {typeof node.value === 'number' 
                      ? Number.isInteger(node.value) ? node.value : node.value.toFixed(2)
                      : node.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="metric-group">
            <h4>最高介数中心性</h4>
            <div className="centrality-list">
              {metrics.centrality.highest_betweenness.map((node, idx) => (
                <div key={idx} className="centrality-item">
                  <div className="rank">{idx + 1}</div>
                  <div className="node-name">{node.name}</div>
                  <div className="node-value">
                    {typeof node.value === 'number' 
                      ? node.value.toFixed(4)
                      : node.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="metric-group">
            <h4>最高接近中心性</h4>
            <div className="centrality-list">
              {metrics.centrality.highest_closeness.map((node, idx) => (
                <div key={idx} className="centrality-item">
                  <div className="rank">{idx + 1}</div>
                  <div className="node-name">{node.name}</div>
                  <div className="node-value">
                    {typeof node.value === 'number' 
                      ? node.value.toFixed(4)
                      : node.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="network-metrics-panel">
      <h3>网络分析</h3>
      
      <div className="metrics-tabs">
        <button 
          className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          基本
        </button>
        <button 
          className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          高级
        </button>
        
      </div>
      
      <div className="metrics-content">
        {activeTab === 'basic' && renderBasicMetrics()}
        {activeTab === 'advanced' && renderAdvancedMetrics()}
       
      </div>
    </div>
  );
};

export default NetworkMetrics; 