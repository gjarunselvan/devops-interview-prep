import { useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      {/* PROFESSIONAL NAVBAR (Interview Style) */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>{isMobile ? 'Platform' : 'DevOps Career Platform'}</span>
        </div>
        {!isMobile && <div style={s.navRight}><span style={s.badge}>SYSTEM SECURE</span></div>}
      </nav>

      <div style={s.container}>
        <div style={s.hero}>
          <h1 style={s.heroTitle}>Initialize <span style={{ color: 'var(--primary)' }}>Identity</span></h1>
          <p style={s.heroSub}>Access your high-density DevOps career simulation and performance dashboard.</p>
        </div>

        <div style={{ ...s.authCard, maxWidth: isMobile ? '100%' : '500px' }}>
          <div className="card" style={{ padding: isMobile ? '1.5rem' : '2.5rem' }}>
            <div style={s.tabs}>
              {['login', 'register'].map(t => (
                <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => { setTab(t); setError(''); setSuccess('') }}>
                  {t === 'login' ? 'SIGN IN' : 'REGISTER'}
                </button>
              ))}
            </div>

            {error   && <div style={s.errorBox}>{error}</div>}
            {success && <div style={s.successBox}>{success}</div>}

            {tab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div style={s.field}><label style={s.label}>Work Email</label><input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="engineer@domain.com" /></div>
                <div style={s.field}><label style={s.label}>Terminal Password</label><input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" /></div>
                <button style={s.submitBtn} disabled={loading}>{loading ? 'SYNCING...' : 'INITIATE TERMINAL →'}</button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div style={s.field}><label style={s.label}>Full Name</label><input style={s.input} value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Arun Selvan" /></div>
                <div style={s.field}><label style={s.label}>Identity Handle</label><input style={s.input} value={username} onChange={e => setUsername(e.target.value)} required placeholder="arun_sre" /></div>
                <div style={s.field}><label style={s.label}>Work Email</label><input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="engineer@domain.com" /></div>
                <div style={s.field}><label style={s.label}>Security Key</label><input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 characters" /></div>
                <button style={s.submitBtn} disabled={loading}>{loading ? 'PROVISIONING...' : 'CREATE IDENTITY →'}</button>
              </form>
            )}
          </div>
          <p style={s.footerText}>Secure Session · Professional DevOps Assessment</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:         { minHeight: '100vh', background: 'var(--bg)', width: '100%', overflowX: 'hidden' },
  nav:          { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft:      { display: 'flex', alignItems: 'center', gap: 12 },
  logo:         { width: 34, height: 34, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 },
  navTitle:     { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:     { display: 'flex', alignItems: 'center' },
  badge:        { fontSize: 10, fontWeight: 900, color: 'var(--green)', padding: '4px 10px', background: 'var(--green-l)', borderRadius: 6, letterSpacing: '0.05em' },
  
  container:    { maxWidth: 1200, margin: '0 auto', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  hero:         { textAlign: 'center', marginBottom: '3rem' },
  heroTitle:    { fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 950, color: 'var(--text)', letterSpacing: '-0.04em' },
  heroSub:      { fontSize: 18, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6, maxWidth: 550, margin: '12px auto 0' },
  
  authCard:     { width: '100%' },
  tabs:         { display: 'flex', gap: 8, background: 'var(--surface2)', padding: 6, borderRadius: 12, marginBottom: 30 },
  tab:          { flex: 1, padding: '14px', borderRadius: 9, fontSize: 12, fontWeight: 900, color: 'var(--muted)', background: 'transparent' },
  tabActive:    { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow)' },
  
  field:        { marginBottom: 20 },
  label:        { display: 'block', fontSize: 10, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.08em' },
  input:        { width: '100%', padding: '14px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 15, outline: 'none' },
  
  submitBtn:    { width: '100%', padding: '18px', background: 'var(--primary)', color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 900, marginTop: 15, boxShadow: '0 10px 24px var(--primary-glow)' },
  errorBox:     { padding: '14px', background: 'var(--red-l)', color: 'var(--red)', borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 25, border: '1px solid var(--red)' },
  successBox:   { padding: '14px', background: 'var(--green-l)', color: 'var(--green)', borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 25, border: '1px solid var(--green)' },
  footerText:   { textAlign: 'center', fontSize: 10, fontWeight: 800, color: 'var(--muted2)', marginTop: 25, textTransform: 'uppercase', letterSpacing: '0.1em' }
}
