import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import CandidateProfileModal from '../components/modals/CandidateProfileModal';
import CreateRequisitionModal from '../components/modals/CreateRequisitionModal';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Pending:            { bg: 'rgba(251,191,36,0.1)',  color: '#f59e0b', label: 'Pending' },
  Accepted:           { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'Accepted' },
  Rejected:           { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Rejected' },
  Candidate_Requested:{ bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'Candidate Request' },
};

function StatCard({ label, value, color = '#4f46e5', sub }) {
  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', label: status };
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}>
      {s.label}
    </span>
  );
}

export default function EmployerDashboard({ activeTab, setActiveTab }) {
  const [org, setOrg]                   = useState(null);
  const [analytics, setAnalytics]       = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [projects, setProjects]         = useState([]);
  const [invitations, setInvitations]   = useState([]);
  const [loading, setLoading]           = useState(true);

  // Requirements tab state
  const [selectedReq, setSelectedReq]             = useState(null);
  const [matches, setMatches]                     = useState([]);
  const [loadingMatches, setLoadingMatches]        = useState(false);
  const [showCreateModal, setShowCreateModal]      = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedMatchInfo, setSelectedMatchInfo] = useState(null);
  const [hasRunMatch, setHasRunMatch]             = useState(false);
  
  // Rejection & Replacement state
  const [rejectedIds, setRejectedIds]             = useState(new Set());

  // Squad Deploy state
  const [deployingSquad, setDeployingSquad] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [squadRolesInput, setSquadRolesInput] = useState('');
  const [squadDescription, setSquadDescription] = useState('');
  const [recommendedSquad, setRecommendedSquad] = useState(null);
  const [recommendError, setRecommendError] = useState('');
  const [loadingSquadRecommendation, setLoadingSquadRecommendation] = useState(false);

  const tab = activeTab || 'employer';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, reqs, projs, opps, orgData] = await Promise.allSettled([
        api.getAnalytics(),
        api.getRequisitions(),
        api.getProjects(),
        api.getEmployerOpportunities(),
        api.getMyOrganization(),
      ]);

      if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value);
      if (reqs.status === 'fulfilled') {
        setRequisitions(reqs.value || []);
      }
      if (projs.status === 'fulfilled') setProjects(projs.value || []);
      if (opps.status === 'fulfilled') setInvitations(opps.value || []);
      if (orgData.status === 'fulfilled') setOrg(orgData.value);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectRequirement = (req) => {
    setSelectedReq(req);
    setMatches([]);
    setHasRunMatch(false);
    setRejectedIds(new Set());
  };

  const handleRunMatch = async (reqId) => {
    setLoadingMatches(true);
    setHasRunMatch(true);
    try {
      const data = await api.getRequisitionMatches(reqId);
      setMatches(data.matches || []);
    } catch (e) {
      console.error('Match load error', e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleApproveInvitation = async (id) => {
    try {
      await api.approveOpportunity(id);
      load();
    } catch(e) { toast.error(e.message || 'An error occurred'); }
  };

  const handleRecommendSquad = async (e) => {
    e.preventDefault();
    if (!squadRolesInput.trim() || !squadName.trim()) {
      setRecommendError('Project Name and Required Roles are required.');
      return;
    }
    setLoadingSquadRecommendation(true);
    setRecommendError('');
    setRecommendedSquad(null);
    try {
      const rolesArray = squadRolesInput.split(',').map(r => r.trim()).filter(Boolean);
      const data = await api.recommendSquad({ roles: rolesArray });
      setRecommendedSquad(data);
    } catch (err) {
      setRecommendError(err.message || 'Squad composition recommendation failed.');
    } finally {
      setLoadingSquadRecommendation(false);
    }
  };

  const handleDeploySquad = async () => {
    if (!recommendedSquad || !squadName.trim()) return;
    try {
      const memberIds = recommendedSquad.squad.map(slot => slot.professional.id);
      await api.deployTeam({
        name: squadName,
        description: squadDescription,
        memberIds
      });
      toast.success(`AI Squad successfully generated! Invitations sent to recommended candidates.`);
      setDeployingSquad(false);
      setSquadName('');
      setSquadRolesInput('');
      setSquadDescription('');
      setRecommendedSquad(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to deploy squad.');
    }
  };

  const handleRejectCandidate = (candId) => {
    setRejectedIds(prev => {
      const next = new Set(prev);
      next.add(candId);
      return next;
    });
  };

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="page-container" style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <div style={{ width:40, height:40, border:'3px solid rgba(0,0,0,0.05)', borderTopColor:'var(--accent-cyan)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  );

  // ── OVERVIEW TAB ──────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div>
      {/* Org Banner */}
      {org && (
        <div className="glass-card" style={{ marginBottom:'1.5rem', background:'linear-gradient(135deg,rgba(79,70,229,0.08) 0%,rgba(147,51,234,0.05) 100%)', borderLeft:'4px solid var(--accent-indigo)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:0 }}>{org.company_name || 'Your Organization'}</h2>
              <div style={{ color:'var(--text-secondary)', marginTop:'0.25rem' }}>{org.industry || 'Technology'} · {org.location || 'Global'} · {org.company_size || 'Enterprise'}</div>
              {org.website && <a href={org.website} style={{ fontSize:'0.8rem', color:'var(--accent-cyan)' }} target="_blank" rel="noreferrer">{org.website}</a>}
            </div>
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              <span style={{ padding:'0.25rem 0.75rem', borderRadius:'10px', fontSize:'0.75rem', background:'rgba(16,185,129,0.1)', color:'#10b981', border:'1px solid #10b981' }}>✓ Active</span>
              {org.verified && <span style={{ padding:'0.25rem 0.75rem', borderRadius:'10px', fontSize:'0.75rem', background:'rgba(99,102,241,0.1)', color:'#6366f1', border:'1px solid #6366f1' }}>✓ Verified</span>}
            </div>
          </div>
          {org.description && <p style={{ marginTop:'1rem', fontSize:'0.9rem', color:'var(--text-secondary)', lineHeight:1.6 }}>{org.description}</p>}
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-grid" style={{ marginBottom:'1.5rem' }}>
        <StatCard label="Active Projects" value={projects.filter(p => p.status === 'Active').length} color="var(--accent-indigo)" sub="Currently running" />
        <StatCard label="Open Requirements" value={requisitions.filter(r => r.status !== 'Completed').length} color="var(--accent-cyan)" sub="Awaiting candidates" />
        <StatCard label="Pending Invitations" value={invitations.filter(i => i.status === 'Pending').length} color="#f59e0b" sub="Candidates to respond" />
        <StatCard label="Accepted Candidates" value={invitations.filter(i => i.status === 'Accepted').length} color="#10b981" sub="Confirmed for projects" />
        <StatCard label="Talent Pool (Platform)" value={analytics?.marketplace?.totalTalent || 0} color="#8b5cf6" sub={`${analytics?.marketplace?.benchCount || 0} available now`} />
        <StatCard label="Utilization Rate" value={analytics?.marketplace?.utilizationRate || '—'} color="#ec4899" sub="Platform-wide" />
      </div>

      {/* Visual Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem', color: 'var(--text-primary)' }}>Platform Talent Availability</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Available (Bench)', value: analytics?.marketplace?.benchCount || 100 },
                    { name: 'Engaged', value: (analytics?.marketplace?.totalTalent || 150) - (analytics?.marketplace?.benchCount || 100) }
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#06b6d4" />
                  <Cell fill="#6366f1" />
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem', color: 'var(--text-primary)' }}>Requirement Pipeline</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Draft', count: requisitions.filter(r => r.status === 'Draft').length || 0 },
                { name: 'Open', count: requisitions.filter(r => r.status === 'Open').length || 0 },
                { name: 'Completed', count: requisitions.filter(r => r.status === 'Completed').length || 0 }
              ]}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:'1.5rem', flexWrap:'wrap' }}>
        <div className="glass-card">
          <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem' }}>Recent Invitations</h3>
          {invitations.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'2rem 0' }}>No invitations yet. Create a requirement to get started.</div>
          ) : (
            invitations.slice(0,5).map((inv, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 0', borderBottom:'1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{inv.candidate_name || inv.candidate_id}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{inv.role || inv.project_name}</div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  <StatusBadge status={inv.status} />
                  {inv.status === 'Candidate_Requested' && (
                    <button onClick={() => handleApproveInvitation(inv.id)}
                      style={{ padding:'0.2rem 0.6rem', background:'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'4px', fontSize:'0.7rem', cursor:'pointer', fontWeight:600 }}>
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {invitations.length > 5 && (
            <button onClick={() => setActiveTab('invitations')}
              style={{ marginTop:'0.75rem', width:'100%', padding:'0.5rem', background:'rgba(0,0,0,0.04)', border:'1px solid var(--border-color)', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
              View all {invitations.length} invitations →
            </button>
          )}
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem' }}>Active Projects</h3>
          {projects.length === 0 ? (
            <div style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'2rem 0' }}>No projects yet. Deploy a team from Requirements.</div>
          ) : (
            projects.map((p, i) => (
              <div key={i} style={{ padding:'0.75rem 0', borderBottom:'1px solid var(--border-color)' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{p.name || p.id}</div>
                  <span style={{ fontSize:'0.7rem', padding:'0.2rem 0.5rem', borderRadius:'8px', background: p.status==='Active'?'rgba(16,185,129,0.1)':'rgba(0,0,0,0.05)', color: p.status==='Active'?'#10b981':'var(--text-muted)' }}>{p.status || 'Draft'}</span>
                </div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>{(p.members || []).length} members · Team size: {p.size || '—'}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // ── REQUIREMENTS TAB ─────────────────────────────────────────────────────
  const renderRequirements = () => {
    // Only show active matches that haven't been rejected
    const activeMatches = matches.filter(m => !rejectedIds.has(m.id));
    // Match limit is requirement team size or 3
    const matchLimit = selectedReq ? Math.max(3, parseInt(selectedReq.team_size, 10) || 3) : 3;
    const visibleMatches = activeMatches.slice(0, matchLimit);

    return (
      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:'2rem' }}>
        {/* Req list */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
            <h3 style={{ fontWeight:600, fontSize:'1.1rem', margin:0 }}>Requirements</h3>
            <button onClick={() => setShowCreateModal(true)}
              style={{ padding:'0.45rem 1rem', background:'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
              + Create Req
            </button>
          </div>
          {requisitions.length === 0 ? (
            <div className="glass-card" style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>
              No requirements yet.<br />Create your first one to match candidates.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {requisitions.map((req, i) => (
                <div key={i} onClick={() => selectRequirement(req)}
                  className="glass-card"
                  style={{ padding:'0.9rem 1rem', cursor:'pointer', borderLeft: selectedReq?.id === req.id ? '3px solid var(--accent-indigo)' : '3px solid transparent', transition:'all 0.15s' }}>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{req.role}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>{req.project_name || req.project_id}</div>
                  <div style={{ marginTop:'0.4rem' }}>
                    <span style={{ fontSize:'0.68rem', padding:'0.15rem 0.4rem', borderRadius:'8px', background: req.status==='Open'?'rgba(6,182,212,0.1)':'rgba(0,0,0,0.05)', color: req.status==='Open'?'var(--accent-cyan)':'var(--text-muted)' }}>
                      {req.status || 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details & AI matches panel */}
        <div className="glass-card">
          {!selectedReq ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'300px', color:'var(--text-muted)', fontSize:'0.9rem' }}>
              Select a requirement to view details and match candidates
            </div>
          ) : (
            <div>
              {/* Requirement Details Header */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{selectedReq.role}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Project: <strong>{selectedReq.project_name || selectedReq.project_id}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '8px', background: 'rgba(8,145,178,0.1)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {selectedReq.status}
                    </span>
                    <button onClick={async () => {
                      if(window.confirm('Delete this requirement?')) {
                        try {
                          await fetch(`http://localhost:5000/api/requisitions/${selectedReq.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('workforcex_token')}` }});
                          setSelectedReq(null);
                          load();
                        } catch(e) { toast.error(e.message || 'An error occurred'); }
                      }
                    }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Experience Level</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedReq.experience || 'Not specified'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Duration</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedReq.duration ? `${selectedReq.duration} months` : 'Not specified'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Team Size</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedReq.team_size || 1} Positions</span>
                  </div>
                </div>

                {selectedReq.project_description && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Job Description</span>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{selectedReq.project_description}</p>
                  </div>
                )}

                {selectedReq.required_skills && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Required Skills</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {selectedReq.required_skills.map((s, idx) => (
                        <span key={idx} style={{ padding: '0.15rem 0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {typeof s === 'string' ? s : s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!hasRunMatch && (
                  <button 
                    onClick={() => handleRunMatch(selectedReq.id)}
                    style={{ marginTop: '1.25rem', width: '100%', padding: '0.65rem', background: 'var(--gradient-primary)', border: 'none', color: '#fff', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    🔍 Run AI Match for this Role
                  </button>
                )}
              </div>

              {/* AI Matches Section */}
              {hasRunMatch && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>AI Match Recommendations</h4>
                  {loadingMatches ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'150px', gap:'0.75rem' }}>
                      <div style={{ width:24, height:24, border:'2px solid rgba(0,0,0,0.05)', borderTopColor:'var(--accent-cyan)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
                      <span style={{ color:'var(--text-secondary)', fontSize:'0.82rem' }}>Running AI matching engine…</span>
                    </div>
                  ) : visibleMatches.length === 0 ? (
                    <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)', border:'1px dashed var(--border-color)', borderRadius:'8px', fontSize: '0.82rem' }}>
                      No bench candidates match this requirement. Try recruiting outside the bench.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                      {visibleMatches.map((m, i) => (
                        <div key={m.id} className="fade-in" style={{ padding:'1.1rem', background: i===0?'rgba(79,70,229,0.03)':'var(--bg-tertiary)', borderRadius:'10px', border:'1px solid var(--border-color)', position:'relative', transition: 'all 0.3s ease' }}>
                          {i === 0 && <div style={{ position:'absolute', top:'-8px', left:'12px', background:'var(--gradient-primary)', color:'#fff', fontSize:'0.65rem', fontWeight:700, padding:'0.15rem 0.5rem', borderRadius:'6px' }}>BEST MATCH</div>}
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{m.name}</div>
                              <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginTop:'0.1rem' }}>{m.role || '—'}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:'1.4rem', fontWeight:700, color: m.matchScore >= 75 ? '#10b981' : m.matchScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                                {m.matchScore}%
                              </div>
                              <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>match score</div>
                            </div>
                          </div>

                          {m.explanation && (
                            <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.5, margin:'0.6rem 0 0.6rem', padding:'0.6rem', background:'rgba(0,0,0,0.03)', borderRadius:'6px', borderLeft:'3px solid var(--accent-cyan)' }}>
                              🤖 {m.explanation}
                            </p>
                          )}

                          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', margin:'0.5rem 0' }}>
                            {(m.overlappingSkills || []).slice(0,4).map((s,j) => (
                              <span key={j} style={{ fontSize:'0.68rem', padding:'0.2rem 0.5rem', background:'rgba(16,185,129,0.08)', color:'#10b981', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'4px' }}>✓ {s}</span>
                            ))}
                            {(m.missingSkills || []).slice(0,2).map((s,j) => (
                              <span key={j} style={{ fontSize:'0.68rem', padding:'0.2rem 0.5rem', background:'rgba(239,68,68,0.06)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.15)', borderRadius:'4px' }}>✗ {s}</span>
                            ))}
                          </div>

                          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem' }}>
                            <button onClick={() => { setSelectedCandidate(m.id); setSelectedMatchInfo({ score: m.matchScore, explanation: m.explanation }); }}
                              style={{ flex:1, padding:'0.5rem', background:'transparent', border:'1px solid var(--accent-indigo)', color:'var(--accent-indigo)', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}>
                              View Profile
                            </button>
                            <button onClick={async () => {
                                try {
                                  await api.createOpportunity({ candidateId: m.id, projectName: selectedReq.project_name, role: selectedReq.role });
                                  toast.success(`Invitation sent to ${m.name}!`);
                                  load();
                                } catch(e) { toast.error(e.message || 'An error occurred'); }
                              }}
                              style={{ flex:1, padding:'0.5rem', background:'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}>
                              Invite
                            </button>
                            <button onClick={() => handleRejectCandidate(m.id)}
                              style={{ padding:'0.5rem 0.75rem', background:'transparent', border:'1px solid #ef4444', color:'#ef4444', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}
                              title="Reject and request AI replacement"
                            >
                              Reject & Replace
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── TEAMS TAB ─────────────────────────────────────────────────────────────
  const renderTeams = () => {
    const activeProjects = projects.filter(p => p.status === 'Active');
    const planningProjects = projects.filter(p => p.status === 'Planning' || p.status === 'Draft');

    const handleDeleteProject = async (id) => {
      if(window.confirm('Are you sure you want to delete this project team?')) {
        try {
          await fetch(`http://localhost:5000/api/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('workforcex_token')}` }});
          load();
        } catch(e) { toast.error(e.message || 'An error occurred'); }
      }
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
            <div>
              <h3 style={{ fontWeight:700, fontSize:'1.1rem', margin:0 }}>My Teams & Projects</h3>
              <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.25rem' }}>Manage your active teams and pending deployments sourced from your Requirements.</p>
            </div>
          </div>

          {/* Ongoing Teams Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>Ongoing Team Projects</h4>
            {activeProjects.length === 0 ? (
              <div className="glass-card" style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize: '0.82rem' }}>
                No active projects running at the moment. Hire candidates from the Requirements tab.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                {activeProjects.map((p, i) => (
                  <div key={i} className="glass-card">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{p.name || p.id}</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Squad Size: {p.size || '?'} · {(p.members||[]).length} assigned</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize:'0.72rem', padding:'0.25rem 0.6rem', borderRadius:'8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>
                          Active
                        </span>
                        <button onClick={() => handleDeleteProject(p.id)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                      {(p.members || []).map((m, j) => (
                        <div key={j} style={{ padding:'0.4rem 0.85rem', background:'var(--bg-tertiary)', border:'1px solid var(--border-color)', borderRadius:'8px', fontSize:'0.8rem', cursor: 'pointer' }}
                          onClick={() => setSelectedCandidate(m.id)}>
                          <span style={{ fontWeight:600 }}>{m.name || m.id}</span>
                          {m.role && <span style={{ color:'var(--text-muted)', marginLeft:'0.4rem' }}>· {m.role}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Not Yet Assigned Teams Section */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>Not Yet Assigned Teams (Pending Invitations)</h4>
            {planningProjects.length === 0 ? (
              <div className="glass-card" style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize: '0.82rem' }}>
                No pending squads or projects awaiting responses.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                {planningProjects.map((p, i) => (
                  <div key={i} className="glass-card">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{p.name || p.id}</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Squad slots: {p.size || '?'} · Awaiting responses</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize:'0.72rem', padding:'0.25rem 0.6rem', borderRadius:'8px', background: 'rgba(251,191,36,0.1)', color: '#f59e0b', fontWeight: 600 }}>
                          Pending Setup
                        </span>
                        <button onClick={() => handleDeleteProject(p.id)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                      {(p.members || []).map((m, j) => {
                        const hasJoined = m.status === 'Joined';
                        return (
                          <div 
                            key={j} 
                            onClick={() => setSelectedCandidate(m.id)}
                            style={{ 
                              padding:'0.4rem 0.85rem', 
                              background: hasJoined ? 'rgba(16,185,129,0.05)' : 'var(--bg-tertiary)', 
                              border: hasJoined ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-color)', 
                              borderRadius:'8px', 
                              fontSize:'0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ fontWeight:600, color: hasJoined ? '#10b981' : 'var(--text-primary)' }}>{m.name || m.id}</span>
                            {m.role && <span style={{ color:'var(--text-muted)', marginLeft:'0.4rem' }}>· {m.role}</span>}
                            <span style={{ fontSize: '0.7rem', color: hasJoined ? '#10b981' : '#f59e0b', marginLeft: '0.5rem', fontWeight: 600 }}>
                              ({hasJoined ? 'Accepted' : 'Pending'})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── INVITATIONS TAB ───────────────────────────────────────────────────────
  const renderInvitations = () => {
    const pending   = invitations.filter(i => i.status === 'Pending');
    const requested = invitations.filter(i => i.status === 'Candidate_Requested');
    const accepted  = invitations.filter(i => i.status === 'Accepted');
    const rejected  = invitations.filter(i => i.status === 'Rejected');

    const Section = ({ title, items, color }) => (
      <div className="glass-card" style={{ marginBottom:'1rem' }}>
        <h3 style={{ fontSize:'0.9rem', fontWeight:700, color, marginBottom:'0.75rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>{title} ({items.length})</h3>
        {items.length === 0 ? (
          <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', padding:'0.5rem 0' }}>None</div>
        ) : items.map((inv, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0', borderBottom:'1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{inv.candidate_name || inv.candidate_id}</div>
              <div style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>{inv.role} · {inv.project_name} · Readiness: {inv.candidate_readiness || '—'}%</div>
            </div>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <StatusBadge status={inv.status} />
              {inv.status === 'Candidate_Requested' && (
                <button onClick={() => handleApproveInvitation(inv.id)}
                  style={{ padding:'0.25rem 0.65rem', background:'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'5px', fontSize:'0.72rem', cursor:'pointer', fontWeight:600 }}>
                  Approve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );

    return (
      <div>
        <h3 style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:'1.25rem' }}>Invitation Tracking</h3>
        {invitations.length === 0 ? (
          <div className="glass-card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
            No invitations have been sent yet. Start by creating a requirement and inviting AI-matched candidates.
          </div>
        ) : (
          <>
            {requested.length > 0 && <Section title="Candidate Requests (Action Required)" items={requested} color="#6366f1" />}
            <Section title="Awaiting Response" items={pending} color="#f59e0b" />
            <Section title="Accepted" items={accepted} color="#10b981" />
            <Section title="Rejected" items={rejected} color="#ef4444" />
          </>
        )}
      </div>
    );
  };

  const tabContent = {
    employer:     renderOverview,
    requirements: renderRequirements,
    teams:        renderTeams,
    invitations:  renderInvitations,
  };

  const render = tabContent[tab] || renderOverview;

  return (
    <div className="page-container" style={{ padding: '2rem 3rem' }}>
      {render()}

      {showCreateModal && (
        <CreateRequisitionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); load(); }}
        />
      )}

      {selectedCandidate && (
        <CandidateProfileModal
          candidateId={selectedCandidate}
          matchInfo={selectedMatchInfo}
          requisition={selectedReq}
          onClose={() => { setSelectedCandidate(null); setSelectedMatchInfo(null); }}
        />
      )}
    </div>
  );
}
