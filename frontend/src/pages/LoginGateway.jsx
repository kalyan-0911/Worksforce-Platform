import React, { useState } from 'react';
import { api } from '../services/api';

export default function LoginGateway({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Employer');
  const [jobRole, setJobRole] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.login({ email, password });
        onLoginSuccess(data.token, data.user);
      } else {
        await api.register({
          email,
          password,
          role,
          name: role === 'Professional' ? name : 'Employer Admin',
          job_role: role === 'Professional' ? jobRole : 'Employer'
        });
        const loginData = await api.login({ email, password });
        onLoginSuccess(loginData.token, loginData.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.15), transparent), #070a13',
      fontFamily: 'var(--font-family)',
      padding: '1rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.57)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            letterSpacing: '-0.5px',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            WorkForceX
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            AI-Powered Workforce Liquidity Platform
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '20px', 
          padding: '3px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '18px',
              border: 'none',
              background: isLogin ? 'var(--gradient-primary)' : 'transparent',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '18px',
              border: 'none',
              background: !isLogin ? 'var(--gradient-primary)' : 'transparent',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: '0.75rem 1rem', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '4px',
            color: '#ef4444',
            fontSize: '0.8rem',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {!isLogin && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>I am joining as an:</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setRole('Employer')}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      border: role === 'Employer' ? '1px solid var(--accent-indigo)' : '1px solid rgba(255,255,255,0.06)',
                      background: role === 'Employer' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                      color: role === 'Employer' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    Employer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('Professional')}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      border: role === 'Professional' ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.06)',
                      background: role === 'Professional' ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-tertiary)',
                      color: role === 'Professional' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    Candidate
                  </button>
                </div>
              </div>

              {role === 'Professional' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Miller"
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'var(--bg-tertiary)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-family)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Role / Title</label>
                    <input 
                      type="text" 
                      required 
                      value={jobRole} 
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder="e.g. React Developer"
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'var(--bg-tertiary)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-family)'
                      }}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--bg-tertiary)',
                color: '#fff',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-family)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--bg-tertiary)',
                color: '#fff',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-family)'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--gradient-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
              transition: 'var(--transition-fast)'
            }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {isLogin && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
            paddingTop: '0.75rem', 
            marginTop: '0.5rem',
            textAlign: 'center'
          }}>
            <strong>Demo Accounts:</strong><br />
            Employer: <code>employer@workforcex.com</code> / <code>password123</code><br />
            Candidate: <code>sarah@workforcex.com</code> / <code>password123</code>
          </div>
        )}
      </div>
    </div>
  );
}
