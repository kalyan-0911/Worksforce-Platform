import React, { useState } from 'react';
import { api } from '../services/api';

export default function LoginGateway({ onLoginSuccess }) {
  // UI State
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [registerStep, setRegisterStep] = useState(1);
  const [role, setRole] = useState('Professional');
  
  // Basic Info (Level 1)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Goal/Role (Level 2)
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState(''); // Junior, Mid, Senior, Lead
  
  // Deep Details (Level 3 - Employer)
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');

  // Validation / Document (Level 3 - Professional)
  const [resumeFile, setResumeFile] = useState(null);
  
  // Network State
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const TOTAL_STEPS = 4;

  const handleNextStep = (e) => {
    e.preventDefault();
    if (registerStep < TOTAL_STEPS) setRegisterStep(registerStep + 1);
  };

  const handleBack = () => {
    setError(null);
    if (registerStep > 1) setRegisterStep(registerStep - 1);
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = { 
        email, 
        password, 
        role, 
        name,
        target_role: targetRole,
        experience_level: experienceLevel,
        company_name: companyName,
        industry,
        company_size: companySize,
        location,
        website
      };
      
      const data = await api.register(payload);
      
      if (role === 'Professional' && resumeFile) {
        await api.uploadResume(resumeFile);
      }
      
      const loginData = await api.login({ email, password });
      onLoginSuccess(loginData.token, loginData.user);
      
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ----- COMPONENT RENDERERS -----

  const renderProgressBar = () => (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
      {[1, 2, 3, 4].map(step => (
        <div key={step} style={{ 
          flex: 1, 
          height: '6px', 
          borderRadius: '3px',
          background: step <= registerStep ? '#f43f5e' : 'rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease'
        }} />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Your Role</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>How will you be using WorkForceX?</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['Professional', 'Employer'].map(r => (
          <div 
            key={r}
            onClick={() => setRole(r)}
            style={{ 
              flex: 1, 
              padding: '1.5rem 1rem', 
              textAlign: 'center',
              borderRadius: '12px',
              border: role === r ? '2px solid #f43f5e' : '1px solid rgba(0,0,0,0.1)',
              background: role === r ? 'rgba(244, 63, 94, 0.1)' : 'var(--bg-tertiary)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              {r === 'Professional' ? '🧑‍💻' : '🏢'}
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r}</div>
          </div>
        ))}
      </div>
      
      <button className="primary-btn" onClick={handleNextStep}>Initialize Role →</button>
    </div>
  );

  const renderStep2 = () => (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Account Details</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Create your secure account credentials.</p>
      
      <div className="form-group">
        <label>{role === 'Employer' ? 'ORGANIZATION REP NAME' : 'FULL NAME'}</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Doe" />
      </div>
      
      <div className="form-group">
        <label>EMAIL ADDRESS</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@example.com" />
      </div>
      
      <div className="form-group">
        <label>PASSWORD</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={handleBack}>← Back</button>
        <button className="primary-btn" style={{ flex: 2 }} onClick={handleNextStep} disabled={!name || !email || !password}>Next Phase →</button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Professional Details</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {role === 'Professional' ? 'Tell us about your career goals.' : 'Tell us about your organization.'}
      </p>
      
      {role === 'Professional' ? (
        <>
          <div className="form-group">
            <label>TARGET ROLE</label>
            <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)} required placeholder="e.g. Senior React Developer" />
          </div>
          <div className="form-group">
            <label>EXPERIENCE LEVEL</label>
            <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-primary)', borderRadius: '8px' }}>
              <option value="" disabled>Select Level</option>
              <option value="Junior">Junior (0-2 years)</option>
              <option value="Mid">Mid-Level (3-5 years)</option>
              <option value="Senior">Senior (5-8 years)</option>
              <option value="Lead">Lead / Architect (8+ years)</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label>COMPANY NAME</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Corp" />
          </div>
          <div className="form-group">
            <label>INDUSTRY DOMAIN</label>
            <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} required placeholder="e.g. FinTech, Healthcare" />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>COMPANY SIZE</label>
              <select value={companySize} onChange={e => setCompanySize(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-primary)', borderRadius: '8px' }}>
                <option value="" disabled>Select</option>
                <option value="1-50">1-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>LOCATION</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} required placeholder="City, Country" />
            </div>
          </div>
        </>
      )}
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={handleBack}>← Back</button>
        <button className="primary-btn" style={{ flex: 2 }} onClick={handleNextStep}>Final Phase →</button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Verification</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {role === 'Professional' ? 'Upload your resume — our AI will parse your skills instantly.' : 'Optional: provide your corporate website.'}
      </p>
      
      {role === 'Professional' ? (
        <div className="form-group">
          <label>RESUME / CV (PDF or DOCX)</label>
          <div style={{ 
            border: '2px dashed var(--bg-tertiary)', 
            borderRadius: '12px', 
            padding: '2rem', 
            textAlign: 'center',
            background: 'var(--bg-tertiary)'
          }}>
            <input 
              type="file" 
              accept=".pdf,.docx" 
              onChange={e => setResumeFile(e.target.files[0])}
              style={{ display: 'none' }}
              id="resume-upload"
            />
            <label htmlFor="resume-upload" style={{ cursor: 'pointer', color: '#0ea5e9', fontWeight: 600 }}>
              {resumeFile ? resumeFile.name : 'Click to Browse Files'}
            </label>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              The AI Matching Engine will instantly parse your skills.
            </div>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label>CORPORATE WEBSITE (Optional)</label>
          <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={handleBack}>← Back</button>
        <button className="primary-btn" style={{ flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={submitRegistration} disabled={loading}>
          {loading ? 'Processing...' : 'Complete Onboarding ✓'}
        </button>
      </div>
    </div>
  );


  // ----- MAIN RENDER -----

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      
      <div style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: '0.5rem' }}>
            WorkForce<span style={{ color: '#f43f5e' }}>X</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>The AI-Powered Liquidity Platform</p>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', background: 'var(--glass-bg)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              onClick={() => { setActiveTab('login'); setError(null); }}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: activeTab === 'login' ? 'rgba(0,0,0,0.1)' : 'transparent', color: activeTab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setActiveTab('register'); setError(null); setRegisterStep(1); }}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: activeTab === 'register' ? 'rgba(0,0,0,0.1)' : 'transparent', color: activeTab === 'register' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
            Create Account
            </button>
          </div>

          {error && (
            <div style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '12px', color: '#f43f5e', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={submitLogin} className="fade-in">
              <div className="form-group">
                <label>EMAIL ADDRESS</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="candidate@workforcex.com" />
              </div>
              <div className="form-group">
                <label>PASSWORD</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <button type="submit" className="primary-btn" style={{ marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
              
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1.5rem' }}>
                Demo: <code>employer@workforcex.com</code> or <code>professional@workforcex.com</code><br/>
                Password: <code>workforce123</code>
              </div>
            </form>
          ) : (
            <form>
              {renderProgressBar()}
              {registerStep === 1 && renderStep1()}
              {registerStep === 2 && renderStep2()}
              {registerStep === 3 && renderStep3()}
              {registerStep === 4 && renderStep4()}
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
