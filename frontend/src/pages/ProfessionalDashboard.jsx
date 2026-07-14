import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ProfessionalDashboard() {
  const [profile, setProfile] = useState(null);
  const [activeProjectName, setActiveProjectName] = useState('None');
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assessment states
  const [activeTest, setActiveTest] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [submittingTest, setSubmittingTest] = useState(false);

  // Resume Onboarding Wizard states
  const [resumeText, setResumeText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [wizardResult, setWizardResult] = useState(null);

  const loadProfileData = async () => {
    try {
      setError(null);
      const [meData, projects, tests] = await Promise.all([
        api.getMe(),
        api.getProjects(),
        api.getAssessments()
      ]);
      
      const myProfile = meData.candidate;
      setProfile(myProfile);

      if (myProfile) {
        const myProject = projects.find(proj => 
          proj.status === 'Active' && 
          proj.members && proj.members.some(m => m.id === myProfile.id)
        );
        if (myProject) {
          setActiveProjectName(myProject.name);
        } else {
          setActiveProjectName('None');
        }
      }

      setAssessments(tests);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    const newStatus = profile.status === 'Bench' ? 'Engaged' : 'Bench';
    
    try {
      await api.toggleAvailability(profile.id, newStatus);
      setProfile(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(`Failed to update availability: ${err.message}`);
    }
  };

  const handleParseResume = async (e) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      alert('Please paste your resume details.');
      return;
    }

    setParsing(true);
    setWizardResult(null);
    try {
      const data = await api.parseResume({ resume_text: resumeText });
      setWizardResult(data.recommendations);
    } catch (err) {
      alert(`Failed to parse resume: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleCompleteOnboarding = () => {
    setResumeText('');
    setWizardResult(null);
    loadProfileData();
  };

  const startTest = async (testId) => {
    setLoading(true);
    try {
      const fullTest = await api.getAssessmentById(testId);
      setActiveTest(fullTest);
      setCurrentQuestionIdx(0);
      setSelectedAnswers(new Array(fullTest.questions.length).fill(null));
      setTestResult(null);
    } catch (err) {
      alert(`Failed to load assessment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (optIdx) => {
    setSelectedAnswers(prev => {
      const updated = [...prev];
      updated[currentQuestionIdx] = optIdx;
      return updated;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < activeTest.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
    }
  };

  const submitTestAnswers = async () => {
    if (selectedAnswers.includes(null)) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmittingTest(true);
    try {
      const result = await api.submitAssessment(activeTest.id, {
        professionalId: profile.id,
        answers: selectedAnswers
      });
      setTestResult(result);
    } catch (err) {
      alert(`Failed to submit assessment: ${err.message}`);
    } finally {
      setSubmittingTest(false);
    }
  };

  const closeTestModal = () => {
    setActiveTest(null);
    setTestResult(null);
    setSelectedAnswers([]);
    setCurrentQuestionIdx(0);
    loadProfileData();
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.25rem' }}>Connection/Loading Error</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button 
            onClick={loadProfileData} 
            style={{
              background: 'var(--gradient-primary)',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'var(--font-family)'
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }}>No Profile Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>The database is connected but no candidate profiles could be loaded for this account.</p>
        </div>
      </div>
    );
  }

  // Detect un-onboarded new user
  const needsOnboarding = !profile.training || !profile.training.cohort_code;

  if (needsOnboarding) {
    return (
      <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            Associate Onboarding Wizard
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Configure your target technology track and synchronize your skills using our resume analysis engine.
          </p>
        </div>

        {!wizardResult ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Analyze Profile Resume</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Paste your resume text below (experience, skill sets, certifications). Our engine will parse your skills and recommend the best Revature-style training cohort track.
              </p>
            </div>

            <form onSubmit={handleParseResume} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder={`e.g.
JOHN SMITH
Email: john@gmail.com
SUMMARY: Software developer with 2 years of experience.
SKILLS: React, JavaScript, HTML, CSS, Docker, Python, Git...`}
                rows="10"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--glass-border)',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-family)',
                  resize: 'vertical',
                  lineHeight: 1.5
                }}
              />

              <button
                type="submit"
                disabled={parsing}
                style={{
                  background: parsing ? 'var(--bg-tertiary)' : 'var(--gradient-primary)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: parsing ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {parsing ? 'Analyzing Skills & Tracks...' : 'Analyze Resume'}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Cohort Alignment Recommendation</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Analysis based on parsed resume keywords</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RECOMMENDED TRAINING TRACK</div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#fff', marginTop: '0.2rem' }}>{wizardResult.track}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COHORT BATCH CODE</div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--accent-indigo)', marginTop: '0.2rem' }}>{wizardResult.cohort_code}</div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>Verified Skills Matched:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {profile.skills && profile.skills.length > 0 ? (
                    profile.skills.map((s, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(6, 182, 212, 0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '4px' }}>
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No default skills matched. You will build them during training!</span>
                  )}
                </div>
              </div>

              {wizardResult.missing_skills && wizardResult.missing_skills.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Target Skills to Acquire during Cohort:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {wizardResult.missing_skills.map((s, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong>Cohort Training Path:</strong> You will complete milestones, submit mock project capstones, and take skills assessments. Maintaining a readiness score above 80% places you on the **Deployment Bench** for instant corporate allocation.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => setWizardResult(null)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Re-Analyze Resume
              </button>
              <button
                onClick={handleCompleteOnboarding}
                style={{
                  flex: 1,
                  background: 'var(--gradient-primary)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                Join Cohort & Start Training
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isAvailable = profile.status === 'Bench';
  const isTraining = profile.status === 'Training';

  const skillNamesList = profile.skills ? profile.skills.map(s => s.name) : [];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            Associate Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Welcome back, {profile.name}. {isTraining ? "Track your cohort batch curriculum milestones." : "Manage your project readiness and bench availability."}
          </p>
        </div>

        {/* Availability Switch (Only if not in Training) */}
        {!isTraining ? (
          <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Bench Availability</span>
            <button 
              onClick={handleToggleAvailability}
              style={{
                width: '50px',
                height: '26px',
                borderRadius: '13px',
                background: isAvailable ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                border: '1px solid var(--glass-border)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '2px',
                left: isAvailable ? '26px' : '2px',
                transition: 'var(--transition-fast)'
              }} />
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isAvailable ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
              {isAvailable ? 'AVAILABLE' : 'ENGAGED'}
            </span>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-indigo)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)', animation: 'pulse 1.5s infinite' }}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>TRAINING IN PROGRESS</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="dashboard-grid">
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Readiness Score</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-cyan)' }}>{profile.readiness_score}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
            Skills: {skillNamesList.slice(0, 3).join(', ') || 'No badges unlocked'}
          </div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
            {isTraining ? 'Training Track' : 'Active Projects'}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.8rem 0', color: 'var(--accent-indigo)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isTraining ? profile.training.track : (activeProjectName === 'None' ? '0 Projects' : '1 Active Project')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {isTraining ? `Batch: ${profile.training.cohort_code}` : activeProjectName}
          </div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Certifications</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-purple)' }}>
            {profile.skills ? profile.skills.length : 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>AI verified badges</div>
        </div>
      </div>

      {/* Three Sections Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Assessment Hub Section */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-indigo)' }}>Assessment Hub</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prove your skills to unlock verified badges and boost matches.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {assessments.map((test) => {
              const alreadyHasSkill = skillNamesList.includes(test.skill_name);
              return (
                <div key={test.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{test.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Skill: {test.skill_name}</div>
                  </div>
                  {alreadyHasSkill ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>✓ Verified</span>
                  ) : (
                    <button 
                      onClick={() => startTest(test.id)}
                      style={{
                        background: 'var(--gradient-primary)',
                        color: '#fff',
                        border: 'none',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Verify
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Training Cohort Progress (If Training) VS Recommended Engagements */}
        {isTraining ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Cohort Progress</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Curriculum Milestones</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{profile.training.progress_percentage}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <div style={{ height: '100%', width: `${profile.training.progress_percentage}%`, background: 'var(--gradient-primary)', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}>Cohort Trainer</div>
                <div style={{ fontWeight: 600, marginTop: '0.15rem' }}>{profile.training.trainer}</div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Next Milestone:</strong> Verify skill competencies in the Assessment Hub to unlock badges and complete curriculum tracks.
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recommended Projects</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { company: 'Acme Corp', role: 'Solutions Architect (Cloud)', duration: '6 months', match: '96%' },
                { company: 'Delta Labs', role: 'Security & Infrastructure Lead', duration: '3 months', match: '90%' }
              ].map((proj, idx) => (
                <div key={idx} style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{proj.role}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{proj.company} • {proj.duration}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{proj.match}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills List */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Your Verified Skill Badges</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.skills && profile.skills.length > 0 ? (
              profile.skills.map((skill, idx) => (
                <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'align-items', gap: '0.4rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block', marginRight: '0.4rem' }}></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{skill.name}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 'auto' }}>No verified badges yet. Verify assessments on the left to earn badges.</span>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Test Modal Overlay */}
      {activeTest && (
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{activeTest.title}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Required: Skill validation for {activeTest.skill_name}</span>
              </div>
              {!testResult && (
                <button 
                  onClick={closeTestModal}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            {!testResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Question {currentQuestionIdx + 1} of {activeTest.questions.length}</span>
                  <span>Min. score to pass: 80%</span>
                </div>

                <div style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.4, minHeight: '60px' }}>
                  {activeTest.questions[currentQuestionIdx].q}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeTest.questions[currentQuestionIdx].options.map((option, oIdx) => {
                    const isSelected = selectedAnswers[currentQuestionIdx] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => selectOption(oIdx)}
                        style={{
                          textAlign: 'left',
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-tertiary)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-family)',
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? 500 : 400,
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button
                    disabled={currentQuestionIdx === 0}
                    onClick={handlePrevQuestion}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: currentQuestionIdx === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Back
                  </button>

                  {currentQuestionIdx < activeTest.questions.length - 1 ? (
                    <button
                      disabled={selectedAnswers[currentQuestionIdx] === null}
                      onClick={handleNextQuestion}
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: selectedAnswers[currentQuestionIdx] === null ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      disabled={selectedAnswers.includes(null) || submittingTest}
                      onClick={submitTestAnswers}
                      style={{
                        background: 'var(--accent-cyan)',
                        border: 'none',
                        color: '#000',
                        fontWeight: 600,
                        padding: '0.5rem 1.5rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: (selectedAnswers.includes(null) || submittingTest) ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {submittingTest ? 'Submitting...' : 'Submit Answers'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: testResult.passed ? 'rgba(6, 182, 212, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: testResult.passed ? 'var(--accent-cyan)' : '#ef4444',
                  boxShadow: testResult.passed ? '0 0 20px rgba(6, 182, 212, 0.3)' : 'none',
                  marginBottom: '0.5rem'
                }}>
                  {testResult.passed ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  )}
                </div>

                <h4 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {testResult.passed ? 'Assessment Passed!' : 'Assessment Failed'}
                </h4>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '400px' }}>
                  {testResult.passed ? 'Excellent work! You have successfully passed the assessment and unlocked your skill badge.' : 'You did not achieve the required 80% passing score. Review the materials and retry.'}
                </p>

                <div style={{ display: 'flex', gap: '2rem', background: 'var(--bg-tertiary)', padding: '1rem 2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', margin: '0.5rem 0' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{testResult.score}%</div>
                  </div>
                  <div style={{ borderRight: '1px solid var(--border-color)' }}></div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correct</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{testResult.correctCount} / {testResult.totalCount}</div>
                  </div>
                </div>

                {testResult.passed && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.06)', border: '1px dashed var(--accent-cyan)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                    ✦ Verified Badge Unlocked!
                  </div>
                )}

                <button
                  onClick={closeTestModal}
                  style={{
                    background: 'var(--gradient-primary)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    padding: '0.75rem 2rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    marginTop: '1rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  Close & Update Portal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
