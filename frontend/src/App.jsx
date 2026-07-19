import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import EmployerDashboard from './pages/EmployerDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import JobMarket from './pages/JobMarket';
import WorkforceInventory from './pages/WorkforceInventory';
import LoginGateway from './pages/LoginGateway';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

function AppLayout({ user, handleLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('');
  
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/profile')) setActiveTab('profile');
    else if (path.includes('/admin/inventory')) setActiveTab('inventory');
    else if (path.includes('/marketplace')) setActiveTab('marketplace');
    else setActiveTab(path.split('/')[1] || '');
  }, [location]);

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        userRole={user.role}
      />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          user={user}
          onLogout={handleLogout}
          setActiveTab={setActiveTab}
        />
        <Routes>
          <Route path="/profile" element={<ProfilePage user={user} />} />
          
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['Admin']}><WorkforceInventory /></ProtectedRoute>} />
          
          <Route path="/employer/*" element={<ProtectedRoute allowedRoles={['Employer']}><EmployerDashboard activeTab={activeTab} setActiveTab={setActiveTab} /></ProtectedRoute>} />
          
          <Route path="/professional" element={<ProtectedRoute allowedRoles={['Professional']}><ProfessionalDashboard activeTab={activeTab} setActiveTab={setActiveTab} /></ProtectedRoute>} />
          <Route path="/professional/marketplace" element={<ProtectedRoute allowedRoles={['Professional']}><JobMarket /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to={`/${user.role.toLowerCase()}`} replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('workforcex_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('workforcex_user')); }
    catch { return null; }
  });
  const navigate = useNavigate();

  const handleLoginSuccess = (newToken, newRefreshToken, newUser) => {
    localStorage.setItem('workforcex_token', newToken);
    if (newRefreshToken) localStorage.setItem('workforcex_refresh_token', newRefreshToken);
    localStorage.setItem('workforcex_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    navigate(`/${newUser.role.toLowerCase()}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('workforcex_token');
    localStorage.removeItem('workforcex_refresh_token');
    localStorage.removeItem('workforcex_user');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  if (!token || !user) {
    return (
      <div className="app-container">
        <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } }} />
        <div className="ambient-glow ambient-glow-1" />
        <div className="ambient-glow ambient-glow-2" />
        <LoginGateway onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } }} />
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <AppLayout user={user} handleLogout={handleLogout} />
    </div>
  );
}

export default App;
