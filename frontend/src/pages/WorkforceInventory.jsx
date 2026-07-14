import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function WorkforceInventory() {
  const [professionals, setProfessionals] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [analytics, setAnalytics] = useState({
    totalProfessionals: 0,
    benchCount: 0,
    utilizationRate: '0.0%'
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [talent, stats] = await Promise.all([
        api.getProfessionals(),
        api.getAnalytics()
      ]);
      setProfessionals(talent);
      setAnalytics(stats);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMatchAI = async (prof) => {
    try {
      const response = await api.createRequisition({
        role: prof.role,
        project_name: 'AI Auto-Match Squad',
        status: 'Matching',
        match_score: prof.readiness_score + '%'
      });
      alert(`AI Match Engine Active!\nCreated active requisition ${response.id} for ${prof.name} (${prof.role}) with ${prof.readiness_score}% compatibility score.`);
      loadData();
    } catch (err) {
      alert(`AI Match failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const filteredProfessionals = professionals.filter(prof => {
    const term = filterText.toLowerCase();
    return (
      prof.name.toLowerCase().includes(term) ||
      prof.role.toLowerCase().includes(term) ||
      prof.skills.some(skill => skill.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
          Workforce Inventory
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          View, search, and manage candidate details across the enterprise talent pool.
        </p>
      </div>

      {/* Filter and stats row */}
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <input 
            type="text" 
            placeholder="Filter by skill, role, or name..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
              outline: 'none',
              flex: 1
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total Profiles: </span>
            <span style={{ fontWeight: 700 }}>{analytics.totalProfessionals}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Available (Bench): </span>
            <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{analytics.benchCount}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Engagement Rate: </span>
            <span style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>{analytics.utilizationRate}</span>
          </div>
        </div>
      </div>

      {/* Talent List Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredProfessionals.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No professionals match your query.</div>
        ) : (
          filteredProfessionals.map((prof, idx) => (
            <div key={idx} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr', alignItems: 'center', gap: '1rem' }}>
              {/* Professional Identity */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{prof.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{prof.role}</div>
              </div>

              {/* Skills tags */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {prof.skills.map((skill, sIdx) => (
                  <span key={sIdx} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    {skill}
                  </span>
                ))}
              </div>

              {/* Status */}
              <div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  background: prof.status === 'Bench' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                  color: prof.status === 'Bench' ? 'var(--accent-cyan)' : 'var(--accent-indigo)',
                  border: '1px solid currentColor'
                }}>
                  {prof.status}
                </span>
              </div>

              {/* Readiness Index */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Readiness</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{prof.readiness_score}%</div>
              </div>

              {/* Actions */}
              <div style={{ textAlign: 'right' }}>
                <button 
                  onClick={() => handleMatchAI(prof)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--accent-indigo)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Match AI
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
