import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth({ onAuth }) {
  const [loading, setLoading] = useState(false)
  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [mode,     setMode]     = useState('login') 

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Check your email for the confirmation link!')
      } else {
        const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (user) onAuth(user)
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.blob1} />
      <div style={s.blob2} />
      
      <div style={s.authContainer}>
        <div style={s.header}>
          <div style={s.logo}>DI</div>
          <h1 style={s.title}>DevOps <span style={s.accent}>Interview</span></h1>
          <p style={s.subtitle}>Master technical excellence with AI-led simulations.</p>
        </div>

        <div style={s.card}>
          <div style={s.tabs}>
            <button style={{ ...s.tab, borderBottomColor: mode === 'login' ? 'var(--primary)' : 'transparent', color: mode === 'login' ? 'var(--primary)' : 'var(--muted)' }} onClick={() => setMode('login')}>Sign In</button>
            <button style={{ ...s.tab, borderBottomColor: mode === 'signup' ? 'var(--primary)' : 'transparent', color: mode === 'signup' ? 'var(--primary)' : 'var(--muted)' }} onClick={() => setMode('signup')}>Create Account</button>
          </div>

          <form style={s.form} onSubmit={handleAuth}>
            <div style={s.inputGroup}>
              <label style={s.label}>Email Address</label>
              <input style={s.input} type="email" placeholder="alex@devops.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={s.inputGroup}>
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            
            <button style={s.submitBtn} disabled={loading}>
              {loading ? 'Processing...' : mode === 'login' ? 'Continue' : 'Join the Platform'}
            </button>
          </form>

          <div style={s.footer}>
            Secure authentication powered by <span style={s.supabase}>Supabase</span>
          </div>
        </div>

        <div style={s.featuresGrid}>
          <div style={s.featureItem}>
            <span style={s.featureIcon}>⚡</span>
            <span style={s.featureText}>Real-time Feedback</span>
          </div>
          <div style={s.featureItem}>
            <span style={s.featureIcon}>📈</span>
            <span style={s.featureText}>Skill Roadmaps</span>
          </div>
          <div style={s.featureItem}>
            <span style={s.featureIcon}>🎮</span>
            <span style={s.featureText}>Gamified Learning</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' },
  blob1: { position: 'absolute', width: 600, height: 600, background: 'var(--primary-l)', borderRadius: '50%', top: -200, left: -200, filter: 'blur(100px)', opacity: 0.5, zIndex: 0 },
  blob2: { position: 'absolute', width: 600, height: 600, background: 'var(--primary-l)', borderRadius: '50%', bottom: -200, right: -200, filter: 'blur(100px)', opacity: 0.5, zIndex: 0 },
  authContainer: { width: '100%', maxWidth: 440, padding: '2rem', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' },
  header: { textAlign: 'center' },
  logo: { width: 48, height: 48, background: 'var(--primary)', color: '#fff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, margin: '0 auto 1.5rem', boxShadow: '0 8px 16px var(--primary-glow)' },
  title: { fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '0.5rem' },
  accent: { color: 'var(--primary)' },
  subtitle: { fontSize: '1rem', color: 'var(--muted)', fontWeight: 500 },
  card: { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: '2.5rem', overflow: 'hidden' },
  tabs: { display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' },
  tab: { background: 'none', padding: '0.75rem 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.02em' },
  input: { padding: '14px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 15, outline: 'none', background: 'var(--bg)', color: 'var(--text)', transition: 'border-color 0.2s' },
  submitBtn: { marginTop: '0.5rem', padding: '14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px var(--primary-glow)' },
  footer: { marginTop: '2rem', textAlign: 'center', fontSize: 12, color: 'var(--muted)', fontWeight: 500 },
  supabase: { color: '#3ecf8e', fontWeight: 700 },
  featuresGrid: { display: 'flex', justifyContent: 'center', gap: '1.5rem' },
  featureItem: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', padding: '8px 14px', borderRadius: 30, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  featureIcon: { fontSize: 14 },
  featureText: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
}
