import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function EmployerDashboard() {
  const [analytics, setAnalytics] = useState({
    activeProjects: 0,
    openRequisitions: 0,
    utilizationRate: '0.0%'
  });
  const [requisitions, setRequisitions] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [matches, setMatches] = useState([]);
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [stats, reqs, projs] = await Promise.all([
          api.getAnalytics(),
          api.getRequisitions(),
          api.getProjects()
        ]);
        setAnalytics(stats);
        setRequisitions(reqs);
        setProjects(projs);
        
        if (reqs.length > 0) {
          handleSelectRequisition(reqs[0].id);
        }
      } catch (err) {
        console.error('Error fetching initial dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleSelectRequisition = async (reqId) => {
    setLoadingMatches(true);
    try {
      const data = await api.getRequisitionMatches(reqId);
      setSelectedReq(data.requisition);
      setRequiredSkills(data.requiredSkills);
      setMatches(data.matches);
    } catch (err) {
      console.error('Error loading matches for requisition:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
          Employer Command Center
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Monitor your projects, track requisition pipelines, and review AI workforce match insights.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Active Projects</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-indigo)' }}>{analytics.activeProjects}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Live in workspace</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Talent Liquidity Index</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-cyan)' }}>
            {parseFloat(analytics.utilizationRate) > 0 ? (100 - parseFloat(analytics.utilizationRate)).toFixed(1) : '100'}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bench capacity index</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Open Requisitions</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-purple)' }}>{analytics.openRequisitions}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg. match time: 4.8 hrs</div>
        </div>
      </div>

      {/* Two Columns Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        {/* Requisitions Column */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Active Talent Requisitions</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select a requisition to run AI semantic matching recommendations.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requisitions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No open requisitions.</div>
            ) : (
              requisitions.map((req) => {
                const isSelected = selectedReq && selectedReq.id === req.id;
                return (
                  <div 
                    key={req.id} 
                    onClick={() => handleSelectRequisition(req.id)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1rem', 
                      background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)', 
                      borderRadius: 'var(--radius-sm)', 
                      border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{req.role}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.id} • Project: {req.project_name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: req.status === 'Matching' ? 'rgba(6, 182, 212, 0.15)' : req.status === 'Interviewing' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)', color: req.status === 'Matching' ? 'var(--accent-cyan)' : req.status === 'Interviewing' ? 'var(--accent-indigo)' : 'var(--text-secondary)', border: '1px solid currentColor' }}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>AI Match Insights</h2>
            {selectedReq && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Requirements for <strong>{selectedReq.role}</strong> ({selectedReq.id})
              </div>
            )}
          </div>

          {loadingMatches && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <div style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {!loadingMatches && selectedReq && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Skill Requirements list */}
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Required Skills Matrix:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {requiredSkills.map((skill, idx) => (
                    <span key={idx} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Match list */}
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Candidate Compatibility Ranks:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {matches.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      No available candidates found on the bench!
                    </div>
                  ) : (
                    matches.map((candidate) => (
                      <div key={candidate.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{candidate.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{candidate.role}</div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1.05rem' }}>{candidate.matchScore}% Match</div>
                        </div>

                        {/* Overlapping/Missing skills display */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                          {candidate.overlappingSkills.map((skill, idx) => (
                            <span key={idx} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(6, 182, 212, 0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                              {skill}
                            </span>
                          ))}
                          {candidate.missingSkills.map((skill, idx) => (
                            <span key={idx} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deployed Projects & Squad Member lists */}
      <div style={{ marginTop: '2rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-indigo)' }}>Active Deployed Project Squads</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Review the allocations, sizes, and specific members for all currently active client projects.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
            {projects.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                No active projects deployed. Run the AI Team Assembler to deploy a team squad.
              </div>
            ) : (
              projects.map((proj) => (
                <div key={proj.id} style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{proj.name}</div>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderRadius: '4px', border: '1px solid var(--accent-indigo)', fontWeight: 600 }}>
                      {proj.size} Members
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.25rem' }}>
                    Squad Allocations:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {proj.members.map((member) => (
                      <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{member.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{member.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
