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

  const loadProfileData = async () => {
    try {
      setError(null);
      const [talent, projects, tests] = await Promise.all([
        api.getProfessionals(),
        api.getProjects(),
        api.getAssessments()
      ]);
      
      const myProfile = talent.find(t => t.id === 'PROF-001') || talent[0];
      if (!myProfile) {
        throw new Error("No talent profiles found. Make sure the backend server loaded seeds successfully.");
      }
      setProfile(myProfile);

      if (myProfile) {
        const myProject = projects.find(proj => 
          proj.status === 'Active' && 
          proj.members.some(m => m.id === myProfile.id)
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
          <p style={{ color: 'var(--text-secondary)' }}>The database is connected but no user profiles could be loaded.</p>
        </div>
      </div>
    );
  }

  const isAvailable = profile.status === 'Bench';

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            Professional Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Welcome back, {profile.name}. Manage your project readiness and toggle availability.
          </p>
        </div>

        {/* Availability Switch */}
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
      </div>

      {/* Metrics */}
      <div className="dashboard-grid">
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Readiness Score</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-cyan)' }}>{profile.readiness_score}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Core Skills: {profile.skills.slice(0, 3).join(', ')}</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Active Projects</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-indigo)' }}>
            {activeProjectName === 'None' ? '0' : '1'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activeProjectName}</div>
        </div>
        <div className="glass-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Certifications</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-purple)' }}>{profile.skills.length}</div>
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
              const alreadyHasSkill = profile.skills.includes(test.skill_name);
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

        {/* Recommended Engagements */}
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

        {/* Skills List */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Your Verified Skill Badges</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.skills.map((skill, idx) => (
              <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></div>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{skill}</span>
              </div>
            ))}
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
            
            {/* Modal Header */}
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

            {/* Test Content: Question Panel OR Results Panel */}
            {!testResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Question Progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Question {currentQuestionIdx + 1} of {activeTest.questions.length}</span>
                  <span>Min. score to pass: 80%</span>
                </div>

                {/* Question text */}
                <div style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.4, minHeight: '60px' }}>
                  {activeTest.questions[currentQuestionIdx].q}
                </div>

                {/* Options list */}
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

                {/* Navigation Buttons */}
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
              /* Test Results display */
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
                  {testResult.message}
                </p>

                <div style={{ display: 'flex', gap: '2rem', background: 'var(--bg-tertiary)', padding: '1rem 2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', margin: '0.5rem 0' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{testResult.score}%</div>
                  </div>
                  <div style={{ borderRight: '1px solid var(--border-color)' }}></div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correct</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{testResult.correctAnswers} / {testResult.totalQuestions}</div>
                  </div>
                </div>

                {testResult.passed && testResult.unlockedSkill && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.06)', border: '1px dashed var(--accent-cyan)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                    ✦ Verified Badge Unlocked: <strong>{testResult.unlockedSkill}</strong>
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
