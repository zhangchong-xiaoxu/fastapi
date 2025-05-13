import React, { useState, useEffect } from 'react';
import './NetworkFilters.css';

export interface NetworkFiltersState {
  showGroups: number[];
  minEdgeWeight: number;
  maxNodeDegree: number | null;
  minNodeDegree: number | null;
  showIsolatedNodes: boolean;
}

interface NetworkFiltersProps {
  groups: number[];
  minWeight: number;
  maxWeight: number;
  minDegree: number;
  maxDegree: number;
  onChange: (filters: NetworkFiltersState) => void;
}

const NetworkFilters: React.FC<NetworkFiltersProps> = ({
  groups,
  minWeight,
  maxWeight,
  minDegree,
  maxDegree,
  onChange
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [filters, setFilters] = useState<NetworkFiltersState>({
    showGroups: [...groups],
    minEdgeWeight: minWeight,
    maxNodeDegree: null,
    minNodeDegree: null,
    showIsolatedNodes: true
  });

  // Update filters when props change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      showGroups: [...groups]
    }));
  }, [groups]);

  const handleGroupToggle = (group: number) => {
    const newGroups = filters.showGroups.includes(group)
      ? filters.showGroups.filter(g => g !== group)
      : [...filters.showGroups, group];
    
    updateFilters('showGroups', newGroups);
  };

  const handleSelectAllGroups = () => {
    updateFilters('showGroups', [...groups]);
  };

  const handleClearAllGroups = () => {
    updateFilters('showGroups', []);
  };

  const updateFilters = (key: keyof NetworkFiltersState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onChange(newFilters);
  };

  return (
    <div className={`network-filters ${isExpanded ? 'expanded' : ''}`}>
      <div 
        className="filters-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>网络过滤器</h3>
        <button className="toggle-button">
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      <div className="filters-content">
        <div className="filter-group">
          <div className="filter-group-header">
            <h4>分组</h4>
            <div className="group-actions">
              <button className="action-btn" onClick={handleSelectAllGroups}>全部</button>
              <button className="action-btn" onClick={handleClearAllGroups}>无</button>
            </div>
          </div>
          
          <div className="group-toggles">
            {groups.map(group => (
              <button
                key={group}
                className={`group-toggle ${filters.showGroups.includes(group) ? 'active' : ''}`}
                style={{ backgroundColor: `var(--group-${group % 10})` }}
                onClick={() => handleGroupToggle(group)}
                title={`切换第 ${group} 组`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
        
        <div className="filter-group">
          <h4>边权重</h4>
          <div className="range-filter">
            <span className="range-value">{filters.minEdgeWeight}</span>
            <input
              type="range"
              min={minWeight}
              max={maxWeight}
              step={1}
              value={filters.minEdgeWeight}
              onChange={(e) => updateFilters('minEdgeWeight', parseInt(e.target.value))}
            />
            <span className="range-value">{maxWeight}</span>
          </div>
          <div className="filter-description">
            显示权重 ≥ {filters.minEdgeWeight} 的边
          </div>
        </div>
        
        <div className="filter-group">
          <h4>节点度</h4>
          <div className="checkbox-filter">
            <label>
              <input 
                type="checkbox" 
                checked={filters.minNodeDegree !== null}
                onChange={(e) => updateFilters('minNodeDegree', e.target.checked ? minDegree : null)}
              />
              最小度: 
            </label>
            <input 
              type="number" 
              min={minDegree} 
              max={maxDegree}
              value={filters.minNodeDegree !== null ? filters.minNodeDegree : minDegree}
              onChange={(e) => updateFilters('minNodeDegree', parseInt(e.target.value))}
              disabled={filters.minNodeDegree === null}
            />
          </div>
          
          <div className="checkbox-filter">
            <label>
              <input 
                type="checkbox" 
                checked={filters.maxNodeDegree !== null}
                onChange={(e) => updateFilters('maxNodeDegree', e.target.checked ? maxDegree : null)}
              />
              最大度: 
            </label>
            <input 
              type="number" 
              min={minDegree} 
              max={maxDegree}
              value={filters.maxNodeDegree !== null ? filters.maxNodeDegree : maxDegree}
              onChange={(e) => updateFilters('maxNodeDegree', parseInt(e.target.value))}
              disabled={filters.maxNodeDegree === null}
            />
          </div>
        </div>
        
        <div className="filter-group">
          <h4>其他选项</h4>
          <div className="checkbox-filter">
            <label>
              <input 
                type="checkbox" 
                checked={filters.showIsolatedNodes}
                onChange={(e) => updateFilters('showIsolatedNodes', e.target.checked)}
              />
              显示孤立节点
            </label>
          </div>
        </div>
        
        <div className="filters-actions">
          <button 
            className="reset-btn"
            onClick={() => {
              setFilters({
                showGroups: [...groups],
                minEdgeWeight: minWeight,
                maxNodeDegree: null,
                minNodeDegree: null,
                showIsolatedNodes: true
              });
            }}
          >
            重置过滤器
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkFilters; 