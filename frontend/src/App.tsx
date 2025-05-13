import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import NetworkView from './pages/NetworkView';
import Analysis from './pages/Analysis';
import NetworkComparison from './pages/NetworkComparison';
import DataUpload from './pages/DataUpload';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Import components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <div className="app">
      <Header />
      <div className="app-container">
        <Sidebar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/network" element={<NetworkView />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/comparison" element={<NetworkComparison />} />
            <Route path="/upload" element={<DataUpload />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App; 