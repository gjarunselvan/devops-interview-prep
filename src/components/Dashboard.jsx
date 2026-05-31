import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard({ profile, onStartSession, onLogout }) {
  const [sessions, setSessions] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resumeText, setResumeText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('completed', true)
      .order('created_at', { ascending: false })
    
    setSessions(sessionData || [])

    const { data: roadmapData } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    setRoadmap(roadmapData?.content || null)
    setLoading(false)
  }

  async function handleAnalyzeResume() {
    if (!resumeText.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText })
      })
      const data = await res.json()
      if (data.result) {
        const { summary, skills, recommendedTopics, experienceLevel } = data.result
        await supabase.from('profiles').update({
          resume_text: resumeText,
          suggested_skills: skills,
          experience_level: experienceLevel,
          metadata: { summary, recommendedTopics }
        }).eq('id', profile.id)
        alert('Resume analyzed! Your suggested topics have been updated.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleGenerateRoadmap() {
    setGenerating(true)
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          recentSessions: sessions.slice(0, 3),
          studyTimePref: profile.study_time_pref || 10
        })
      })
      const data = await res.json()
      if (data.result) {
        await supabase.from('roadmaps').insert({
          user_id: profile.id,
          content: data.result
        })
        setRoadmap(data.result)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const avgScore = sessions.length > 0 
    ? (sessions.reduce((acc, s) => acc + (s.avg_score || 0), 0) / sessions.length).toFixed(1)
    : '0.0'

  const improvePoints = [...new Set(sessions.flatMap(s => s.improve_points || []))].slice(0, 6)

  if (loading) return <div style={s.loading}>Loading Dashboard...</div>

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.container}>
          <div style={s.navContent}>
            <div style={s.logo}>DI</div>
            <div style={s.navActions}>
              <span style={s.userName}>{profile.full_name}</span>
              <button style={s.logoutBtn} onClick={onLogout}>Sign Out</button>
            </div>
          </div>
        </div>
      </nav>

      <main style={s.container}>
        <div style={s.hero}>
          <h1 style={s.greeting}>Welcome back, <span style={s.accent}>{profile.full_name.split(' ')[0]}</span></h1>
          <p style={s.subtext}>Track your progress and level up your DevOps career.</p>
        </div>

        <div style={s.grid}>
          {/* Left: Progress & Roadmap */}
          <div style={s.leftCol}>
            <div style={s.statsRow}>
              <div style={s.statCard}>
                <div style={s.statLabel}>Avg Score</div>
                <div style={s.statValue}>{avgScore}<span style={s.statTotal}>/10</span></div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Sessions</div>
                <div style={s.statValue}>{sessions.length}</div>
              </div>
              <button style={s.startBtn} onClick={onStartSession}>
                Start New Interview →
              </button>
            </div>

            <div style={s.card}>
              <h3 style={s.cardTitle}>Your Study Roadmap</h3>
              {roadmap ? (
                <div style={s.roadmap}>
                  <div style={s.roadmapFocus}><strong>Week's Focus:</strong> {roadmap.focus}</div>
                  <div style={s.dayGrid}>
                    {roadmap.days.map((d, i) => (
                      <div key={i} style={s.dayCard}>
                        <div style={s.dayName}>{d.day}</div>
                        <ul style={s.taskList}>
                          {d.tasks.map((t, ti) => <li key={ti} style={s.task}>{t}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={s.emptyRoadmap}>
                  <p>No roadmap generated yet.</p>
                  <button style={s.genBtn} onClick={handleGenerateRoadmap} disabled={generating}>
                    {generating ? 'Generating...' : 'Generate Personalized Roadmap'}
                  </button>
                </div>
              )}
            </div>

            <div style={s.card}>
              <h3 style={s.cardTitle}>Improvement Areas</h3>
              <div style={s.tagCloud}>
                {improvePoints.length > 0 ? improvePoints.map((p, i) => (
                  <span key={i} style={s.tag}>{p}</span>
                )) : <p style={s.emptyText}>Complete sessions to see suggestions.</p>}
              </div>
            </div>
          </div>

          {/* Right: Resume & History */}
          <div style={s.rightCol}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>AI Resume Analysis</h3>
              <p style={s.cardDesc}>Paste your resume to get tailored interview topics.</p>
              <textarea 
                style={s.textarea} 
                placeholder="Paste resume text here..." 
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
              />
              <button style={s.analyzeBtn} onClick={handleAnalyzeResume} disabled={analyzing || !resumeText.trim()}>
                {analyzing ? 'Analyzing...' : 'Analyze Resume'}
              </button>
            </div>

            <div style={s.card}>
              <h3 style={s.cardTitle}>Recent Sessions</h3>
              <div style={s.sessionList}>
                {sessions.length > 0 ? sessions.slice(0, 5).map(s => (
                  <div key={s.id} style={s.sessionItem}>
                    <div style={s.sessionInfo}>
                      <div style={s.sessionDate}>{new Date(s.created_at).toLocaleDateString()}</div>
                      <div style={s.sessionTopics}>{s.level} · {s.topics}</div>
                    </div>
                    <div style={{ ...s.sessionScore, color: s.avg_score >= 8 ? 'var(--green)' : 'var(--yellow)' }}>
                      {s.avg_score?.toFixed(1)}
                    </div>
                  </div>
                )) : <p style={s.emptyText}>No sessions recorded yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' },
  container: { maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' },
  nav: { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 0', sticky: 'top', zIndex: 10 },
  navContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { background: 'var(--primary)', color: '#fff', padding: '8px 12px', borderRadius: 8, fontWeight: 800, fontSize: 18 },
  navActions: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { fontWeight: 500, fontSize: 14, color: 'var(--text-2)' },
  logoutBtn: { background: 'none', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, fontSize: 13, color: 'var(--muted)' },
  hero: { padding: '3rem 0 2rem' },
  greeting: { fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' },
  accent: { color: 'var(--primary)' },
  subtext: { color: 'var(--muted)', fontSize: '1.1rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  statsRow: { display: 'flex', gap: '1rem', alignItems: 'stretch' },
  statCard: { flex: 1, background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 800, color: 'var(--text)' },
  statTotal: { fontSize: 14, color: 'var(--muted)', fontWeight: 400 },
  startBtn: { flex: 1.5, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 700, padding: '1rem' },
  card: { background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: '1rem' },
  cardDesc: { fontSize: 13, color: 'var(--muted)', marginBottom: '1rem' },
  textarea: { width: '100%', height: 120, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginBottom: '1rem', outline: 'none', background: 'var(--surface-2)' },
  analyzeBtn: { width: '100%', padding: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600 },
  roadmap: { background: 'var(--primary-l)', padding: '1rem', borderRadius: 8, border: '1px solid var(--primary)' },
  roadmapFocus: { fontSize: 14, marginBottom: '1rem', color: 'var(--primary)' },
  dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' },
  dayCard: { background: '#fff', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border)' },
  dayName: { fontWeight: 700, fontSize: 12, marginBottom: 6, color: 'var(--primary)' },
  taskList: { listStyle: 'none', fontSize: 11, color: 'var(--text-2)' },
  task: { marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 },
  emptyRoadmap: { textAlign: 'center', padding: '2rem 0' },
  genBtn: { marginTop: '1rem', background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600 },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: { background: 'var(--secondary-l)', color: 'var(--secondary)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  sessionList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  sessionItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' },
  sessionInfo: { display: 'flex', flexDirection: 'column' },
  sessionDate: { fontSize: 12, color: 'var(--muted)' },
  sessionTopics: { fontSize: 13, fontWeight: 500 },
  sessionScore: { fontWeight: 800, fontSize: 18, fontFamily: 'JetBrains Mono' },
  emptyText: { color: 'var(--muted)', fontSize: 13, textAlign: 'center' }
}
