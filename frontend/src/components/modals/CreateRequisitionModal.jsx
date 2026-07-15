import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

export default function CreateRequisitionModal({ onClose, onSuccess, onCreated }) {
  const handleSuccess = onCreated || onSuccess;
  const [role, setRole] = useState('');
  const [projectName, setProjectName] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [experience, setExperience] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [teamSize, setTeamSize] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
      await api.createRequisition({
        role,
        projectName,
        skills: skillsArray,
        experience,
        projectDescription,
        duration,
        teamSize: parseInt(teamSize, 10) || 1
      });
      handleSuccess();
    } catch (err) {
      toast.error(`Failed to create requirement: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(7, 10, 19, 0.95)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backdropFilter: 'blur(8px)',
      padding: '1rem'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Create Workforce Requirement</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Define the role, skills, and project details to start matching.</span>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Target Role</label>
              <input type="text" required value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" style={inputStyle} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Project Name</label>
              <input type="text" required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Project Phoenix" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Required Skills (comma separated)</label>
            <input type="text" required value={skillsInput} onChange={e => setSkillsInput(e.target.value)} placeholder="React, TypeScript, GraphQL..." style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Experience Level</label>
              <select value={experience} onChange={e => setExperience(e.target.value)} style={inputStyle} required>
                <option value="">Select Level</option>
                <option value="Junior (1-3 years)">Junior (1-3 years)</option>
                <option value="Mid-Level (3-5 years)">Mid-Level (3-5 years)</option>
                <option value="Senior (5+ years)">Senior (5+ years)</option>
                <option value="Lead/Architect">Lead/Architect</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Duration</label>
              <input type="text" required value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 6 Months" style={inputStyle} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Team Size</label>
              <input type="number" min="1" required value={teamSize} onChange={e => setTeamSize(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Project Description (Full Job Description)</label>
            <textarea required value={projectDescription} onChange={e => setProjectDescription(e.target.value)} rows="8" placeholder="Paste the full job description here. The AI will use this text to find deep contextual matches..." style={{...inputStyle, resize: 'vertical'}} />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            style={{
              background: 'var(--gradient-primary)',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '0.8rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem'
            }}
          >
            {submitting ? 'Creating...' : 'Create Requirement'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  fontSize: '0.85rem',
  fontFamily: 'var(--font-family)',
  appearance: 'none'
};
