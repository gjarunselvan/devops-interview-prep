import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export default function Dashboard({ profile, onStartSession, onLogout, theme, bgColor, onPersonalize, onViewReport }) {
  const [sessions, setSessions] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { 
    if (profile?.id) loadDashboardData() 
  }, [profile?.id])

  async function loadDashboardData() {
    setLoading(true)
    const { data: sessionData } = await supabase.from('sessions').select('*').eq('user_id', profile.id).eq('completed', true).order('created_at', { ascending: false })
    setSessions(sessionData || [])
    const { data: roadmapData } = await supabase.from('roadmaps').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setRoadmap(roadmapData?.content || null)
    setLoading(false)
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]; if (!file) return; setAnalyzing(true)
    try {
      let text = ''
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer(); const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''; for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const content = await page.getTextContent(); fullText += content.items.map(item => item.str).join(' ') + '\n' }
        text = fullText
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer(); const result = await mammoth.extractRawText({ arrayBuffer }); text = result.value
      } else { alert('PDF/DOCX only'); setAnalyzing(false); return }
      const res = await fetch('/api/analyze-resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeText: text }) })
      const data = await res.json()
      if (data.result) {
        await supabase.from('profiles').update({ resume_text: text, suggested_skills: data.result.skills, experience_level: data.result.experienceLevel, metadata: { ...data.result } }).eq('id', profile.id)
        alert('Analyzed!'); window.location.reload()
      }
    } catch (err) { alert(err.message) } finally { setAnalyzing(false) }
  }

  async function handleGenerateRoadmap() {
    setGenerating(true)
    try {
      const res = await fetch('/api/roadmap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, recentSessions: sessions.slice(0, 3), studyTimePref: profile.study_daily_mins || 60 }) })
      const data = await res.json()
      if (data.result) {
        await supabase.from('roadmaps').insert({ user_id: profile.id, content: data.result }); setRoadmap(data.result)
      }
    } catch (err) { console.error(err) } finally { setGenerating(false) }
  }

  const avgScore = sessions.length > 0 ? (sessions.reduce((acc, s) => acc + (s.avg_score || 0), 0) / sessions.length).toFixed(1) : '0.0'
  const improveHistory = sessions.flatMap(s => (s.improve_points || []).map(p => ({ text: p, date: new Date(s.created_at).toLocaleDateString(), sessionData: s }))).slice(0, 8)
  const suggestedCourses = profile?.metadata?.suggestedCourses || []

  if (loading) return <div style={s.loading}>Loading Dashboard...</div>

  return (
    <div style={s.page}>
      {/* Navbar - EXACTLY AS PER PYCHARM PROJECT */}
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>DevOps Interview</span>
        </div>
        <div style={s.navRight}>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={s.avatar}>{profile?.full_name?.[0] || 'U'}</div>
          <span style={s.navName}>{profile?.full_name}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Sign out</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={s.hero}>
          <h2 style={s.heroTitle}>Welcome back, <span style={{ color: 'var(--primary)' }}>{profile?.full_name?.split(' ')[0]}!</span></h2>
          <p style={s.heroSub}>Track your progress and launch your next interview simulation.</p>
        </div>

        <div style={s.grid}>
          {/* Left Column */}
          <div>
            {/* Performance */}
            <div style={s.card}>
              <div style={s.cardTitle}>Performance Overview</div>
              <div style={s.statsRow}>
                <div style={s.statBox}>
                  <div style={s.statVal}>{avgScore}</div>
                  <div style={s.statLabel}>AVG SCORE</div>
                </div>
                <div style={s.statBox}>
                  <div style={s.statVal}>{sessions.length}</div>
                  <div style={s.statLabel}>SESSIONS</div>
                </div>
              </div>
            </div>

            {/* Rank / XP */}
            <div style={{ ...s.card, background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>CAREER RANK</span>
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 4 }}>🔥 {profile.streak || 1} DAYS</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Level {profile.level || 1}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{profile.xp || 0} Total XP</div>
              <div style={s.xpBar}><div style={{ ...s.xpFill, width: `${((profile.xp || 0) % 500) / 5}%` }} /></div>
            </div>

            {/* Improvements */}
            <div style={s.card}>
              <div style={s.cardTitle}>Focus Areas</div>
              <div style={s.improveList}>
                {improveHistory.map((item, i) => (
                  <div key={i} style={s.improveItem} onClick={() => onViewReport(item.sessionData)}>
                    <div>
                      <div style={s.improveText}>{item.text}</div>
                      <div style={s.improveDate}>{item.date}</div>
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>→</span>
                  </div>
                ))}
                {improveHistory.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Complete sessions to see results.</p>}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <button style={s.startBtn} onClick={onStartSession}>🚀 Start New Interview</button>

            {/* Roadmap */}
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={s.cardTitle}>Technical Roadmap</div>
                <button style={s.ghostBtn} onClick={handleGenerateRoadmap} disabled={generating}>{generating ? '...' : 'Refresh'}</button>
              </div>
              {roadmap ? (
                <div style={s.roadmapStack}>
                  {roadmap.days.map((d, i) => (
                    <div key={i} style={s.roadmapDay}>
                      <div style={s.dayTitle}>{d.day}</div>
                      {d.tasks.map((t, ti) => (
                        <div key={ti} style={s.taskItem}>
                          <div style={s.taskName}>{t.title}</div>
                          <div style={s.taskDur}>{t.duration}</div>
                          {t.resourceLink && <a href={t.resourceLink} target="_blank" rel="noreferrer" style={s.taskLink}>Resource →</a>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>No roadmap generated.</p>}
            </div>

            {/* Resume / Profile Analysis */}
            <div style={s.card}>
              <div style={s.cardTitle}>Career Profile</div>
              {profile?.metadata?.summary ? (
                <div>
                  <div style={s.profileSummary}>{profile.metadata.summary}</div>
                  <div style={s.profileMeta}>
                    <span style={s.profileBadge}>Target: {profile.experience_level || 'General'}</span>
                  </div>
                  <div style={s.skillGrid}>
                    {profile.suggested_skills?.slice(0, 6).map((sk, i) => (
                      <span key={i} style={s.skillTag}>{sk}</span>
                    ))}
                  </div>
                  <button style={s.reuploadBtn} onClick={() => document.getElementById('res-up').click()}>
                    {analyzing ? '⏳ Analyzing...' : '🔄 Update Resume'}
                  </button>
                  <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} style={{ display: 'none' }} id="res-up" />
                </div>
              ) : (
                <div style={s.dropzone}>
                  <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} style={{ display: 'none' }} id="res-up" />
                  <label htmlFor="res-up" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{analyzing ? '⏳' : '📁'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{analyzing ? 'Analyzing...' : 'Upload Resume'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Get a tailored roadmap based on your skills</div>
                  </label>
                </div>
              )}
              {suggestedCourses.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', marginBottom: 8 }}>RECOMMENDED LEARNING</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {suggestedCourses.slice(0, 3).map((c, i) => <span key={i} style={s.courseTag}>{c}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:         { minHeight: '100vh', background: 'var(--bg)' },
  nav:          { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navBrand:     { display: 'flex', alignItems: 'center', gap: 10 },
  logo:         { width: 36, height: 36, background: 'var(--primary)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 },
  navTitle:     { fontWeight: 700, fontSize: 16, color: 'var(--text)' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 12 },
  themeToggle:  { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4 },
  avatar:       { width: 34, height: 34, background: 'var(--primary-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: 14 },
  navName:      { fontSize: 14, fontWeight: 500, color: 'var(--text2)' },
  logoutBtn:    { padding: '6px 14px', border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', color: 'var(--muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  content:      { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' },
  hero:         { marginBottom: '2rem' },
  heroTitle:    { fontSize: 26, fontWeight: 800, color: 'var(--text)' },
  heroSub:      { fontSize: 15, color: 'var(--muted)', marginTop: 4 },
  grid:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  card:         { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow)' },
  cardTitle:    { fontSize: 14, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 },
  statsRow:     { display: 'flex', justifyContent: 'space-around', textAlign: 'center' },
  statBox:      { flex: 1 },
  statVal:      { fontSize: 32, fontWeight: 800, color: 'var(--primary)', fontFamily: 'JetBrains Mono,monospace' },
  statLabel:    { fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginTop: 4 },
  xpBar:        { height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  xpFill:       { height: '100%', background: '#fff' },
  improveList:  { display: 'flex', flexDirection: 'column', gap: 10 },
  improveItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, cursor: 'pointer' },
  improveText:  { fontSize: 13, fontWeight: 700, color: 'var(--text2)' },
  improveDate:  { fontSize: 10, color: 'var(--muted)', marginTop: 2 },
  startBtn:     { width: '100%', padding: '16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' },
  roadmapStack: { display: 'flex', flexDirection: 'column', gap: 16 },
  roadmapDay:   { borderLeft: '2px solid var(--primary-l)', paddingLeft: 14 },
  dayTitle:     { fontSize: 12, fontWeight: 800, color: 'var(--primary)', marginBottom: 8 },
  taskItem:     { marginBottom: 8 },
  taskName:     { fontSize: 13, fontWeight: 600, color: 'var(--text2)' },
  taskDur:      { fontSize: 11, color: 'var(--muted)' },
  taskLink:     { fontSize: 11, color: 'var(--primary)', fontWeight: 700 },
  dropzone:     { border: '1.5px dashed var(--border2)', borderRadius: 10, padding: '1.5rem', textAlign: 'center', background: 'var(--surface2)' },
  courseTag:    { fontSize: 10, fontWeight: 700, background: 'var(--primary-l)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 5 },
  profileSummary: { fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 },
  profileMeta:    { display: 'flex', gap: 8, marginBottom: 12 },
  profileBadge:   { fontSize: 10, fontWeight: 800, background: 'var(--surface2)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 4, color: 'var(--primary)' },
  skillGrid:      { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  skillTag:       { fontSize: 10, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 4, color: 'var(--muted)' },
  reuploadBtn:    { width: '100%', padding: '10px', border: '1.5px solid var(--border)', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)' },
  loading:      { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--muted)', fontWeight: 600 },
  ghostBtn:     { background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)' }
}
