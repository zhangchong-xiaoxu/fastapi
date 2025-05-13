import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <nav>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
              仪表盘
            </NavLink>
          </li>
          <li>
            <NavLink to="/network" className={({ isActive }) => isActive ? 'active' : ''}>
              网络视图
            </NavLink>
          </li>
          <li>
            <NavLink to="/analysis" className={({ isActive }) => isActive ? 'active' : ''}>
              分析
            </NavLink>
          </li>
          <li>
            <NavLink to="/comparison" className={({ isActive }) => isActive ? 'active' : ''}>
              网络比较
            </NavLink>
          </li>
          <li>
            <NavLink to="/upload" className={({ isActive }) => isActive ? 'active' : ''}>
              上传数据
            </NavLink>
          </li>
          
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar; 