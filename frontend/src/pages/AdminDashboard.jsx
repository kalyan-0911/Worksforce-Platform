import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.get('/admin/dashboard');
        setMetrics(data.overview);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: '#ef4444' }}>Admin Access Denied</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
          Platform Administration
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          System Health: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{metrics.system_health}</span>
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Total Registered Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-indigo)' }}>{metrics.users}</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Organizations</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-cyan)' }}>{metrics.organizations}</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Deployed Projects</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-purple)' }}>{metrics.projects}</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Active Job Postings</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: '#10b981' }}>{metrics.jobs}</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Registered Professionals</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: '#f59e0b' }}>{metrics.registered_professionals}</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Marketplace Professionals</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: '#6366f1' }}>{metrics.marketplace_professionals}</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
        <h3 style={{ color: 'var(--text-muted)' }}>Advanced Administration Modules</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Users, Organizations, Professionals, Jobs, Projects, Assessments, Platform Analytics, and Settings will be accessible here in future expansions.
        </p>
      </div>
    </div>
  );
}
