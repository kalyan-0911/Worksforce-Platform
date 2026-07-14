import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import EmployerDashboard from './pages/EmployerDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import WorkforceInventory from './pages/WorkforceInventory';
import TeamBuilder from './pages/TeamBuilder';
import WorkforceAnalytics from './pages/WorkforceAnalytics';
import LoginGateway from './pages/LoginGateway';

function App() {
  const [token, setToken] = useState(localStorage.getItem('workforcex_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('workforcex_user')));
  const [activeTab, setActiveTab] = useState('employer');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      setActiveTab(user.role === 'Employer' ? 'employer' : 'professional');
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

  const renderContent = () => {
    switch (activeTab) {
      case 'employer':
        return <EmployerDashboard />;
      case 'professional':
        return <ProfessionalDashboard />;
      case 'inventory':
        return <WorkforceInventory />;
      case 'teambuilder':
        return <TeamBuilder />;
      case 'analytics':
        return <WorkforceAnalytics />;
      default:
        return user?.role === 'Employer' ? <EmployerDashboard /> : <ProfessionalDashboard />;
    }
  };

  if (!token || !user) {
    return <LoginGateway onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Ambient background glow elements */}
      <div className="ambient-glow ambient-glow-1"></div>
      <div className="ambient-glow ambient-glow-2"></div>

      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        sidebarCollapsed={sidebarCollapsed} 
        userRole={user.role}
      />

      {/* Main Layout Area */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar 
          sidebarCollapsed={sidebarCollapsed} 
          setSidebarCollapsed={setSidebarCollapsed} 
          user={user}
          onLogout={handleLogout}
        />
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
