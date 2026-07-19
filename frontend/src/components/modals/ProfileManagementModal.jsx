import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function ProfileManagementModal({ onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states based on role
  const isEmployer = user?.role === 'Employer';
  
  // Employer states
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [hiringStatus, setHiringStatus] = useState('Active');

  // Professional states
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [experience, setExperience] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [email, setEmail] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    if (isEmployer) {
      api.getMyOrganization()
        .then(org => {
          if (org) {
            setCompanyName(org.company_name || '');
            setIndustry(org.industry || '');
            setLocation(org.location || '');
            setCompanySize(org.company_size || '');
            setWebsite(org.website || '');
            setDescription(org.description || '');
            setHiringStatus(org.hiring_status || 'Active');
          }
        })
        .catch(console.error);
    } else {
      api.getMe()
        .then(res => {
          const cand = res?.candidate;
          if (cand) {
            setFullName(cand.name || '');
            setRole(cand.role || '');
            setTargetRole(cand.target_role || '');
            setExperience(cand.experience_years || '');
            setSummary(cand.summary || '');
            setSkills(cand.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ') || '');
            setEmail(res.email || '');
          }
        })
        .catch(console.error);
    }
  }, [isEmployer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (isEmployer) {
        // Update Organization endpoint?
        // Let's create or update using /organizations/me API if available, or call standard edit method.
        // Wait, organizations.py might have a POST /organizations/me. Let's see:
        // In backend organizations.py, let's check if there is an update route.
        // We'll update the organization profile doc directly or call POST /organizations.
        const updatedOrg = {
          company_name: companyName,
          industry,
          location,
          company_size: companySize,
          website,
          description,
          hiring_status: hiringStatus
        };
        // Update user's organization in DB
        await api.updateMyOrganization(updatedOrg);
        setMessage('Company profile updated successfully! ✓');
      } else {
        // Professional update
        // We can update details using a candidates endpoint. Let's patch candidates.
        const updatedCandidate = {
          name: fullName,
          role,
          target_role: targetRole,
          experience_years: parseInt(experience, 10) || 0,
          summary,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean)
        };
        const resMe = await api.getMe();
        const candId = resMe?.candidate?.id;
        if (!candId) throw new Error('Candidate ID not found.');

        await api.updateProfessional(candId, updatedCandidate);

        // If resume uploaded, handle that
        if (resumeFile) {
          const formData = new FormData();
          formData.append('resume', resumeFile);
          await api.uploadResume(formData);
        }

        setMessage('Professional profile updated successfully! ✓');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(7, 10, 19, 0.4)', backdropFilter: 'blur(8px)',
      zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
    }}>
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: '600px', background: 'var(--bg-secondary)',
        maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1.25rem', right: '1.25rem',
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          fontSize: '1.5rem', cursor: 'pointer'
        }}>&times;</button>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {isEmployer ? 'Manage Company Profile' : 'Manage Professional Profile'}
        </h2>

        {message && (
          <div style={{ padding: '0.85rem', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem' }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isEmployer ? (
            <>
              <div className="form-group">
                <label>COMPANY NAME</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>INDUSTRY</label>
                  <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>COMPANY SIZE</label>
                  <input type="text" value={companySize} onChange={e => setCompanySize(e.target.value)} placeholder="e.g. 100-500" />
                </div>
              </div>
              <div className="form-group">
                <label>LOCATION</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="form-group">
                <label>WEBSITE</label>
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://company.com" />
              </div>
              <div className="form-group">
                <label>HIRING STATUS</label>
                <select value={hiringStatus} onChange={e => setHiringStatus(e.target.value)}>
                  <option value="Active">Active hiring</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
              <div className="form-group">
                <label>COMPANY DESCRIPTION</label>
                <textarea rows="4" value={description} onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>FULL NAME</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>CURRENT ROLE</label>
                  <input type="text" value={role} onChange={e => setRole(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>TARGET ROLE</label>
                  <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>YEARS OF EXPERIENCE</label>
                <input type="number" value={experience} onChange={e => setExperience(e.target.value)} />
              </div>
              <div className="form-group">
                <label>SKILLS (comma separated)</label>
                <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Node.js, Python" />
              </div>
              <div className="form-group">
                <label>SUMMARY</label>
                <textarea rows="3" value={summary} onChange={e => setSummary(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
              </div>
              <div className="form-group">
                <label>UPDATE RESUME (PDF/Docx)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files[0])}
                  style={{ border: 'none', background: 'transparent', padding: 0 }} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="secondary-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
