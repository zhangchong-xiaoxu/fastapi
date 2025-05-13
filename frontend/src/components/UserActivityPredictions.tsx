import React, { useState } from 'react';
import './UserActivityPredictions.css';

export interface UserActivityPrediction {
  id: string;
  name: string;
  current_activity: number;
  predicted_activity: number;
  probability: number;
  change: number;
}

interface UserActivityPredictionsProps {
  predictions: UserActivityPrediction[];
  onUserSelect: (user: UserActivityPrediction) => void;
  selectedUser: UserActivityPrediction | null;
}

export const UserActivityPredictions: React.FC<UserActivityPredictionsProps> = ({ 
  predictions, 
  onUserSelect,
  selectedUser
}) => {
  const [sortField, setSortField] = useState<keyof UserActivityPrediction>('predicted_activity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (field: keyof UserActivityPrediction) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPredictions = [...predictions]
    .filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

  const getChangeClass = (change: number) => {
    if (change > 0.1) return 'positive-change';
    if (change < -0.1) return 'negative-change';
    return 'neutral-change';
  };

  return (
    <div className="user-activity-predictions">
      <div className="header">
        <h3>用户活动预测</h3>
        <div className="search-container">
          <input
            type="text"
            placeholder="搜索用户..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>
                用户
                {sortField === 'name' && (
                  <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('current_activity')}>
                当前活跃度
                {sortField === 'current_activity' && (
                  <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('predicted_activity')}>
                预测活跃度
                {sortField === 'predicted_activity' && (
                  <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('change')}>
                变化
                {sortField === 'change' && (
                  <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('probability')}>
                置信度
                {sortField === 'probability' && (
                  <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPredictions.map(user => (
              <tr 
                key={user.id} 
                onClick={() => onUserSelect(user)}
                className={selectedUser?.id === user.id ? 'selected-row' : ''}
              >
                <td>{user.name}</td>
                <td>{user.current_activity.toFixed(2)}</td>
                <td>{user.predicted_activity.toFixed(2)}</td>
                <td className={getChangeClass(user.change)}>
                  {user.change > 0 ? '+' : ''}{user.change.toFixed(2)}
                  {user.change > 0 ? '↑' : user.change < 0 ? '↓' : ''}
                </td>
                <td>{(user.probability * 100).toFixed(1)}%</td>
              </tr>
            ))}
            {sortedPredictions.length === 0 && (
              <tr>
                <td colSpan={5} className="no-results">未找到匹配的用户</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="prediction-info">
        <p>
          <strong>注意：</strong> 预测基于过去30天的用户行为数据和网络关系。置信度表示预测的可靠性。
        </p>
      </div>
    </div>
  );
};

export default UserActivityPredictions; 