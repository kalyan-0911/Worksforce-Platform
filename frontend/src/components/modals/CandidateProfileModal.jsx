import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function CandidateProfileModal({ candidateId, matchInfo, requisition, onClose }) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getProfessionalById(candidateId);
        setCandidate(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (candidateId) loadProfile();
  }, [candidateId]);

  if (!candidateId) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'var(--bg-tertiary)', zIndex: 9999, overflowY: 'auto',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Header Bar */}
      <div style={{ 
        position: 'sticky', top: 0, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-color)', padding: '1rem 3rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-indigo)' }}>
          Candidate Profile Overview
        </div>
        <button onClick={onClose} style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '50%',
          width: '36px', height: '36px', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease'
        }}>✕</button>
      </div>

      <div style={{ padding: '2rem 3rem', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
            <div style={{ width: 50, height: 50, border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent-indigo)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Loading Professional Profile...</span>
          </div>
        ) : error ? (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '4rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
            Error loading profile: {error}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
            
            {/* Main Content Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Profile Header Card */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2.5rem' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%', background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '3rem', color: '#fff', fontWeight: 800, boxShadow: 'var(--shadow-md)'
                }}>
                  {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-1px' }}>{candidate.name}</h1>
                  <div style={{ color: 'var(--accent-indigo)', fontSize: '1.3rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    {candidate.role || candidate.title || 'Professional'}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      📍 {candidate.location || 'Remote Available'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      💼 {candidate.experience || 'Not specified'} experience
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🏢 {candidate.industry || 'Tech'} Domain
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Match Panel */}
              {matchInfo && (
                <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(147,51,234,0.05) 100%)', borderLeft: '4px solid var(--accent-indigo)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-indigo)', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ✨ AI Match Intelligence
                    </h3>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>{matchInfo.score}% Fit</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {matchInfo.explanation || "The AI model has determined this candidate is a strong semantic fit for the requisition requirements."}
                  </p>
                </div>
              )}

              {/* Professional Summary */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Professional Summary</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {candidate.summary || "A highly capable professional ready for deployment. Further detailed experience history is currently being compiled from parsed resume artifacts."}
                </p>
              </div>

              {/* Education & Experience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Education & Training</h3>
                  {candidate.education ? (
                    <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{candidate.education.degree} in {candidate.education.major}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{candidate.education.university}</div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No education details provided.</div>
                  )}
                </div>

                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Work Experience</h3>
                  {candidate.experience_history && candidate.experience_history.length > 0 ? (
                    candidate.experience_history.map((exp, i) => (
                      <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{exp.title} at {exp.company}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{exp.duration}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Work history is being compiled.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Sidebar Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Status & Readiness */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Deployment Status</h3>
                
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center',
                  background: candidate.status === 'Bench' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: candidate.status === 'Bench' ? '#10b981' : '#ef4444', border: `1px solid ${candidate.status === 'Bench' ? '#10b981' : '#ef4444'}`
                }}>
                  {candidate.status === 'Bench' ? '● Available for Deployment' : '● Currently Assigned'}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Career Readiness</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>{candidate.readiness_score || 80}/100</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${candidate.readiness_score || 80}%`, background: 'var(--gradient-primary)' }} />
                  </div>
                </div>
              </div>

              {/* Skills & Badges */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Verified Skills & Badges</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {candidate.skills && candidate.skills.length > 0 ? candidate.skills.map((s, i) => {
                    const name = typeof s === 'string' ? s : s.name;
                    const verified = typeof s === 'string' ? true : s.verified;
                    return (
                      <span key={i} style={{ 
                        background: verified ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', 
                        padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, 
                        color: verified ? '#10b981' : 'var(--text-primary)', 
                        border: verified ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)' 
                      }}>
                        {name} {verified && '✓'}
                      </span>
                    );
                  }) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No skills recorded.</span>
                  )}
                </div>
              </div>

              {/* Training Track */}
              {candidate.training && (
                <div className="glass-card">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Training Track</h3>
                  <div style={{ fontWeight: 700, color: 'var(--accent-indigo)', fontSize: '0.95rem' }}>{candidate.training.track}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cohort: {candidate.training.cohort_code}</div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      <span>Progress</span><span>{candidate.training.progress_percentage || 0}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${candidate.training.progress_percentage || 0}%`, background: 'var(--gradient-primary)' }} />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
