import React, { useState, useEffect, useRef } from 'react';
import './NetworkSearch.css';

interface NetworkNode {
  id: string;
  name: string;
  group: number;
}

interface NetworkSearchProps {
  nodes: NetworkNode[];
  onSelectNode: (node: NetworkNode) => void;
}

const NetworkSearch: React.FC<NetworkSearchProps> = ({ nodes, onSelectNode }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NetworkNode[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter nodes based on search term
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const results = nodes.filter(
      node => 
        node.name.toLowerCase().includes(lowerSearchTerm) || 
        node.id.toLowerCase().includes(lowerSearchTerm)
    ).slice(0, 10); // Limit to 10 results

    setSearchResults(results);
  }, [searchTerm, nodes]);

  useEffect(() => {
    // Close search results when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Element)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectNode = (node: NetworkNode) => {
    onSelectNode(node);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div className="network-search" ref={searchRef}>
      <div className="search-input-container">
        <input
          type="text"
          placeholder="搜索节点..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search" 
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map(node => (
            <div 
              key={node.id} 
              className="search-result-item"
              onClick={() => handleSelectNode(node)}
            >
              <span 
                className="result-color" 
                style={{ backgroundColor: `var(--group-${node.group % 10})` }}
              ></span>
              <span className="result-name">{node.name}</span>
              <span className="result-id">{node.id}</span>
            </div>
          ))}
        </div>
      )}

      {showResults && searchTerm && searchResults.length === 0 && (
        <div className="search-results">
          <div className="no-results">未找到节点</div>
        </div>
      )}
    </div>
  );
};

export default NetworkSearch; 