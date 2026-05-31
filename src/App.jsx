import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './components/Auth'
import Setup from './components/Setup'
import Interview from './components/Interview'
import Report from './components/Report'
import Dashboard from './components/Dashboard'

const SCREENS = { AUTH: 'auth', DASHBOARD: 'dashboard', SETUP: 'setup', INTERVIEW: 'interview', REPORT: 'report' }

export default function App() {
  const [screen,    setScreen]    = useState(SCREENS.AUTH)
  const [user,      setUser]      = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [config,    setConfig]    = useState(null)
  const [history,   setHistory]   = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [loading,   setLoading]   = useState(true)

  // Personalization, Gamification & UI State
  const [theme,       setTheme]       = useState('light')
  const [bgColor,     setBgColor]     = useState('')
  const [xp,          setXp]          = useState(0)
  const [level,       setLevel]       = useState(1)
  const [streak,      setStreak]      = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadUserAndGo(session.user)
      }
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); setProfile(null); setScreen(SCREENS.AUTH) }
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (bgColor) {
      document.documentElement.style.setProperty('--bg', bgColor)
    } else {
      document.documentElement.style.removeProperty('--bg')
    }
  }, [theme, bgColor])

  async function loadUserAndGo(authUser) {
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (!profile) {
      const username = authUser.email.split('@')[0]
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: authUser.id, username, full_name: username })
        .select()
        .single()
      profile = newProfile
    }

    setUser(authUser)
    setProfile(profile || { full_name: authUser.email, username: authUser.email })
    
    if (profile?.theme) setTheme(profile.theme)
    if (profile?.bg_color) setBgColor(profile.bg_color)
    setXp(profile?.xp || 0)
    setLevel(profile?.level || 1)
    
    let currentStreak = profile?.streak || 0
    const lastActive = profile?.last_active ? new Date(profile.last_active) : null
    const today = new Date(); today.setHours(0,0,0,0)
    
    if (lastActive) {
      lastActive.setHours(0,0,0,0)
      const diff = (today - lastActive) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        currentStreak += 1
      } else if (diff > 1) {
        currentStreak = 1 
      }
    } else {
      currentStreak = 1
    }
    
    setStreak(currentStreak)
    await supabase.from('profiles').update({ streak: currentStreak, last_active: today.toISOString() }).eq('id', authUser.id)

    const { data: incompleteArr } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(1)

    const incomplete = incompleteArr?.[0]

    if (incomplete?.history?.length > 0) {
      const resume = window.confirm(`You have an unfinished session (${incomplete.history.length} questions answered). Resume it?`)
      if (resume) {
        setConfig({
          level: { id: incomplete.level, label: incomplete.level, tag: incomplete.level },
          topics: [],
          topicList: incomplete.topics,
          mode: incomplete.mode,
          sessionType: incomplete.total_questions ? 'questions' : 'time',
          totalQ: incomplete.total_questions,
          timeTarget: 30,
          interviewType: incomplete.interview_type || 'technical'
        })
        setHistory(incomplete.history)
        setSessionId(incomplete.id)
        setScreen(SCREENS.INTERVIEW)
        return
      }
    }
    setScreen(SCREENS.DASHBOARD)
  }

  async function handleAuth(authUser, profile) {
    setUser(authUser)
    setProfile(profile || { full_name: authUser.email, username: authUser.email })
    setScreen(SCREENS.DASHBOARD)
  }

  async function handleStart(cfg) {
    setConfig(cfg)
    setHistory([])

    const { data } = await supabase.from('sessions').insert({
      user_id:         user.id,
      topics:          cfg.topicList,
      level:           cfg.level.tag,
      mode:            cfg.mode,
      interview_type:  cfg.interviewType,
      total_questions: cfg.totalQ,
      history:         [],
      improve_points:  [],
      completed:       false,
    }).select().single()

    if (data) setSessionId(data.id)
    setScreen(SCREENS.INTERVIEW)
    setSidebarOpen(false)
  }

  async function handleSaveSession(newHistory, completed) {
    if (!sessionId) return
    const avgScore = newHistory.length > 0
      ? Math.round((newHistory.reduce((a, b) => a + b.score, 0) / newHistory.length) * 10) / 10
      : 0
    const allImprove = [...new Set(newHistory.flatMap(h => h.improvePoints || []))].filter(Boolean)
    await supabase.from('sessions').update({
      history: newHistory, improve_points: allImprove, avg_score: avgScore, completed,
    }).eq('id', sessionId)
  }

  async function handleComplete(finalHistory) {
    setHistory(finalHistory)
    await handleSaveSession(finalHistory, true)
    
    // XP Calculation
    const sessionXp = 50 + (finalHistory.length * 10)
    const newXp = xp + sessionXp
    const newLevel = Math.floor(newXp / 500) + 1
    
    setXp(newXp)
    setLevel(newLevel)
    await supabase.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', user.id)
    
    setScreen(SCREENS.REPORT)
  }

  async function handlePersonalize(newTheme, newColor) {
    setTheme(newTheme)
    setBgColor(newColor)
    // Instant DOM update
    document.documentElement.setAttribute('data-theme', newTheme)
    if (newColor) {
      document.documentElement.style.setProperty('--bg', newColor)
    } else {
      document.documentElement.style.removeProperty('--bg')
    }
    // Async DB update
    if (user?.id) {
      await supabase.from('profiles').update({ theme: newTheme, bg_color: newColor }).eq('id', user.id)
    }
  }

  function toggleSidebar() { setSidebarOpen(!sidebarOpen) }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setConfig(null); setHistory([]); setSessionId(null)
    setScreen(SCREENS.AUTH)
  }

  if (loading) return <LoadingScreen />

  return (
    <>
      {screen === SCREENS.AUTH      && <Auth onAuth={handleAuth} />}
      {screen === SCREENS.DASHBOARD && profile && (
        <Dashboard profile={profile} 
          onStartSession={() => { setScreen(SCREENS.SETUP); setSidebarOpen(false); }} 
          onLogout={handleLogout}
          theme={theme}
          bgColor={bgColor}
          onPersonalize={handlePersonalize}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          onViewReport={(sess) => {
            setConfig({
              level: { tag: sess.level, label: sess.level },
              topicList: sess.topics,
              mode: sess.mode,
              interviewType: sess.interview_type || 'technical'
            })
            setHistory(sess.history)
            setSessionId(sess.id)
            setScreen(SCREENS.REPORT)
            setSidebarOpen(false)
          }}
        />
      )}
      {screen === SCREENS.SETUP     && <Setup profile={profile} onStart={handleStart} onLogout={handleLogout} onGoBack={() => setScreen(SCREENS.DASHBOARD)} theme={theme} onPersonalize={handlePersonalize} bgColor={bgColor} />}
      {screen === SCREENS.INTERVIEW && config && (
        <Interview 
          config={config} 
          profile={profile} 
          onComplete={handleComplete} 
          onSaveSession={handleSaveSession} 
          theme={theme} 
          onPersonalize={handlePersonalize} 
          bgColor={bgColor}
          onGoHome={() => setScreen(SCREENS.DASHBOARD)}
        />
      )}
      {screen === SCREENS.REPORT    && config && (
        <Report history={history} config={config} profile={profile}
          onRestart={() => setScreen(SCREENS.SETUP)}
          onGoHome={() => setScreen(SCREENS.DASHBOARD)}
          theme={theme} 
          onPersonalize={handlePersonalize} 
          bgColor={bgColor}
        />
      )}
    </>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, background: '#2563eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>DI</div>
      <div style={{ fontSize: 14, color: '#64748b' }}>Loading...</div>
    </div>
  )
}
