import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Charts from './pages/Charts';
import ImportInventory from './pages/ImportInventory';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const Protected = ({ children }: { children: JSX.Element }) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Navbar />
        <main className="app-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/analytics"
              element={
                <Protected>
                  <Analytics />
                </Protected>
              }
            />
            <Route
              path="/charts"
              element={
                <Protected>
                  <Charts />
                </Protected>
              }
            />
            <Route
              path="/import"
              element={
                <Protected>
                  <ImportInventory />
                </Protected>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
