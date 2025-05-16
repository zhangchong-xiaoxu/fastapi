import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import NetworkView from './pages/NetworkView';
import Analysis from './pages/Analysis';
import NetworkComparison from './pages/NetworkComparison';
import DataUpload from './pages/DataUpload';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Login from './pages/Login';

// Import components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UserList from 'pages/User';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');

  return (
    <div className="app">
      {isLoggedIn && <Header isAdmin={isAdmin} setIsLoggedIn={setIsLoggedIn} />}
      <div className="app-container">
        {isLoggedIn && <Sidebar />}
        <main className="content">
          <Routes>
            {!isLoggedIn ? (
              <>
                <Route path="/login" element={<Login mode="login" setIsLoggedIn={setIsLoggedIn} />} />
                <Route path="/signup" element={<Login mode="signup" setIsLoggedIn={setIsLoggedIn} />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/network" element={<NetworkView />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/comparison" element={<NetworkComparison />} />
                <Route path="/upload" element={<DataUpload />} />
                <Route path="/settings" element={<Settings />} />
                {localStorage.getItem('isAdmin') === 'true' && <Route path="/users" element={<UserList />} />}
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
