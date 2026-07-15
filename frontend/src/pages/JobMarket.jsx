import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import OrganizationProfileModal from '../components/modals/OrganizationProfileModal';

export default function JobMarket() {
  const [jobs, setJobs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [skillFilter, setSkill]   = useState('');
  const [locationFilter, setLoc]  = useState('');
  const [loading, setLoading]     = useState(true);
  const [requesting, setRequesting] = useState({});
  const [selectedOrgName, setSelectedOrgName] = useState(null);
  const [topMatches, setTopMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [marketInsight, setMarketInsight] = useState(null);

  const PER_PAGE = 15;

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getJobPostings(page, PER_PAGE, skillFilter, locationFilter, search);
      setJobs(data.jobs || data || []);
      setTotal(data.total || (data.jobs || data || []).length);
    } catch(e) {
      console.error('Jobs load error', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, skillFilter, locationFilter]);

  useEffect(() => {
    const delay = setTimeout(loadJobs, 400);
    return () => clearTimeout(delay);
  }, [loadJobs]);

  useEffect(() => {
    // Load top AI matches once
    api.getReverseMatches()
      .then(m => setTopMatches(m || []))
      .catch(() => {})
      .finally(() => setMatchesLoading(false));

    // Load market insights
    api.getMarketInsights()
      .then(d => setMarketInsight(d))
      .catch(() => {});
  }, []);

  const handleExpressInterest = async (jobId, idx) => {
    setRequesting(prev => ({ ...prev, [idx]: true }));
    try {
      await api.requestOpportunity(jobId);
      toast.success('Interest expressed! The employer will be notified.');
    } catch(e) {
      toast.error(e.message || 'An error occurred');
    } finally {
      setRequesting(prev => ({ ...prev, [idx]: false }));
    }
  };

  return (
    <div className="page-container" style={{ maxWidth:'1200px', marginLeft:'auto', marginRight:'auto' }}>
      {/* Header */}
      <div style={{ marginBottom:'1.75rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, background:'var(--gradient-primary)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', display:'inline-block' }}>
          Job Market
        </h1>
        <p style={{ color:'var(--text-secondary)', marginTop:'0.25rem', fontSize:'0.9rem' }}>
          Browse {total.toLocaleString()} open opportunities · AI-matched to your profile
        </p>
      </div>

      {/* AI Top 3 matches */}
      {!matchesLoading && topMatches.length > 0 && (
        <div className="glass-card" style={{ marginBottom:'1.75rem', background:'linear-gradient(135deg,rgba(79,70,229,0.05) 0%,rgba(147,51,234,0.04) 100%)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem' }}>
            <span style={{ fontSize:'1.1rem' }}>🤖</span>
            <h3 style={{ fontWeight:700, fontSize:'1rem', margin:0 }}>AI Recommended — Top Matches for You</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'0.85rem' }}>
            {topMatches.slice(0,3).map((m, i) => (
              <div key={i} style={{ padding:'1rem', background:'white', borderRadius:'10px', border:'1px solid var(--border-color)', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, marginRight:'0.5rem' }}>
                    <div style={{ fontWeight:700, fontSize:'0.9rem', lineHeight:1.3 }}>{m.title}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.15rem' }}>{m.company} · {m.location}</div>
                  </div>
                  <div style={{ fontWeight:700, color:'#10b981', fontSize:'1rem', whiteSpace:'nowrap' }}>{m.matchScore}% fit</div>
                </div>
                {m.explanation && (
                  <p style={{ fontSize:'0.75rem', color:'var(--text-secondary)', lineHeight:1.5, margin:'0.5rem 0', padding:'0.4rem 0.6rem', background:'rgba(16,185,129,0.05)', borderRadius:'5px', borderLeft:'2px solid #10b981' }}>
                    {m.explanation}
                  </p>
                )}
                <button onClick={() => handleExpressInterest(m.job_id, `top-${i}`)}
                  disabled={requesting[`top-${i}`]}
                  style={{ marginTop:'0.5rem', width:'100%', padding:'0.4rem', background:'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'6px', cursor:'pointer', fontSize:'0.78rem', fontWeight:600 }}>
                  {requesting[`top-${i}`] ? 'Sending…' : 'Express Interest'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Insights strip */}
      {marketInsight?.top_skills && (
        <div className="glass-card" style={{ marginBottom:'1.5rem', padding:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem' }}>
            <span style={{ fontSize:'0.9rem' }}>📊</span>
            <span style={{ fontWeight:600, fontSize:'0.85rem' }}>Top In-Demand Skills</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
            {marketInsight.top_skills.slice(0,12).map((s, i) => (
              <button key={i} onClick={() => { setSkill(s.skill || s._id || s); setPage(1); }}
                style={{ padding:'0.2rem 0.6rem', background:'rgba(79,70,229,0.08)', border:'1px solid rgba(79,70,229,0.2)', color:'var(--accent-indigo)', borderRadius:'5px', fontSize:'0.75rem', cursor:'pointer', fontWeight:500 }}>
                {s.skill || s._id || s}
                {s.count && <span style={{ color:'var(--text-muted)', marginLeft:'0.3rem' }}>({s.count})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="glass-card" style={{ marginBottom:'1.25rem', padding:'1rem' }}>
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
          <input
            placeholder="Search jobs…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex:'2', minWidth:'180px', padding:'0.6rem 0.9rem', border:'1px solid var(--border-color)', borderRadius:'6px', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:'0.88rem' }}
          />
          <input
            placeholder="Filter by skill…"
            value={skillFilter}
            onChange={e => { setSkill(e.target.value); setPage(1); }}
            style={{ flex:'1', minWidth:'140px', padding:'0.6rem 0.9rem', border:'1px solid var(--border-color)', borderRadius:'6px', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:'0.88rem' }}
          />
          <input
            placeholder="Location…"
            value={locationFilter}
            onChange={e => { setLoc(e.target.value); setPage(1); }}
            style={{ flex:'1', minWidth:'120px', padding:'0.6rem 0.9rem', border:'1px solid var(--border-color)', borderRadius:'6px', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:'0.88rem' }}
          />
          {(search || skillFilter || locationFilter) && (
            <button onClick={() => { setSearch(''); setSkill(''); setLoc(''); setPage(1); }}
              style={{ padding:'0.6rem 0.9rem', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', borderRadius:'6px', cursor:'pointer', fontSize:'0.82rem' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Job List */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
          <div style={{ width:36, height:36, border:'3px solid rgba(0,0,0,0.05)', borderTopColor:'var(--accent-indigo)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>🔍</div>
          <div style={{ fontWeight:600, marginBottom:'0.5rem' }}>No jobs found</div>
          <div style={{ fontSize:'0.85rem' }}>Try adjusting your search or filters.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {jobs.map((job, i) => {
            const skills = Array.isArray(job.skills) ? job.skills : (typeof job.skills === 'string' ? job.skills.split(',').map(s=>s.trim()) : []);
            return (
              <div key={i} className="glass-card" style={{ padding:'1rem 1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.5rem' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                      <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{job.title || job.role}</div>
                      {job.employment_type && (
                        <span style={{ padding:'0.15rem 0.45rem', borderRadius:'5px', fontSize:'0.68rem', background:'rgba(79,70,229,0.08)', color:'var(--accent-indigo)', border:'1px solid rgba(79,70,229,0.15)' }}>
                          {job.employment_type}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.15rem' }}>
                      <strong style={{ color:'var(--text-primary)', cursor:'pointer' }} onClick={() => setSelectedOrgName(job.company)}>
                        {job.company}
                      </strong>
                      {job.location && <span> · {job.location}</span>}
                      {(job.experience_min || job.experience_max) && <span> · {job.experience_min}–{job.experience_max} yrs</span>}
                    </div>
                    {(job.salary_min || job.salary_max) && (
                      <div style={{ fontSize:'0.78rem', color:'#10b981', marginTop:'0.1rem' }}>
                        ₹{(job.salary_min||0).toLocaleString()} – ₹{(job.salary_max||0).toLocaleString()} / yr
                      </div>
                    )}
                    {skills.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginTop:'0.6rem' }}>
                        {skills.slice(0,6).map((s,j) => (
                          <span key={j} style={{ padding:'0.15rem 0.45rem', background:'rgba(0,0,0,0.04)', border:'1px solid var(--border-color)', borderRadius:'4px', fontSize:'0.7rem', color:'var(--text-secondary)' }}>{s}</span>
                        ))}
                        {skills.length > 6 && <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>+{skills.length-6} more</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', minWidth:'140px', alignItems:'flex-end' }}>
                    <button onClick={() => handleExpressInterest(job.job_id || job._id, i)}
                      disabled={requesting[i]}
                      style={{ padding:'0.45rem 0.9rem', background: requesting[i] ? 'var(--bg-tertiary)':'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'6px', cursor: requesting[i]?'not-allowed':'pointer', fontSize:'0.8rem', fontWeight:600, width:'100%' }}>
                      {requesting[i] ? 'Sending…' : 'Express Interest'}
                    </button>
                    <button onClick={() => setSelectedOrgName(job.company)}
                      style={{ padding:'0.35rem 0.9rem', background:'transparent', border:'1px solid var(--border-color)', color:'var(--text-secondary)', borderRadius:'6px', cursor:'pointer', fontSize:'0.78rem', width:'100%' }}>
                      View Org
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginTop:'1.5rem', alignItems:'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}
            style={{ padding:'0.4rem 0.85rem', background: page===1?'transparent':'rgba(0,0,0,0.04)', border:'1px solid var(--border-color)', borderRadius:'5px', cursor: page===1?'not-allowed':'pointer', color: page===1?'var(--text-muted)':'var(--text-primary)', fontSize:'0.82rem' }}>
            ← Prev
          </button>
          <span style={{ fontSize:'0.82rem', color:'var(--text-muted)', padding:'0 0.5rem' }}>Page {page}</span>
          <button disabled={jobs.length < PER_PAGE} onClick={() => setPage(p => p+1)}
            style={{ padding:'0.4rem 0.85rem', background: jobs.length < PER_PAGE?'transparent':'rgba(0,0,0,0.04)', border:'1px solid var(--border-color)', borderRadius:'5px', cursor: jobs.length < PER_PAGE?'not-allowed':'pointer', color: jobs.length < PER_PAGE?'var(--text-muted)':'var(--text-primary)', fontSize:'0.82rem' }}>
            Next →
          </button>
        </div>
      )}

      {/* Org Modal — search by name since job postings don't have org IDs */}
      {selectedOrgName && (
        <OrgNameModal name={selectedOrgName} onClose={() => setSelectedOrgName(null)} />
      )}
    </div>
  );
}

function OrgNameModal({ name, onClose }) {
  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    api.getPublicOrganizations()
      .then(orgs => {
        const found = (orgs || []).find(o => o.company_name === name);
        if (found) setOrgId(found.id || found._id);
      })
      .catch(() => {});
  }, [name]);

  if (!orgId) return (
    <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999 }}>
      <div className="glass-card" style={{ padding:'2.5rem', textAlign:'center', maxWidth:'400px' }}>
        <div style={{ marginBottom:'0.75rem', fontSize:'1.1rem', fontWeight:600 }}>{name}</div>
        <div style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'1.5rem' }}>
          This organization does not have a detailed profile on WorkForceX yet.
        </div>
        <button onClick={onClose} style={{ padding:'0.5rem 1.5rem', background:'var(--gradient-primary)', border:'none', color:'#fff', borderRadius:'6px', cursor:'pointer', fontWeight:600 }}>Close</button>
      </div>
    </div>
  );

  return <OrganizationProfileModal organizationId={orgId} onClose={onClose} />;
}
