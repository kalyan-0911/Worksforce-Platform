import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';

export default function Navbar({ sidebarCollapsed, setSidebarCollapsed, user, onLogout, setActiveTab }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      </div>

      <div className="navbar-right">
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div 
            onClick={() => setShowDropdown(!showDropdown)}
            className="user-profile" 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="avatar" style={{ 
              background: 'var(--gradient-primary)', 
              color: '#ffffff', 
              fontWeight: 700 
            }}>
              {user?.email?.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {user?.candidate?.name || user?.email}
              </span>
              <span className="user-role">{user?.role} Portal</span>
            </div>
          </div>

          {showDropdown && (
            <div className="glass-card" style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
              width: '180px', padding: '0.5rem', zIndex: 9999, display: 'flex',
              flexDirection: 'column', gap: '0.25rem', border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <button 
                onClick={() => { setActiveTab('profile'); setShowDropdown(false); }}
                style={{
                  background: 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)',
                  width: '100%', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                👤 View Profile
              </button>
              <button 
                onClick={onLogout}
                style={{
                  background: 'transparent', border: 'none', padding: '0.5rem 0.75rem',
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444',
                  width: '100%', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                🚪 Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
