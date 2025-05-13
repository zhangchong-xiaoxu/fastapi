import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header>
      <div className="logo">
        <h1>社交网络分析</h1>
      </div>
      <div className="header-actions">
        <Link to="/upload" className="btn">上传数据</Link>
      </div>
    </header>
  );
};

export default Header; 