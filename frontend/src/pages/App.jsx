import React from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import Analytics from './Analytics.jsx';
import Charts from './Charts.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>CSFloat Tracker</h2>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/charts">Charts</Link>
        </nav>
        <button className="button secondary" onClick={logout}>Logout</button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
};

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route
      path="/dashboard"
      element={(
        <RequireAuth>
          <Layout>
            <Dashboard />
          </Layout>
        </RequireAuth>
      )}
    />
    <Route
      path="/analytics"
      element={(
        <RequireAuth>
          <Layout>
            <Analytics />
          </Layout>
        </RequireAuth>
      )}
    />
    <Route
      path="/charts"
      element={(
        <RequireAuth>
          <Layout>
            <Charts />
          </Layout>
        </RequireAuth>
      )}
    />
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </Routes>
);

export default App;
