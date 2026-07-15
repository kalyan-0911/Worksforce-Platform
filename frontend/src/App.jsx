import { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import EmployerDashboard from './pages/EmployerDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import JobMarket from './pages/JobMarket';
import WorkforceInventory from './pages/WorkforceInventory';
import LoginGateway from './pages/LoginGateway';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import { Toaster } from 'react-hot-toast';

function App() {
  const [token, setToken] = useState(localStorage.getItem('workforcex_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('workforcex_user')); }
    catch { return null; }
  });
  const [activeTab, setActiveTab] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'Admin') setActiveTab('admin');
      else if (user.role === 'Employer') setActiveTab('employer');
      else setActiveTab('professional');
    }
  }, [user]);

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('workforcex_token', newToken);
    localStorage.setItem('workforcex_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('workforcex_token');
    localStorage.removeItem('workforcex_user');
    setToken(null);
    setUser(null);
  };

  const refreshUserData = async () => {
    try {
      const updatedUser = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('workforcex_token')}` }
      }).then(r => r.json());
      if (updatedUser && !updatedUser.error) {
        localStorage.setItem('workforcex_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch(e) { console.error(e); }
  };

  const renderContent = () => {
    if (activeTab === 'profile') {
      return <ProfilePage user={user} onProfileUpdate={refreshUserData} />;
    }

    // Admin routes
    if (user?.role === 'Admin') {
      if (activeTab === 'inventory') return <WorkforceInventory />;
      return <AdminDashboard />;
    }
    // Employer routes
    if (user?.role === 'Employer') {
      return <EmployerDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    }
    // Professional routes
    if (activeTab === 'marketplace') return <JobMarket />;
    return <ProfessionalDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
  };

  if (!token || !user) {
    return <LoginGateway onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } }} />
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
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
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
