import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './NodeDetail.css';

interface Node {
  id: string;
  name: string;
  group: number;
}

interface NodeDetailProps {
  node: Node;
}

interface NodeMetrics {
  degree: number;
  betweenness?: number;
  closeness?: number;
  eigenvector?: number;
  connections: {
    id: string;
    name: string;
    weight: number;
  }[];
}

const NodeDetail: React.FC<NodeDetailProps> = ({ node }) => {
  const [nodeMetrics, setNodeMetrics] = useState<NodeMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchNodeMetrics = async () => {
      if (!node) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`/api/network/node/${node.id}/metrics`);
        setNodeMetrics(response.data);
      } catch (error) {
        console.error('Error fetching node metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNodeMetrics();
  }, [node]);

  return (
    <div className="node-detail-panel">
      <h3>Node Details</h3>
      <table className="stats-table">
        <tbody>
          <tr>
            <td>ID:</td>
            <td>{node.id}</td>
          </tr>
          <tr>
            <td>Name:</td>
            <td>{node.name}</td>
          </tr>
          <tr>
            <td>Group:</td>
            <td>
              <span 
                className="color-circle" 
                style={{ backgroundColor: `var(--group-${node.group % 10})` }}
              ></span>
              {node.group}
            </td>
          </tr>
        </tbody>
      </table>

      {loading && <div className="loading-indicator">Loading metrics...</div>}
      
      {nodeMetrics && (
        <>
          <h4>Centrality Metrics</h4>
          <table className="stats-table">
            <tbody>
              <tr>
                <td>Degree:</td>
                <td>{nodeMetrics.degree}</td>
              </tr>
              {nodeMetrics.betweenness !== undefined && (
                <tr>
                  <td>Betweenness:</td>
                  <td>{nodeMetrics.betweenness.toFixed(4)}</td>
                </tr>
              )}
              {nodeMetrics.closeness !== undefined && (
                <tr>
                  <td>Closeness:</td>
                  <td>{nodeMetrics.closeness.toFixed(4)}</td>
                </tr>
              )}
              {nodeMetrics.eigenvector !== undefined && (
                <tr>
                  <td>Eigenvector:</td>
                  <td>{nodeMetrics.eigenvector.toFixed(4)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {nodeMetrics.connections && nodeMetrics.connections.length > 0 && (
            <>
              <h4>Connections ({nodeMetrics.connections.length})</h4>
              <div className="connections-list">
                {nodeMetrics.connections.map(conn => (
                  <div key={conn.id} className="connection-item">
                    <span className="connection-name">{conn.name}</span>
                    <span className="connection-weight">Weight: {conn.weight}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default NodeDetail; 