import React from 'react';

export default function InvitationModal({ opportunity, onClose, onAccept, onReject }) {
  if (!opportunity) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div className="glass-card" style={{
        width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', padding: '2rem'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem', background: 'transparent',
          border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer'
        }}>×</button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{opportunity.role}</h2>
            <div style={{ color: 'var(--accent-indigo)', fontSize: '1.1rem', marginTop: '0.25rem', fontWeight: 600 }}>
              {opportunity.project_name}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Offered by: <strong>{opportunity.employer_name || 'Organization'}</strong>
            </div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Role Description</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {opportunity.job_description || `You have been selected as a top candidate for the role of ${opportunity.role} on the ${opportunity.project_name} team. The employer has reviewed your profile and believes your skills are a strong match for this position.`}
            </p>
          </div>

          {opportunity.status === 'Pending' && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => { onAccept(opportunity.id); onClose(); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
                Accept Invitation
              </button>
              <button onClick={() => { onReject(opportunity.id); onClose(); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(239,68,68,0.07)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
                Decline
              </button>
            </div>
          )}
          
          {opportunity.status !== 'Pending' && (
            <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', fontWeight: 600 }}>
              Status: {opportunity.status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
