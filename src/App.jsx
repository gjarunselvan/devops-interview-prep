import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './components/Auth'
import Setup from './components/Setup'
import Interview from './components/Interview'
import Report from './components/Report'

const SCREENS = { AUTH: 'auth', SETUP: 'setup', INTERVIEW: 'interview', REPORT: 'report' }

export default function App() {
  const [screen,    setScreen]    = useState(SCREENS.AUTH)
  const [user,      setUser]      = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [config,    setConfig]    = useState(null)
  const [history,   setHistory]   = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [loading,   setLoading]   = useState(true)

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

  async function loadUserAndGo(authUser) {
    // Get or auto-create profile
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

    // Check for incomplete session
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
        })
        setHistory(incomplete.history)
        setSessionId(incomplete.id)
        setScreen(SCREENS.INTERVIEW)
        return
      }
    }
    setScreen(SCREENS.SETUP)
  }

  async function handleAuth(authUser, profile) {
    setUser(authUser)
    setProfile(profile || { full_name: authUser.email, username: authUser.email })
    setScreen(SCREENS.SETUP)
  }

  async function handleStart(cfg) {
    setConfig(cfg)
    setHistory([])

    const { data } = await supabase.from('sessions').insert({
      user_id:         user.id,
      topics:          cfg.topicList,
      level:           cfg.level.tag,
      mode:            cfg.mode,
      total_questions: cfg.totalQ,
      history:         [],
      improve_points:  [],
      completed:       false,
    }).select().single()

    if (data) setSessionId(data.id)
    setScreen(SCREENS.INTERVIEW)
  }

  async function handleSaveSession(newHistory, completed) {
    if (!sessionId) return
    const avgScore = newHistory.length > 0
      ? Math.round((newHistory.reduce((a, b) => a + b.score, 0) / newHistory.length) * 10) / 10
      : 0
    const allImprove = [...new Set(newHistory.flatMap(h => h.improvePoints || []))].filter(Boolean)
    await supabase.from('sessions').update({
      history, improve_points: allImprove, avg_score: avgScore, completed,
    }).eq('id', sessionId)
  }

  async function handleComplete(finalHistory) {
    setHistory(finalHistory)
    await handleSaveSession(finalHistory, true)
    setScreen(SCREENS.REPORT)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setConfig(null); setHistory([]); setSessionId(null)
    setScreen(SCREENS.AUTH)
  }

  if (loading) return <LoadingScreen />

  return (
    <>
      {screen === SCREENS.AUTH      && <Auth onAuth={handleAuth} />}
      {screen === SCREENS.SETUP     && <Setup profile={profile} onStart={handleStart} onLogout={handleLogout} />}
      {screen === SCREENS.INTERVIEW && config && (
        <Interview config={config} profile={profile} onComplete={handleComplete} onSaveSession={handleSaveSession} />
      )}
      {screen === SCREENS.REPORT    && config && (
        <Report history={history} config={config} profile={profile}
          onRestart={() => setScreen(SCREENS.SETUP)}
          onGoHome={() => setScreen(SCREENS.SETUP)}
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
