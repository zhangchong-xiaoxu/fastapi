import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  isAdmin: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, setIsLoggedIn }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('isAdmin');
      setIsLoggedIn(false);
      navigate('/login');
    };

  return (
    <header>
      <div className="logo">
        <h1>社交网络分析</h1>
      </div>
      <div className="header-actions">
        <Link to="/upload" className="btn">上传数据</Link>
        {isAdmin && (
          <button className="btn" onClick={() => navigate('/users')}>
            用户列表
          </button>
        )}
        <button className="btn logout-btn" onClick={handleLogout}>
          登出
        </button>
      </div>
    </header>
  );
};

export default Header;
