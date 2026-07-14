import React from 'react';
import './Navbar.css';

export default function Navbar({ sidebarCollapsed, setSidebarCollapsed, user, onLogout }) {
  return (
    <header className={`navbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="navbar-left">
        <button 
          className="sidebar-toggle" 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="12" x2="14" y2="12"></line>
              <line x1="4" y1="18" x2="18" y2="18"></line>
            </svg>
          )}
        </button>
        <select className="workspace-select" defaultValue="global">
          <option value="global">Global Talent Pool</option>
          <option value="acme">Acme Corp Workspace</option>
          <option value="startup">Delta Labs Dev Pool</option>
        </select>
      </div>

      <div className="navbar-right">
        <div className="search-box">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input type="text" placeholder="Search professionals, skills..." />
        </div>

        <button className="nav-icon-btn" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="nav-icon-badge"></span>
        </button>

        <div className="user-profile" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="avatar" style={{ 
            background: 'var(--gradient-primary)', 
            color: '#fff', 
            fontWeight: 700 
          }}>
            {user?.email?.substring(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </span>
            <span className="user-role">{user?.role} Portal</span>
          </div>
          <button 
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--text-secondary)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '1rem',
              transition: 'var(--transition-fast)',
              fontFamily: 'var(--font-family)'
            }}
            title="Sign Out of Session"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
