import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './components/Auth'
import Setup from './components/Setup'
import Interview from './components/Interview'
import Report from './components/Report'
import Dashboard from './components/Dashboard'

const SCREENS = { AUTH: 'auth', DASHBOARD: 'dashboard', SETUP: 'setup', INTERVIEW: 'interview', REPORT: 'report' }
export default function App() {
  const envMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

  const [screen,    setScreen]    = useState(SCREENS.AUTH)
  const [user,      setUser]      = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [config,    setConfig]    = useState(null)
  const [history,   setHistory]   = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [loading,   setLoading]   = useState(!envMissing)

  // Personalization & Gamification State (with localStorage fallbacks)
  const [theme,       setTheme]       = useState(localStorage.getItem('theme') || 'light')
  const [bgColor,     setBgColor]     = useState(localStorage.getItem('bg_color') || '')
  const [xp,          setXp]          = useState(0)
  const [level,       setLevel]       = useState(1)

  useEffect(() => {
    if (envMissing) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadUserAndGo(session.user)
      setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { 
        setUser(null); setProfile(null); setScreen(SCREENS.AUTH) 
        localStorage.removeItem('theme'); localStorage.removeItem('bg_color')
      }
    })
  }, [envMissing])


  // ABSOLUTE THEME SYNC
  useEffect(() => {
    console.log('Final applying theme to body:', theme)
    document.body.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-theme', theme) // Set both for safety
    localStorage.setItem('theme', theme)
    if (bgColor) {
      document.documentElement.style.setProperty('--bg', bgColor)
      localStorage.setItem('bg_color', bgColor)
    } else {
      document.documentElement.style.removeProperty('--bg')
    }
  }, [theme, bgColor])

  async function loadUserAndGo(authUser) {
    if (!authUser?.id) return
    let { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
    if (!prof) {
      const username = authUser.email.split('@')[0]
      const { data: newProf } = await supabase.from('profiles').insert({ 
        id: authUser.id, username, full_name: username, 
        metadata: { theme: 'light', xp: 0, level: 1 } 
      }).select().single()
      prof = newProf
    }
    setUser(authUser); setProfile(prof)
    const meta = prof?.metadata || {}
    if (meta.theme) setTheme(meta.theme)
    if (meta.bg_color) setBgColor(meta.bg_color)
    setXp(meta.xp || 0); setLevel(meta.level || 1)
    setScreen(SCREENS.DASHBOARD)
  }

  async function handlePersonalize(newTheme, newColor) {
    console.log('Toggling theme to:', newTheme)
    setTheme(newTheme); setBgColor(newColor)
    setProfile(prev => ({ ...prev, metadata: { ...(prev?.metadata || {}), theme: newTheme, bg_color: newColor } }))
    if (user?.id) {
      const { data } = await supabase.from('profiles').select('metadata').eq('id', user.id).maybeSingle()
      const updatedMeta = { ...(data?.metadata || {}), theme: newTheme, bg_color: newColor }
      await supabase.from('profiles').update({ metadata: updatedMeta }).eq('id', user.id)
    }
  }

  async function handleStart(cfg) {
    if (!user?.id) return
    setConfig(cfg); setHistory([])
    const { data } = await supabase.from('sessions').insert({
      user_id: user.id, topics: cfg.topicList, level: cfg.level.tag, mode: cfg.mode,
      interview_type: cfg.interviewType, total_questions: cfg.totalQ, completed: false
    }).select().single()
    if (data) setSessionId(data.id)
    setScreen(SCREENS.INTERVIEW)
  }

  async function handleComplete(finalHistory) {
    setHistory(finalHistory)
    const avgScore = finalHistory.length > 0 ? Math.round((finalHistory.reduce((a, b) => a + b.score, 0) / finalHistory.length) * 10) / 10 : 0
    const allImprove = [...new Set(finalHistory.flatMap(h => h.improvePoints || []))].filter(Boolean)
    if (sessionId && sessionId !== 'null') {
      await supabase.from('sessions').update({ history: finalHistory, improve_points: allImprove, avg_score: avgScore, completed: true }).eq('id', sessionId)
    }
    const sessionXp = 50 + (finalHistory.length * 10)
    const newXp = xp + sessionXp; const newLvl = Math.floor(newXp / 500) + 1
    setXp(newXp); setLevel(newLvl)
    if (user?.id) {
      const { data: existing } = await supabase.from('profiles').select('metadata').eq('id', user.id).maybeSingle()
      const updatedMeta = { ...(existing?.metadata || {}), xp: newXp, level: newLvl }
      await supabase.from('profiles').update({ metadata: updatedMeta }).eq('id', user.id)
    }
    setScreen(SCREENS.REPORT)
  }

  if (envMissing) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
        <h1 style={{ color: 'var(--red)', marginBottom: 10 }}>Missing API Keys</h1>
        <p style={{ maxWidth: 500, color: 'var(--text2)', lineHeight: 1.6 }}>
          It looks like your Supabase credentials are missing. If you are on Vercel, please add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> to your Environment Variables and redeploy.
        </p>
      </div>
    )
  }

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>

  return (
    <div className="app-main">
      {screen === SCREENS.AUTH      && <Auth onAuth={loadUserAndGo} />}
      {screen === SCREENS.DASHBOARD && profile && (
        <Dashboard profile={profile} theme={theme} bgColor={bgColor} 
          onStartSession={() => setScreen(SCREENS.SETUP)} 
          onLogout={() => supabase.auth.signOut()}
          onPersonalize={handlePersonalize}
          onUpdateProfile={(newProf) => setProfile(newProf)}
          onViewReport={(sess) => {
            setConfig({ level: { tag: sess.level }, topicList: sess.topics, mode: sess.mode, interviewType: sess.interview_type || 'technical' })
            setHistory(sess.history); setSessionId(sess.id); setScreen(SCREENS.REPORT)
          }}
        />
      )}
      {screen === SCREENS.SETUP     && <Setup profile={profile} theme={theme} bgColor={bgColor} onPersonalize={handlePersonalize} onStart={handleStart} onLogout={() => supabase.auth.signOut()} onGoBack={() => setScreen(SCREENS.DASHBOARD)} />}
      {screen === SCREENS.INTERVIEW && config && <Interview config={config} profile={profile} theme={theme} bgColor={bgColor} onPersonalize={handlePersonalize} onComplete={handleComplete} onSaveSession={() => {}} onGoHome={() => setScreen(SCREENS.DASHBOARD)} />}
      {screen === SCREENS.REPORT    && config && <Report history={history} config={config} profile={profile} theme={theme} bgColor={bgColor} onPersonalize={handlePersonalize} onRestart={() => setScreen(SCREENS.SETUP)} onGoHome={() => setScreen(SCREENS.DASHBOARD)} />}
    </div>
  )
}
