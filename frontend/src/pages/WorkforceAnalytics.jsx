import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function WorkforceAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await api.getAnalytics();
      setAnalytics(stats);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.25rem' }}>Connection/Loading Error</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button 
            onClick={loadAnalytics} 
            style={{
              background: 'var(--gradient-primary)',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'var(--font-family)'
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }}>No Data Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Unable to read metrics summary from the database.</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { label: 'Jan', value: '45%' },
    { label: 'Feb', value: '52%' },
    { label: 'Mar', value: '64%' },
    { label: 'Apr', value: '71%' },
    { label: 'May', value: '82%' },
    { label: 'Jun (Live)', value: analytics.utilizationRate }
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
          Workforce Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Analyze squad utilization, match speeds, bench costs, and platform efficiency.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Squad Allocation Velocity</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-cyan)' }}>4.8 Hours</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>92% faster than hiring</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Active Talent Utilization</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-indigo)' }}>{analytics.utilizationRate}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{analytics.engagedCount} of {analytics.totalProfessionals} assigned</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Bench Cost Optimization</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-purple)' }}>${(analytics.benchCount * 12500).toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Estimated monthly bench spend</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Talent Utilization chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Workforce Utilization Rate (%)</h2>
          
          <div style={{ display: 'flex', height: '200px', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 1rem', borderBottom: '1px solid var(--border-color)', margin: '1rem 0' }}>
            {chartData.map((data, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{data.value}</div>
                <div style={{
                  width: '60%',
                  height: `calc(180px * ${parseFloat(data.value) / 100})`,
                  background: 'var(--gradient-primary)',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  boxShadow: '0px 0px 10px rgba(99, 102, 241, 0.3)',
                  transition: 'height var(--transition-normal)'
                }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{data.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Insights */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AI Efficiency Insights</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>High Liquidity Area</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                React and Python developers have average bench time under 2 days.
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-purple)', fontSize: '0.85rem' }}>Skills Gaps Identified</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Kubernetes Security requisition requirements exceed current staff certifications by 15%.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
