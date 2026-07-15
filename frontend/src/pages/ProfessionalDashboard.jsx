import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import OrganizationProfileModal from '../components/modals/OrganizationProfileModal';
import InvitationModal from '../components/modals/InvitationModal';

const TIERS = [
  { min: 90, name: 'Diamond', color: '#60a5fa', icon: '💎' },
  { min: 75, name: 'Gold',    color: '#fbbf24', icon: '🏆' },
  { min: 50, name: 'Silver',  color: '#94a3b8', icon: '🥈' },
  { min: 0,  name: 'Bronze',  color: '#b45309', icon: '🥉' },
];
const getTier = (score) => TIERS.find(t => score >= t.min) || TIERS[3];

const OPP_STATUS_COLOR = {
  Pending:            '#f59e0b',
  Accepted:           '#10b981',
  Rejected:           '#ef4444',
  Candidate_Requested:'#6366f1',
};

export default function ProfessionalDashboard({ activeTab, setActiveTab }) {
  const [profile, setProfile]           = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [reverseMatches, setReverseMatches] = useState([]);
  const [careerPath, setCareerPath]     = useState(null);
  const [loading, setLoading]           = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [careerLoading, setCareerLoading] = useState(false);

  const tab = activeTab || 'professional';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, oppsRes, matchesRes] = await Promise.allSettled([
        api.getMe(),
        api.getOpportunities(),
        api.getReverseMatches(),
      ]);

      const me = meRes.status === 'fulfilled' ? meRes.value : null;
      const cand = me?.candidate || null;
      setProfile(cand);
      setOpportunities(oppsRes.status === 'fulfilled' ? (oppsRes.value || []) : []);
      let uniqueMatches = [];
      if (matchesRes.status === 'fulfilled' && matchesRes.value) {
        const seen = new Set();
        uniqueMatches = matchesRes.value.filter(m => {
          const key = `${m.company}-${m.title}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      setReverseMatches(uniqueMatches);

      // Load career path for the profile tab
      if (cand?.id && tab === 'career') {
        loadCareerPath(cand.id);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const loadCareerPath = async (id) => {
    setCareerLoading(true);
    try {
      const data = await api.getCareerPath(id);
      setCareerPath(data);
    } catch(e) {
      console.error('Career path error', e);
    } finally {
      setCareerLoading(false);
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'career' && profile?.id && !careerPath) loadCareerPath(profile.id);
  }, [tab, profile]);

  const handleAccept = async (id) => {
    try { await api.acceptOpportunity(id); load(); } catch(e) { toast.error(e.message || 'An error occurred'); }
  };
  const handleReject = async (id) => {
    try { await api.rejectOpportunity(id); load(); } catch(e) { toast.error(e.message || 'An error occurred'); }
  };
  const handleToggleAvailability = async () => {
    if (!profile) return;
    const next = profile.status === 'Bench' ? 'Engaged' : 'Bench';
    try { await api.toggleAvailability(profile.id, next); load(); } catch(e) { toast.error(e.message || 'An error occurred'); }
  };

  if (loading) return (
    <div className="page-container" style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <div style={{ width:40, height:40, border:'3px solid rgba(0,0,0,0.05)', borderTopColor:'#f43f5e', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  );

  if (!profile) return (
    <div className="page-container">
      <div className="glass-card" style={{ textAlign:'center', padding:'3rem' }}>
        <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>👤</div>
        <div style={{ fontWeight:600, marginBottom:'0.5rem' }}>Profile not found</div>
        <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>Your candidate profile could not be loaded. Please contact support.</div>
      </div>
    </div>
  );

  const tier = getTier(profile.readiness_score || 0);
  const skills = profile.skills || [];
  const pendingOpps = opportunities.filter(o => o.status === 'Pending');
  const acceptedOpps = opportunities.filter(o => o.status === 'Accepted');
  const rejectedOpps = opportunities.filter(o => o.status === 'Rejected');

  // ── PROFILE TAB ──────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div>
      {/* Profile Header */}
      <div className="glass-card" style={{ marginBottom:'1.5rem', borderLeft:`4px solid ${tier.color}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:0 }}>{profile.name || 'Professional'}</h2>
              <span style={{ fontSize:'1.2rem' }}>{tier.icon}</span>
              <span style={{ fontSize:'0.75rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:'8px', background: `${tier.color}22`, color: tier.color }}>{tier.name}</span>
            </div>
            <div style={{ color:'var(--text-secondary)', marginTop:'0.25rem' }}>{profile.role || profile.target_role || 'Professional'}</div>
            {profile.experience_years && <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.1rem' }}>{profile.experience_years} years experience</div>}
          </div>
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'1.8rem', fontWeight:700, color: tier.color }}>{profile.readiness_score || 0}%</div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Readiness</div>
            </div>
            <button onClick={handleToggleAvailability}
              style={{ padding:'0.5rem 1rem', background: profile.status==='Bench'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${profile.status==='Bench'?'#10b981':'#ef4444'}`, color: profile.status==='Bench'?'#10b981':'#ef4444', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'0.82rem' }}>
              {profile.status === 'Bench' ? '✓ Available' : '● Engaged'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:'1.25rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.35rem' }}>
            <span>Readiness Progress</span>
            <span>{profile.readiness_score || 0} / 100</span>
          </div>
          <div style={{ height:8, background:'rgba(0,0,0,0.06)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${profile.readiness_score || 0}%`, background: `linear-gradient(90deg, ${tier.color}, ${tier.color}bb)`, borderRadius:4, transition:'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
            {profile.readiness_score >= 80 ? '✓ Eligible for deployment' : `Need ${80 - (profile.readiness_score||0)} more points to unlock deployment eligibility`}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
        {/* Summary */}
        <div className="glass-card">
          <h3 style={{ fontSize:'0.9rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-muted)', marginBottom:'0.75rem' }}>Professional Summary</h3>
          <p style={{ fontSize:'0.88rem', color:'var(--text-secondary)', lineHeight:1.6 }}>
            {profile.summary || `${profile.name || 'This professional'} is a ${profile.role || 'professional'} with ${profile.experience_years || 'several'} years of experience.`}
          </p>
          {profile.education && (
            <div style={{ marginTop:'0.75rem', fontSize:'0.82rem', color:'var(--text-secondary)' }}>
              🎓 <strong>Education:</strong> {typeof profile.education === 'string' ? profile.education : JSON.stringify(profile.education)}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="glass-card">
          <h3 style={{ fontSize:'0.9rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-muted)', marginBottom:'0.75rem' }}>Skills</h3>
          {skills.length === 0 ? (
            <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>Upload your resume in Career Path to extract skills.</div>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
              {skills.map((s, i) => {
                const name = typeof s === 'string' ? s : s.name;
                const verified = typeof s === 'string' ? false : s.verified;
                return (
                  <span key={i} style={{ padding:'0.3rem 0.65rem', borderRadius:'6px', fontSize:'0.78rem', background: verified?'rgba(139,92,246,0.1)':'rgba(0,0,0,0.05)', border: verified?'1px solid rgba(139,92,246,0.3)':'1px solid var(--border-color)', color: verified?'#8b5cf6':'var(--text-secondary)' }}>
                    {name}{verified && ' ✓'}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Key Strengths */}
        {profile.key_strengths && profile.key_strengths.length > 0 && (
          <div className="glass-card">
            <h3 style={{ fontSize:'0.9rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-muted)', marginBottom:'0.75rem' }}>Key Strengths</h3>
            <ul style={{ paddingLeft:'1.25rem', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
              {profile.key_strengths.map((s, i) => <li key={i} style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Areas to Improve */}
        {profile.areas_to_improve && profile.areas_to_improve.length > 0 && (
          <div className="glass-card">
            <h3 style={{ fontSize:'0.9rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-muted)', marginBottom:'0.75rem' }}>Growth Areas</h3>
            <ul style={{ paddingLeft:'1.25rem', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
              {profile.areas_to_improve.map((s, i) => <li key={i} style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Training */}
        {profile.training && (
          <div className="glass-card" style={{ borderTop:`3px solid var(--accent-indigo)` }}>
            <h3 style={{ fontSize:'0.9rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-muted)', marginBottom:'0.75rem' }}>Training Track</h3>
            <div style={{ fontWeight:600, color:'var(--accent-indigo)' }}>{profile.training.track}</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>Cohort: {profile.training.cohort_code}</div>
            {profile.training.trainer && <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginTop:'0.1rem' }}>Trainer: {profile.training.trainer}</div>}
            <div style={{ marginTop:'0.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.3rem' }}>
                <span>Progress</span><span>{profile.training.progress_percentage || 0}%</span>
              </div>
              <div style={{ height:6, background:'rgba(0,0,0,0.06)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${profile.training.progress_percentage || 0}%`, background:'var(--gradient-primary)', borderRadius:3 }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── OPPORTUNITIES TAB ─────────────────────────────────────────────────────
  const renderOpportunities = () => (
    <div>
      <h3 style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:'1.25rem' }}>My Invitations</h3>

      {opportunities.length === 0 ? (
        <div className="glass-card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>📬</div>
          <div style={{ fontWeight:600, marginBottom:'0.5rem' }}>No invitations yet</div>
          <div style={{ fontSize:'0.85rem' }}>Employers will send you invitations once they find a match for their requirements.</div>
          <div style={{ fontSize:'0.82rem', marginTop:'0.5rem' }}>You can also express interest in jobs via the Job Market tab.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {opportunities.map((opp, i) => (
            <div key={i} className="glass-card" style={{ borderLeft:`3px solid ${OPP_STATUS_COLOR[opp.status] || 'var(--border-color)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{opp.role || 'Role'} — {opp.project_name}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.15rem' }}>From: {opp.employer_name || 'Organization'}</div>
                </div>
                <span style={{ padding:'0.25rem 0.65rem', borderRadius:'8px', fontSize:'0.72rem', fontWeight:600, background:`${OPP_STATUS_COLOR[opp.status]}22`, color: OPP_STATUS_COLOR[opp.status] || 'var(--text-muted)', border:`1px solid ${OPP_STATUS_COLOR[opp.status]}44` }}>
                  {opp.status === 'Candidate_Requested' ? 'You Requested' : opp.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.9rem' }}>
                <button onClick={() => setSelectedOpportunity(opp)}
                  style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid var(--accent-indigo)', color: 'var(--accent-indigo)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                  View Invitation Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── CAREER PATH TAB ───────────────────────────────────────────────────────
  const renderCareer = () => (
    <div>
      <div style={{ marginBottom:'1.25rem' }}>
        <h3 style={{ fontWeight:700, fontSize:'1.1rem', margin:0 }}>AI Career Path & Insights</h3>
        <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.25rem' }}>Generated from your profile, skills, and readiness data.</p>
      </div>

      {/* AI Recommended Jobs */}
      <div className="glass-card" style={{ marginBottom:'1.5rem' }}>
        <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem' }}>🎯 Top AI Job Matches</h3>
        {reverseMatches.length === 0 ? (
          <div style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'1.5rem' }}>
            No matches found yet. Ensure your profile has skills listed.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            {reverseMatches.slice(0,3).map((m, i) => (
              <div key={i} style={{ padding:'1rem', background:'var(--bg-tertiary)', borderRadius:'8px', border:'1px solid var(--border-color)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{m.title} <span style={{ color:'var(--text-muted)' }}>@ {m.company}</span></div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.15rem' }}>{m.location}</div>
                  </div>
                  <div style={{ fontWeight:700, color:'#10b981', fontSize:'1.05rem' }}>{m.matchScore}%</div>
                </div>
                {m.explanation && (
                  <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.5, marginTop:'0.5rem', padding:'0.5rem', background:'rgba(16,185,129,0.04)', borderRadius:'5px', borderLeft:'2px solid #10b981' }}>
                    {m.explanation}
                  </p>
                )}
                <button onClick={async () => {
                    try { await api.requestOpportunity(m.job_id); toast.success('Interest expressed! The employer will be notified.'); }
                    catch(e) { toast.error(e.message || 'An error occurred'); }
                  }}
                  style={{ marginTop:'0.65rem', padding:'0.35rem 0.85rem', background:'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'5px', cursor:'pointer', fontSize:'0.78rem', fontWeight:600 }}>
                  Express Interest
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Learning Journey */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize:'1.05rem', fontWeight:700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ padding: '0.3rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '8px' }}>🎓</span> 
            Personalized Learning Journey
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600, padding: '0.2rem 0.6rem', border: '1px solid var(--accent-indigo)', borderRadius: '12px' }}>AI Generated</span>
        </div>

        {careerLoading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
            <div style={{ width:32, height:32, border:'3px solid rgba(0,0,0,0.05)', borderTopColor:'var(--accent-indigo)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          </div>
        ) : careerPath ? (
          <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(16,185,129,0.2)' }}>
            
            {/* Step 1: Current Base */}
            {careerPath.current_role && (
              <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <div style={{ position: 'absolute', left: '-2.05rem', top: '0.2rem', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-primary)', border: '4px solid #94a3b8' }} />
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 1: Current Baseline</div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>{careerPath.current_role}</div>
              </div>
            )}

            {/* Step 2: Skill Acquisition */}
            {careerPath.skills_to_acquire && careerPath.skills_to_acquire.length > 0 && (
              <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <div style={{ position: 'absolute', left: '-2.05rem', top: '0.2rem', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-primary)', border: '4px solid #f59e0b' }} />
                <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 2: Skill Acquisition</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {careerPath.skills_to_acquire.map((s,i) => (
                    <div key={i} style={{ padding: '0.4rem 0.8rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>
                      + {s}
                    </div>
                  ))}
                </div>
                {careerPath.timeline && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>⏱ Est. time to acquire: {careerPath.timeline}</div>}
              </div>
            )}

            {/* Step 3: Target Role */}
            {careerPath.next_role && (
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <div style={{ position: 'absolute', left: '-2.05rem', top: '0.2rem', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-primary)', border: '4px solid #10b981' }} />
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 3: Target Role Unlocked</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.25rem', color: '#10b981' }}>{careerPath.next_role}</div>
                {careerPath.summary && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.75rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {careerPath.summary}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'2rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
            Learning journey analysis requires your profile to be complete. Add more skills to generate your path.
          </div>
        )}
      </div>
    </div>
  );

  const tabContent = { professional: renderProfile, opportunities: renderOpportunities, career: renderCareer };
  const render = tabContent[tab] || renderProfile;

  return (
    <div className="page-container" style={{ padding: '2rem 3rem' }}>
      {render()}

      {selectedOrgId && (
        <OrganizationProfileModal organizationId={selectedOrgId} onClose={() => setSelectedOrgId(null)} />
      )}
      {selectedOpportunity && (
        <InvitationModal 
          opportunity={selectedOpportunity} 
          onClose={() => setSelectedOpportunity(null)} 
          onAccept={handleAccept} 
          onReject={handleReject} 
        />
      )}
    </div>
  );
}
