import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth({ onAuth }) {
  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    onAuth(data.user, profile)
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')
    if (!fullName || !username || !email || !password) { setError('All fields are required.'); setLoading(false); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id, username, full_name: fullName
      })
      if (profileError) { setError(profileError.message); setLoading(false); return }
      setSuccess('Account created! You can now log in.')
      setTab('login')
    }
    setLoading(false)
  }

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.logo}>DI</div>
          <h1 style={s.brandName}>DevOps Interview</h1>
          <p style={s.brandSub}>AI-powered mock interviews for DevOps engineers</p>
        </div>
        <div style={s.features}>
          {[
            { icon: '🎙️', title: 'Voice & Text Modes', desc: 'Practice like a real interview' },
            { icon: '🤖', title: 'AI Interviewer', desc: 'Natural conversation, real feedback' },
            { icon: '📊', title: 'Session Reports', desc: 'Track progress, improve faster' },
            { icon: '☁️', title: '20+ DevOps Topics', desc: 'AWS, K8s, Terraform and more' },
          ].map(f => (
            <div key={f.title} style={s.feature}>
              <span style={s.featureIcon}>{f.icon}</span>
              <div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <div style={s.tabs}>
            {['login', 'register'].map(t => (
              <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => { setTab(t); setError(''); setSuccess('') }}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {error   && <div style={s.errorBox}>{error}</div>}
          {success && <div style={s.successBox}>{success}</div>}

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <button style={s.btn} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Arun Selvan" />
              <Field label="Username" value={username} onChange={setUsername} placeholder="arunselvan" />
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" />
              <button style={s.btn} disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
            </form>
          )}

          <p style={s.switchText}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span style={s.link} onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}>
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required />
    </div>
  )
}

const s = {
  page:        { display: 'flex', minHeight: '100vh', background: '#fff' },
  left:        { flex: 1, background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' },
  brand:       { marginBottom: '3rem' },
  logo:        { width: 52, height: 52, background: 'rgba(255,255,255,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, marginBottom: 16, backdropFilter: 'blur(10px)' },
  brandName:   { fontSize: 28, fontWeight: 800, marginBottom: 8 },
  brandSub:    { fontSize: 15, opacity: 0.8, lineHeight: 1.6 },
  features:    { display: 'flex', flexDirection: 'column', gap: 20 },
  feature:     { display: 'flex', alignItems: 'flex-start', gap: 14 },
  featureIcon: { fontSize: 24, marginTop: 2 },
  featureTitle:{ fontSize: 15, fontWeight: 600, marginBottom: 2 },
  featureDesc: { fontSize: 13, opacity: 0.75 },
  right:       { width: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f8fafc' },
  card:        { width: '100%', background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' },
  tabs:        { display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24 },
  tab:         { flex: 1, padding: '10px', border: 'none', borderRadius: 7, background: 'transparent', color: '#64748b', fontWeight: 500, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' },
  tabActive:   { background: '#fff', color: '#0f172a', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  label:       { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:       { width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#0f172a', outline: 'none', transition: 'border-color 0.2s', background: '#fff' },
  btn:         { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8, transition: 'background 0.2s' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 },
  successBox:  { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#16a34a', marginBottom: 16 },
  switchText:  { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' },
  link:        { color: '#2563eb', fontWeight: 600, cursor: 'pointer' },
}
