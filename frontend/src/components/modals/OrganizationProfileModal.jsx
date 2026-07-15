import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function OrganizationProfileModal({ organizationId, recommendationInfo, onClose }) {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getOrganizationById(organizationId);
        setOrg(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (organizationId) loadProfile();
  }, [organizationId]);

  if (!organizationId) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div className="glass-card" style={{
        width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', padding: '2rem'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem', background: 'transparent',
          border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer'
        }}>×</button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Organization Details...</div>
        ) : error ? (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>Error loading profile: {error}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{org.company_name}</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                  {org.industry || 'Technology'} • {org.location || 'Global Remote'}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {org.verified && (
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid currentColor' }}>
                      ✓ Verified Employer
                    </span>
                  )}
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                    {org.company_size || 'Scaling'} Organization
                  </span>
                </div>
              </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button style={{
                    background: 'var(--gradient-primary)', border: 'none', color: 'white',
                    padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600
                  }}>View Open Roles</button>
                </div>
            </div>

            {/* AI Match Panel */}
            {recommendationInfo && (
              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--accent-purple)', margin: 0 }}>🤖 AI Career Match</h3>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{recommendationInfo.score}% Fit</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {recommendationInfo.explanation || "This organization strongly aligns with your verified skills and career progression trajectory."}
                </p>
              </div>
            )}

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>About the Company</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {org.description || `A dynamic organization operating in the ${org.industry} sector, actively seeking top-tier talent to drive platform innovation.`}
                  </p>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Core Tech Stack</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {org.tech_stack && org.tech_stack.length > 0 ? org.tech_stack.map((tech, i) => (
                      <span key={i} style={{ background: 'rgba(0,0,0,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                        {tech}
                      </span>
                    )) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not disclosed publicly.</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Company Overview</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {org.company_size && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Company Size</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{org.company_size}</span>
                    </div>
                  )}
                  {org.location && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Location</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{org.location}</span>
                    </div>
                  )}
                  {org.hiring_status && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hiring Status</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: org.hiring_status === 'Active' ? '#10b981' : 'var(--text-secondary)' }}>{org.hiring_status}</span>
                    </div>
                  )}
                  {org.industry && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Industry</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{org.industry}</span>
                    </div>
                  )}
                  {org.website && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Website</span>
                      <a href={org.website} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{org.website}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
