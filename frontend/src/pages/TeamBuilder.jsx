import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function TeamBuilder() {
  const [professionals, setProfessionals] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [targetRole, setTargetRole] = useState('Solutions Architect');
  const [simulatedTeam, setSimulatedTeam] = useState(null);
  const [assembling, setAssembling] = useState(false);

  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        const talent = await api.getProfessionals();
        setProfessionals(talent);
      } catch (err) {
        console.error('Error fetching talent profiles:', err);
      }
    };
    loadProfessionals();
  }, []);

  const handleAssemble = (e) => {
    e.preventDefault();
    if (!projectTitle) {
      alert('Please enter a project title');
      return;
    }

    setAssembling(true);
    setSimulatedTeam(null);

    setTimeout(() => {
      const benchTalent = professionals.filter(t => t.status === 'Bench');

      const sortedMatches = [...benchTalent].sort((a, b) => {
        const aIsRole = a.role === targetRole ? 1 : 0;
        const bIsRole = b.role === targetRole ? 1 : 0;
        if (aIsRole !== bIsRole) return bIsRole - aIsRole;
        return b.readiness_score - a.readiness_score;
      });

      const team = sortedMatches.slice(0, teamSize);

      setSimulatedTeam(team);
      setAssembling(false);
    }, 1200);
  };

  const handleDeploy = async () => {
    if (!simulatedTeam || simulatedTeam.length === 0) return;

    try {
      await api.deployTeam({
        name: projectTitle,
        size: simulatedTeam.length,
        memberIds: simulatedTeam.map(m => m.id)
      });

      alert(`Success!\nDeployed squad to active project: "${projectTitle}".\nAll team members updated from Bench to Engaged status.`);
      
      setProjectTitle('');
      setSimulatedTeam(null);
      const talent = await api.getProfessionals();
      setProfessionals(talent);
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
          Define project objectives, select resource profiles, and let AI assemble optimal, ready-to-deploy squads.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Team Configuration form */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Team Assembly Configuration</h2>
          <form onSubmit={handleAssemble} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Project Name / Requisition Title</label>
              <input 
                type="text" 
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. NeuralCore ML Integration"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Required Team Size</label>
                <input 
                  type="number" 
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value) || 3)}
                  min="1"
                  max="5"
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Lead Core Competency</label>
                <select 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{
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
              {assembling ? 'Analyzing matches...' : 'Assemble optimal team'}
            </button>
          </form>
        </div>

        {/* AI Assembly Results */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>AI Match Recommendations</h2>
          
          {assembling && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', gap: '1rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(255,255,255,0.05)',
                borderTopColor: 'var(--accent-cyan)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Scanning active benches and assessment profiles...</div>
            </div>
          )}

          {!assembling && !simulatedTeam && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              No team configuration submitted. Fill out the form to generate suggestions.
            </div>
          )}

          {!assembling && simulatedTeam && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {simulatedTeam.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No available candidates found on the bench!
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.08)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                    ✓ Assembled {simulatedTeam.length} members with optimal skill indexing
                  </div>

                  {simulatedTeam.map((member, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{member.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.role}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{member.readiness_score}% Fit</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)' }}>{member.status}</div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={handleDeploy}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--accent-cyan)',
                      color: 'var(--accent-cyan)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(6,182,212,0.06)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Deploy Team to Active Project
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
