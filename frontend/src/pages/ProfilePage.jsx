import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ProfilePage({ user, onProfileUpdate }) {
  const isEmployer = user?.role === 'Employer';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Employer states
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [hiringStatus, setHiringStatus] = useState('Active');
  const [uploadType, setUploadType] = useState('employee');
  
  // Drag & drop file upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Professional states
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [experience, setExperience] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  const loadData = () => {
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
          }
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    loadData();
  }, [isEmployer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (isEmployer) {
        const updatedOrg = {
          company_name: companyName,
          industry,
          location,
          company_size: companySize,
          website,
          description,
          hiring_status: hiringStatus
        };
        await api.updateMyOrganization(updatedOrg);
        setMessage('Company profile updated successfully! ✓');
        if (onProfileUpdate) onProfileUpdate();
      } else {
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

        if (resumeFile) {
          const formData = new FormData();
          formData.append('file', resumeFile);
          await api.uploadResume(formData);
        }

        setMessage('Professional profile updated successfully! ✓');
        if (onProfileUpdate) onProfileUpdate();
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    setUploadProgress('Uploading internal workforce dataset...');
    setUploadSuccess(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);
    try {
      const data = await api.uploadEmployerRoster(formData);
      setUploadSuccess(`Successfully uploaded internal dataset "${data.summary.dataset_filename}"! Found ${data.summary.employee_count} employees.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Dataset upload failed.');
    } finally {
      setUploadProgress('');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          {isEmployer ? 'Company Settings & Datasets' : 'My Professional Profile'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configure your WorkForceX details. All values align natively with MongoDB.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isEmployer ? '1.2fr 1fr' : '1fr', gap: '1.5rem' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Profile Information</h3>
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
                    <input type="text" value={companySize} onChange={e => setCompanySize(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>LOCATION</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>WEBSITE</label>
                  <input type="url" value={website} onChange={e => setWebsite(e.target.value)} />
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

            <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Saving...' : 'Save Profile Changes ✓'}
            </button>
          </form>
        </div>

        {isEmployer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Internal Workforce Connection</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                Securely upload your CSV/Excel files to update company records or populate your internal employee talent pool.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>DATASET TYPE</label>
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                  <option value="employee">Employee Roster (Populate DB)</option>
                  <option value="company">Company Profile Update (Key-Value)</option>
                </select>
              </div>

              {/* Drag & Drop Area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: dragActive ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: dragActive ? 'rgba(8,145,178,0.05)' : 'rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  id="csv-file-input"
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }}
                />
                <label htmlFor="csv-file-input" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Drag & drop dataset here</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>or click to browse from files</div>
                </label>
              </div>

              {uploadProgress && (
                <div style={{ marginTop: '1rem', color: 'var(--accent-cyan)', fontSize: '0.82rem', textAlign: 'center' }}>
                  ⏳ {uploadProgress}
                </div>
              )}
              {uploadSuccess && (
                <div style={{ marginTop: '1rem', color: '#10b981', fontSize: '0.82rem', padding: '0.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                  ✓ {uploadSuccess}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
