import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth({ onAuth }) {
  const [loading, setLoading] = useState(false)
  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [mode,     setMode]     = useState('login') // login or signup

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
      <div style={s.leftCol}>
        <div style={s.brand}>
          <div style={s.logo}>DI</div>
          <h1 style={s.brandTitle}>DevOps <span style={s.accent}>Interview</span></h1>
        </div>
        <h2 style={s.heroText}>Master your next DevOps interview with AI-powered simulations.</h2>
        <div style={s.features}>
          <div style={s.feature}>✓ Realistic technical screens</div>
          <div style={s.feature}>✓ Experience-based difficulty</div>
          <div style={s.feature}>✓ Detailed feedback & scoring</div>
          <div style={s.feature}>✓ Personalized study roadmaps</div>
        </div>
      </div>

      <div style={s.rightCol}>
        <div style={s.authCard}>
          <h3 style={s.authTitle}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
          <p style={s.authSub}>{mode === 'login' ? 'Enter your credentials to continue' : 'Sign up to start your prep journey'}</p>
          
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
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div style={s.switchMode}>
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button style={s.switchBtn} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', background: 'var(--bg)' },
  leftCol: { flex: 1.2, background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' },
  brand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' },
  logo: { background: 'var(--primary)', padding: '10px 14px', borderRadius: 10, fontWeight: 800, fontSize: 20 },
  brandTitle: { fontSize: 24, fontWeight: 700 },
  accent: { color: 'var(--primary)' },
  heroText: { fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '2rem' },
  features: { display: 'flex', flexDirection: 'column', gap: '1rem', color: '#94a3b8' },
  feature: { fontSize: '1.1rem', fontWeight: 500 },
  rightCol: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  authCard: { width: '100%', maxWidth: 400, background: '#fff', padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' },
  authTitle: { fontSize: 24, fontWeight: 800, marginBottom: '0.5rem' },
  authSub: { color: 'var(--muted)', fontSize: 14, marginBottom: '2rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-2)' },
  input: { padding: '12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg)' },
  submitBtn: { marginTop: '0.5rem', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer' },
  switchMode: { marginTop: '1.5rem', textAlign: 'center', fontSize: 14, color: 'var(--muted)' },
  switchBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }
}
