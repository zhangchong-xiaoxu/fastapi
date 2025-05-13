import React from 'react';
import './PredictionResults.css';

export interface PredictionLink {
  source: string | number;
  target: string | number;
  probability: number;
  sourceNode?: Node;
  targetNode?: Node;
}

interface Node {
  id: string;
  name: string;
  group: number;
  [key: string]: any; // 允许其他属性
}

interface PredictionResultsProps {
  predictions: PredictionLink[];
  loading: boolean;
  error: string | null;
  onSelectLink?: (link: PredictionLink) => void;
}

const PredictionResults: React.FC<PredictionResultsProps> = ({
  predictions,
  loading,
  error,
  onSelectLink
}) => {
  if (loading) {
    return (
      <div className="prediction-results">
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Generating predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prediction-results">
        <div className="error-message">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <div className="prediction-results">
        <div className="no-results">
          <p>No predictions available. Try adjusting network parameters or adding more data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-results">
      <h3>Predicted Links</h3>
      <div className="prediction-description">
        <p>
          The following potential connections have been identified using our Graph Neural Network model,
          ranked by probability.
        </p>
      </div>
      <table className="prediction-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Target</th>
            <th>Probability</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((link, index) => (
            <tr key={index} className={link.probability > 0.7 ? 'high-probability' : ''}>
              <td>{link.sourceNode?.name || link.source}</td>
              <td>{link.targetNode?.name || link.target}</td>
              <td>
                <div className="probability-wrapper">
                  <div 
                    className="probability-bar" 
                    style={{ width: `${Math.round(link.probability * 100)}%` }}
                  ></div>
                  <span className="probability-text">{(link.probability * 100).toFixed(1)}%</span>
                </div>
              </td>
              <td>
                <button
                  className="view-link-btn"
                  onClick={() => onSelectLink && onSelectLink(link)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PredictionResults; 