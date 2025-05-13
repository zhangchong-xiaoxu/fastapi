import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound: React.FC = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="home-button">Go to Dashboard</Link>
          <Link to="/network" className="network-button">View Network</Link>
        </div>
      </div>
      <div className="not-found-illustration">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="250"
          height="250"
          viewBox="0 0 250 250"
          fill="none"
        >
          <circle cx="125" cy="125" r="120" stroke="#E0E0E0" strokeWidth="2" />
          <circle cx="125" cy="125" r="70" stroke="#4A6EE0" strokeWidth="2" />
          <line x1="55" y1="125" x2="195" y2="125" stroke="#E0E0E0" strokeWidth="2" />
          <line x1="125" y1="55" x2="125" y2="195" stroke="#E0E0E0" strokeWidth="2" />
          
          {/* Nodes */}
          <circle cx="125" cy="125" r="8" fill="#4A6EE0" />
          <circle cx="175" cy="125" r="6" fill="#4A6EE0" />
          <circle cx="150" cy="175" r="6" fill="#4A6EE0" />
          <circle cx="100" cy="175" r="6" fill="#4A6EE0" />
          <circle cx="75" cy="125" r="6" fill="#4A6EE0" />
          <circle cx="100" cy="75" r="6" fill="#4A6EE0" />
          <circle cx="150" cy="75" r="6" fill="#4A6EE0" />
          
          {/* Broken Links */}
          <line x1="125" y1="125" x2="172" y2="125" stroke="#4A6EE0" strokeWidth="2" />
          <line x1="125" y1="125" x2="148" y2="170" stroke="#4A6EE0" strokeWidth="2" />
          <line x1="125" y1="125" x2="102" y2="170" stroke="#4A6EE0" strokeWidth="2" />
          <line x1="125" y1="125" x2="78" y2="125" stroke="#4A6EE0" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="125" y1="125" x2="102" y2="80" stroke="#4A6EE0" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="125" y1="125" x2="148" y2="80" stroke="#4A6EE0" strokeWidth="2" strokeDasharray="4 2" />
        </svg>
      </div>
    </div>
  );
};

export default NotFound; 