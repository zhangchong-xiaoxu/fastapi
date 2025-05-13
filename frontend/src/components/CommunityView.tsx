import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import './CommunityView.css';

interface Community {
  id: string;
  name: string;
  size: number;
  density: number;
  avgDegree: number;
  keyNodes: string[];
}

interface CommunityViewProps {
  communities: Community[];
  onSelectCommunity: (communityId: string | null) => void;
  selectedCommunity: string | null;
}

const CommunityView: React.FC<CommunityViewProps> = ({
  communities,
  onSelectCommunity,
  selectedCommunity
}) => {
  const [sortKey, setSortKey] = useState<keyof Community>('size');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: keyof Community) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedCommunities = [...communities].sort((a, b) => {
    const valueA = a[sortKey];
    const valueB = b[sortKey];
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection === 'asc' 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    } else {
      // Numeric values
      return sortDirection === 'asc' 
        ? (valueA as number) - (valueB as number) 
        : (valueB as number) - (valueA as number);
    }
  });

  return (
    <div className="community-view">
      <div className="community-header">
        <h3>社区结构</h3>
        <div className="community-stats">
          <div className="stat-item">
            <span className="stat-value">{communities.length}</span>
            <span className="stat-label">社区数量</span>
          </div>
        </div>
      </div>

      <div className="community-table-container">
        <table className="community-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className={sortKey === 'name' ? `sorted-${sortDirection}` : ''}>
                社区名称
                {sortKey === 'name' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('size')} className={sortKey === 'size' ? `sorted-${sortDirection}` : ''}>
                大小
                {sortKey === 'size' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('density')} className={sortKey === 'density' ? `sorted-${sortDirection}` : ''}>
                密度
                {sortKey === 'density' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('avgDegree')} className={sortKey === 'avgDegree' ? `sorted-${sortDirection}` : ''}>
                平均度
                {sortKey === 'avgDegree' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCommunities.map(community => (
              <tr 
                key={community.id}
                className={selectedCommunity === community.id ? 'selected' : ''}
                onClick={() => onSelectCommunity(selectedCommunity === community.id ? null : community.id)}
              >
                <td>{community.name}</td>
                <td>{community.size}</td>
                <td>{community.density.toFixed(3)}</td>
                <td>{community.avgDegree.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCommunity && (
        <div className="community-detail">
          <h4>关键节点</h4>
          <div className="key-nodes-list">
            {communities.find(c => c.id === selectedCommunity)?.keyNodes.map((node, index) => (
              <div key={index} className="key-node-item">
                {node}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityView; 