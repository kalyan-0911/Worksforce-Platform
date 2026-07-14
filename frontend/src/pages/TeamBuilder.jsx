import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function TeamBuilder() {
  const [projectTitle, setProjectTitle] = useState('');
  const [roleInput, setRoleInput] = useState('Solutions Architect');
  const [roleSlots, setRoleSlots] = useState(['Solutions Architect', 'Staff Front-End Engineer']);
  
  const [recommendedSquad, setRecommendedSquad] = useState(null);
  const [unassignedSlots, setUnassignedSlots] = useState([]);
  const [averageScore, setAverageScore] = useState(0);
  const [assembling, setAssembling] = useState(false);

  const addRoleSlot = () => {
    if (!roleInput) return;
    setRoleSlots(prev => [...prev, roleInput]);
  };

  const removeRoleSlot = (idxToRemove) => {
    setRoleSlots(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleAssemble = async (e) => {
    e.preventDefault();
    if (!projectTitle) {
      alert('Please enter a project title');
      return;
    }
    if (roleSlots.length === 0) {
      alert('Please add at least one role requirement slot.');
      return;
    }

    setAssembling(true);
    setRecommendedSquad(null);
    setUnassignedSlots([]);

    try {
      const data = await api.recommendSquad({ roles: roleSlots });
      setRecommendedSquad(data.squad);
      setUnassignedSlots(data.unassigned_slots || []);
      setAverageScore(data.average_match_score || 0);
    } catch (err) {
      alert(`Assembly scanning failed: ${err.message}`);
    } finally {
      setAssembling(false);
    }
  };

  const handleDeploy = async () => {
    if (!recommendedSquad || recommendedSquad.length === 0) return;

    try {
      await api.deployTeam({
        name: projectTitle,
        memberIds: recommendedSquad.map(item => item.professional.id)
      });

      alert(`Success!\nAI Recommended squad successfully deployed to project: "${projectTitle}".\nAll allocated members status flagged as ENGAGED.`);
      
      setProjectTitle('');
      setRecommendedSquad(null);
      setUnassignedSlots([]);
      setAverageScore(0);
    } catch (err) {
      alert(`Deployment failed: ${err.message}`);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
          Intelligent Team Builder
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Define project objectives, outline slot criteria, and trigger AI algorithms to auto-assemble optimal squads.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.12fr 1.2fr', gap: '2rem' }}>
        {/* Team Configuration form */}
        <div className="glass-card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AI Squad Configuration</h2>
          <form onSubmit={handleAssemble} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Project Name / Requisition Title</label>
              <input 
                type="text" 
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Liquidity Dashboard Integration"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--glass-border)',
                  color: '#fff',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-family)'
                }}
              />
            </div>

            {/* Role Slots Compiler */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Required Squad Slots Roles</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select 
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--glass-border)',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-family)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Solutions Architect">Solutions Architect</option>
                  <option value="Staff Front-End Engineer">Staff Front-End Engineer</option>
                  <option value="ML Research Scientist">ML Research Scientist</option>
                  <option value="Data Engineer">Data Engineer</option>
                  <option value="Principal Security Analyst">Principal Security Analyst</option>
                  <option value="Staff Solutions Engineer">Staff Solutions Engineer</option>
                </select>
                <button
                  type="button"
                  onClick={addRoleSlot}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--glass-border)',
                    color: '#fff',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  + Add Slot
                </button>
              </div>

              {/* Display compiled slots */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', minHeight: '38px', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px dashed var(--border-color)' }}>
                {roleSlots.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 'auto' }}>No slots configured yet. Add role slots above.</span>
                ) : (
                  roleSlots.map((role, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.65rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem' }}>
                      <span>{role}</span>
                      <button 
                        type="button" 
                        onClick={() => removeRoleSlot(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={assembling}
              style={{
                background: assembling ? 'var(--bg-tertiary)' : 'var(--gradient-primary)',
                border: 'none',
                color: '#fff',
                padding: '0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: assembling ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                transition: 'var(--transition-fast)',
                marginTop: '1rem'
              }}
            >
              {assembling ? 'Running Multi-Criteria Scan...' : 'Assemble Optimal AI Squad'}
            </button>
          </form>
        </div>

        {/* AI Assembly Results */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>AI Match Recommendations</h2>
          
          {assembling && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', gap: '1rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(255,255,255,0.05)',
                borderTopColor: 'var(--accent-cyan)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Mapping role profiles and resolving overlaps...</div>
            </div>
          )}

          {!assembling && !recommendedSquad && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              No squad matches loaded. Configure roles and run auto-assemble.
            </div>
          )}

          {!assembling && recommendedSquad && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6, 182, 212, 0.08)', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>✓ AI Squad Assembly Completed</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{averageScore}% Avg Fit</span>
              </div>

              {unassignedSlots.length > 0 && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', color: '#ef4444', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  <strong>Squad Match Deficits:</strong> No available bench candidates could be aligned to: 
                  <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                    {unassignedSlots.map((slot, idx) => (
                      <li key={idx}>{slot}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recommendedSquad.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No available profiles aligned.</div>
                ) : (
                  recommendedSquad.map((item, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.role_slot} Slot</span>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.15rem' }}>{item.professional.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Original Title: {item.professional.role}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1.05rem' }}>{item.match_score}% Fit</div>
                        <div style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', display: 'inline-block', padding: '0.15rem 0.4rem', borderRadius: '3px', marginTop: '0.25rem', fontWeight: 600 }}>BENCH ALLOCATION</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recommendedSquad.length > 0 && (
                <button 
                  onClick={handleDeploy}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--accent-cyan)',
                    color: 'var(--accent-cyan)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    transition: 'var(--transition-fast)',
                    fontFamily: 'var(--font-family)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(6,182,212,0.08)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Deploy AI Assembled Team
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
