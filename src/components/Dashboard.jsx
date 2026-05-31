import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function Dashboard({ profile, onStartSession, onLogout }) {
  const [sessions, setSessions] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [theme, setTheme] = useState(profile?.theme || 'light')
  const [bgColor, setBgColor] = useState(profile?.bg_color || '')

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

  async function updatePersonalization(newTheme, newColor) {
    setTheme(newTheme)
    setBgColor(newColor)
    document.documentElement.setAttribute('data-theme', newTheme)
    if (newColor) {
      document.documentElement.style.setProperty('--bg', newColor)
    } else {
      document.documentElement.style.removeProperty('--bg')
    }
    await supabase.from('profiles').update({ theme: newTheme, bg_color: newColor }).eq('id', profile.id)
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setAnalyzing(true)
    try {
      let text = ''
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += content.items.map(item => item.str).join(' ') + '\n'
        }
        text = fullText
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        text = result.value
      } else {
        alert('Please upload a PDF or DOCX file.')
        setAnalyzing(false)
        return
      }

      const res = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text })
      })
      const data = await res.json()
      if (data.result) {
        const { summary, skills, recommendedTopics, experienceLevel, suggestedCourses } = data.result
        await supabase.from('profiles').update({
          resume_text: text,
          suggested_skills: skills,
          experience_level: experienceLevel,
          metadata: { summary, recommendedTopics, suggestedCourses }
        }).eq('id', profile.id)
        alert('Resume analyzed! Your profile and roadmap recommendations have been updated.')
        window.location.reload() // Refresh to update pre-filled topics in Setup
      }
    } catch (err) {
      console.error('Parsing error:', err)
      alert('Failed to parse file. Please try pasting the text instead.')
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
          studyTimePref: profile.study_daily_mins || 60
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
  const suggestedCourses = profile?.metadata?.suggestedCourses || []

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

            {suggestedCourses.length > 0 && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>🎓 Recommended Learning</h3>
                <div style={s.courseList}>
                  {suggestedCourses.map((c, i) => (
                    <div key={i} style={s.courseItem}>
                      <span style={s.courseIcon}>📚</span>
                      <span style={s.courseText}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <h3 style={s.cardTitle}>Resume Analysis</h3>
              <p style={s.cardDesc}>Upload PDF/DOCX to get tailored interview topics.</p>
              <div style={s.uploadZone}>
                <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} style={s.fileInput} id="resume-upload" />
                <label htmlFor="resume-upload" style={s.uploadLabel}>
                  {analyzing ? '⏳ Analyzing...' : '📁 Drop or Click to Upload'}
                </label>
              </div>
            </div>

            <div style={s.card}>
              <h3 style={s.cardTitle}>Personalization</h3>
              <div style={s.themeRow}>
                <button style={{ ...s.themeBtn, background: theme === 'light' ? 'var(--primary-l)' : 'var(--surface-2)' }} onClick={() => updatePersonalization('light', bgColor)}>☀️ Light</button>
                <button style={{ ...s.themeBtn, background: theme === 'dark' ? 'var(--primary-l)' : 'var(--surface-2)' }} onClick={() => updatePersonalization('dark', bgColor)}>🌙 Dark</button>
                <button style={{ ...s.themeBtn, background: theme === 'oled' ? 'var(--primary-l)' : 'var(--surface-2)' }} onClick={() => updatePersonalization('oled', bgColor)}>📱 OLED</button>
              </div>
              <div style={s.colorRow}>
                <span style={s.colorLabel}>Custom Background:</span>
                <input type="color" value={bgColor || '#f8fafc'} onChange={e => updatePersonalization(theme, e.target.value)} style={s.colorPicker} />
                {bgColor && <button style={s.resetBtn} onClick={() => updatePersonalization(theme, '')}>Reset</button>}
              </div>
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
  uploadZone: { border: '2px dashed var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)', transition: 'all 0.2s' },
  fileInput: { display: 'none' },
  uploadLabel: { cursor: 'pointer', fontWeight: 600, color: 'var(--text-2)' },
  themeRow: { display: 'flex', gap: 8, marginBottom: '1.5rem' },
  themeBtn: { flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  colorRow: { display: 'flex', alignItems: 'center', gap: 12 },
  colorLabel: { fontSize: 13, color: 'var(--muted)' },
  colorPicker: { width: 40, height: 30, border: 'none', borderRadius: 4, padding: 0, cursor: 'pointer' },
  resetBtn: { fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600 },
  roadmap: { background: 'var(--primary-l)', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--primary)' },
  roadmapFocus: { fontSize: 15, marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: 700 },
  dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' },
  dayCard: { background: 'var(--surface)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' },
  dayName: { fontWeight: 800, fontSize: 13, marginBottom: 8, color: 'var(--primary)', textTransform: 'uppercase' },
  taskList: { listStyle: 'none', fontSize: 12, color: 'var(--text-2)' },
  task: { marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 6 },
  courseList: { display: 'flex', flexDirection: 'column', gap: 10 },
  courseItem: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8 },
  courseText: { fontSize: 14, fontWeight: 500 },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: { background: 'var(--secondary-l)', color: 'var(--secondary)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  sessionList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  sessionItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  sessionInfo: { display: 'flex', flexDirection: 'column' },
  sessionDate: { fontSize: 12, color: 'var(--muted)' },
  sessionTopics: { fontSize: 13, fontWeight: 500 },
  sessionScore: { fontWeight: 800, fontSize: 18, fontFamily: 'JetBrains Mono' },
  emptyText: { color: 'var(--muted)', fontSize: 13, textAlign: 'center' }
}
