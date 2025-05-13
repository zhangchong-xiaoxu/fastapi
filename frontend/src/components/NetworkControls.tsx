import React from 'react';
import './NetworkControls.css';

export interface NetworkControlsState {
  nodeSize: number;
  linkStrength: number;
  showLabels: boolean;
  highlightCommunities: boolean;
  zoomLevel: number;
  layoutAlgorithm: 'force' | 'radial' | 'circular';
}

interface NetworkControlsProps {
  state: NetworkControlsState;
  onChange: (state: NetworkControlsState) => void;
}

const NetworkControls: React.FC<NetworkControlsProps> = ({ state, onChange }) => {
  const handleChange = (key: keyof NetworkControlsState, value: any) => {
    onChange({ ...state, [key]: value });
  };

  return (
    <div className="network-controls">
      <h3>显示控制</h3>
      
      <div className="control-group">
        <label htmlFor="layoutAlgorithm">布局算法</label>
        <select
          id="layoutAlgorithm"
          value={state.layoutAlgorithm}
          onChange={(e) => handleChange('layoutAlgorithm', e.target.value)}
          className="select-input"
        >
          <option value="force">力导向</option>
          <option value="radial">放射状</option>
          <option value="circular">环形</option>
        </select>
      </div>
      
      <div className="control-group">
        <label htmlFor="nodeSize">节点大小</label>
        <div className="slider-container">
          <input
            type="range"
            id="nodeSize"
            min="1"
            max="10"
            step="0.5"
            value={state.nodeSize}
            onChange={(e) => handleChange('nodeSize', parseFloat(e.target.value))}
          />
          <span className="value">{state.nodeSize}</span>
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="linkStrength">连接强度</label>
        <div className="slider-container">
          <input
            type="range"
            id="linkStrength"
            min="0.1"
            max="1"
            step="0.05"
            value={state.linkStrength}
            onChange={(e) => handleChange('linkStrength', parseFloat(e.target.value))}
          />
          <span className="value">{state.linkStrength.toFixed(2)}</span>
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="showLabels">
          <input
            type="checkbox"
            id="showLabels"
            checked={state.showLabels}
            onChange={(e) => handleChange('showLabels', e.target.checked)}
          />
          显示标签
        </label>
      </div>

      <div className="control-group">
        <label htmlFor="highlightCommunities">
          <input
            type="checkbox"
            id="highlightCommunities"
            checked={state.highlightCommunities}
            onChange={(e) => handleChange('highlightCommunities', e.target.checked)}
          />
          高亮社区
        </label>
      </div>

      <div className="control-group controls-buttons">
        <button 
          onClick={() => handleChange('zoomLevel', Math.min(state.zoomLevel + 0.5, 3))}
          disabled={state.zoomLevel >= 3}
        >
          放大
        </button>
        <button 
          onClick={() => handleChange('zoomLevel', Math.max(state.zoomLevel - 0.5, 0.5))}
          disabled={state.zoomLevel <= 0.5}
        >
          缩小
        </button>
        <button onClick={() => handleChange('zoomLevel', 1)}>
          重置缩放
        </button>
      </div>
    </div>
  );
};

export default NetworkControls; 