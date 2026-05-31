import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export default function Dashboard({ profile, onStartSession, onLogout, theme, bgColor, onPersonalize, onViewReport, onUpdateProfile }) {
  const [sessions, setSessions] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const SKILL_ICONS = {
    'AWS': '☁️', 'Kubernetes': '☸️', 'Terraform': '🏗️', 'Ansible': '⚙️', 'Linux': '🐧',
    'CI/CD': '🔄', 'Jenkins': '🏺', 'Prometheus': '🔥', 'Grafana': '📊', 'Splunk': '📋',
    'ELK Stack': '🪵', 'DevSecOps': '🔐', 'Docker': '🐳', 'GCP': '🔵', 'Azure': '🟦'
  };

  useEffect(() => { 
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    if (profile?.id) loadDashboardData() 
    return () => window.removeEventListener('resize', handleResize)
  }, [profile?.id])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const { data: sess } = await supabase.from('sessions').select('*').eq('user_id', profile.id).eq('completed', true).order('created_at', { ascending: false })
      setSessions(sess || [])
      const { data: road, error: roadError } = await supabase.from('roadmaps').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!roadError) setRoadmap(road?.content || null)
    } catch (err) { console.warn(err.message) }
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
        const updatedMetadata = { ...(profile.metadata || {}), ...data.result }
        await supabase.from('profiles').update({ resume_text: text, metadata: updatedMetadata }).eq('id', profile.id)
        onUpdateProfile({ ...profile, resume_text: text, metadata: updatedMetadata })
      }
    } catch (err) { alert(err.message) } finally { setAnalyzing(false) }
  }

  async function handleGenerateRoadmap() {
    setGenerating(true)
    try {
      const res = await fetch('/api/roadmap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, recentSessions: sessions.slice(0, 3), studyTimePref: profile.study_daily_mins || 60 }) })
      const data = await res.json()
      if (data.result) {
        await supabase.from('roadmaps').insert({ user_id: profile.id, content: data.result })
        setRoadmap(data.result)
      }
    } catch (err) { console.error(err) } finally { setGenerating(false) }
  }

  async function toggleTaskCompletion(dayIndex, taskIndex) {
    if (!roadmap) return
    const newRoadmap = JSON.parse(JSON.stringify(roadmap))
    newRoadmap.days[dayIndex].tasks[taskIndex].completed = !newRoadmap.days[dayIndex].tasks[taskIndex].completed
    setRoadmap(newRoadmap)
    await supabase.from('roadmaps').update({ content: newRoadmap }).eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1)
  }

  const avgScore = sessions.length > 0 ? (sessions.reduce((acc, s) => acc + (s.avg_score || 0), 0) / sessions.length).toFixed(1) : '0.0'
  const improveHistory = sessions.flatMap(s => (s.improve_points || []).map(p => ({ text: p, date: new Date(s.created_at).toLocaleDateString(), sessionData: s }))).slice(0, 10)
  const meta = profile?.metadata || {}

  if (loading) return <div style={s.loading}>Initializing Dashboard...</div>

  return (
    <div style={s.page}>
      {/* MOBILE OPTIMIZED NAV */}
      <nav style={s.nav}>
        <div style={s.navBrand}><div style={s.logo}>DI</div>{!isMobile && <span style={s.navTitle}>DevOps Platform</span>}</div>
        <div style={s.navRight}>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={s.avatar}>{profile?.full_name?.[0]}</div>
          <button style={s.logoutBtn} onClick={onLogout}>{isMobile ? 'EXIT' : 'SIGN OUT'}</button>
        </div>
      </nav>

      <div style={s.container}>
        <div style={s.hero}>
          <h2 style={s.heroTitle}>Mission: <span style={{ color: 'var(--primary)' }}>{profile?.full_name?.split(' ')[0]}</span></h2>
          <p style={s.heroSub}>Your technical growth and career roadmap.</p>
        </div>

        {/* FULL WIDTH STACK FOR MOBILE, GRID FOR DESKTOP */}
        <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : '360px 1fr' }}>
          
          {/* SIDEBAR / LEFT PANEL */}
          <div style={s.leftStack}>
            <div style={s.card}>
              <div style={s.cardTitle}>Performance</div>
              <div style={s.statsRow}>
                <div style={s.statBox}><div style={s.statVal}>{avgScore}</div><div style={s.statLabel}>AVG SCORE</div></div>
                <div style={s.statBox}><div style={s.statVal}>{sessions.length}</div><div style={s.statLabel}>SESSIONS</div></div>
              </div>
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(135deg, var(--primary) 0%, #1e3a5f 100%)', color: '#fff', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontSize: 10, fontWeight: 900 }}>LEVEL PROGRESS</span><span>🔥 {profile.streak || 1} DAYS</span></div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>Rank {meta.level || 1}</div>
              <div style={s.xpBar}><div style={{ ...s.xpFill, width: `${((meta.xp || 0) % 500) / 5}%` }} /></div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Session History</div>
              <div style={s.historyList}>
                {improveHistory.length > 0 ? improveHistory.map((item, i) => (
                  <div key={i} style={s.historyItem} onClick={() => onViewReport(item.sessionData)}>
                    <div style={{ flex: 1 }}>
                      <div style={s.historyText}>{item.text}</div>
                      <div style={s.historyDate}>{item.date}</div>
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 900 }}>→</span>
                  </div>
                )) : <p style={s.emptyText}>No activity recorded.</p>}
              </div>
            </div>
          </div>

          {/* MAIN CONTENT / RIGHT PANEL */}
          <div style={s.rightStack}>
            <div style={s.actionRow}>
              <button style={s.mainAction} onClick={() => onStartSession()}>🚀 INITIALIZE SIMULATION</button>
              <button style={s.subAction} onClick={() => document.getElementById('res-up').click()}>{analyzing ? '⏳' : '🔄 UPDATE RESUME'}</button>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}><div style={s.cardTitle}>Study Roadmap</div><button style={s.ghostBtn} onClick={handleGenerateRoadmap}>{generating ? '...' : 'REFRESH'}</button></div>
              {roadmap ? (
                <div style={s.roadmapScroll}>
                  {roadmap.days.map((d, di) => (
                    <div key={di} style={s.roadmapDay}>
                      <div style={s.dayTitle}>{d.day}</div>
                      {d.tasks.map((t, ti) => (
                        <div key={ti} style={{ ...s.taskItem, opacity: t.completed ? 0.6 : 1 }}>
                          <input type="checkbox" checked={!!t.completed} onChange={() => toggleTaskCompletion(di, ti)} style={s.checkbox} />
                          <div style={{ flex: 1 }}>
                            <div style={{ ...s.taskName, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                            <div style={s.taskMeta}><span>{t.duration}</span> {t.resourceLink && <a href={t.resourceLink} target="_blank" rel="noreferrer" style={s.taskLink}>VIDEO →</a>}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : <p style={s.emptyText}>Click refresh to generate a custom 7-day plan.</p>}
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardTitle}>Technical Identity</div>
                {meta.experienceLevel && <span style={s.proBadge}>{meta.experienceLevel.toUpperCase()}</span>}
              </div>
              {meta.summary ? (
                <div style={s.profileBody}>
                  <div style={s.summaryBox}>
                    <span style={s.quote}>“</span>
                    <p style={s.summaryText}>{meta.summary}</p>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <div style={s.smallLabel}>CORE STACK</div>
                    <div style={s.skillGrid}>
                      {meta.skills?.slice(0, 12).map((sk, i) => (
                        <div key={i} style={s.skillPill}>
                          <span>{SKILL_ICONS[sk] || SKILL_ICONS[sk.split(' ')[0]] || '🛠️'}</span>
                          {sk}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={s.dropzone} onClick={() => document.getElementById('res-up').click()}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                  <div style={{ fontWeight: 800 }}>Upload Resume</div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Calibrate your AI interviewer.</p>
                </div>
              )}
            </div>
            <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} style={{ display: 'none' }} id="res-up" />
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:         { minHeight: '100vh', background: 'var(--bg)', width: '100%', overflowX: 'hidden' },
  nav:          { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navBrand:     { display: 'flex', alignItems: 'center', gap: 10 },
  logo:         { width: 34, height: 34, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 },
  navTitle:     { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 10 },
  themeToggle:  { background: 'var(--surface2)', border: '1px solid var(--border)', width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  avatar:       { width: 34, height: 34, background: 'var(--primary-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 14 },
  logoutBtn:    { padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 800, color: 'var(--red)', cursor: 'pointer' },
  
  container:    { padding: '1.5rem 1rem', maxWidth: 1600, margin: '0 auto' },
  hero:         { marginBottom: '2rem' },
  heroTitle:    { fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 950, color: 'var(--text)', letterSpacing: '-0.03em' },
  heroSub:      { fontSize: 14, color: 'var(--muted)', fontWeight: 500, marginTop: 4 },
  
  grid:         { display: 'grid', gap: '1.5rem' },
  leftStack:    { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  rightStack:   { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle:    { fontSize: 10, fontWeight: 950, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  
  statsRow:     { display: 'flex', marginTop: 15, textAlign: 'center' },
  statBox:      { flex: 1 },
  statVal:      { fontSize: 32, fontWeight: 950, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' },
  statLabel:    { fontSize: 9, fontWeight: 800, color: 'var(--muted)' },
  
  xpBar:        { height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 15, overflow: 'hidden' },
  xpFill:       { height: '100%', background: '#fff' },
  
  historyList:  { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 15 },
  historyItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer' },
  historyText:  { fontSize: 12, fontWeight: 700, color: 'var(--text2)' },
  historyDate:  { fontSize: 9, color: 'var(--muted)', marginTop: 2 },
  
  actionRow:    { display: 'flex', gap: 12, flexWrap: 'wrap' },
  mainAction:   { flex: 1, minWidth: 200, padding: '18px', background: 'var(--primary)', color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 900, boxShadow: '0 8px 20px var(--primary-glow)' },
  subAction:    { padding: '12px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontWeight: 800, color: 'var(--text2)' },
  
  roadmapScroll: { display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '1rem', scrollSnapType: 'x mandatory' },
  roadmapDay:   { minWidth: 260, background: 'var(--surface2)', borderRadius: 14, padding: '1rem', border: '1px solid var(--border)', scrollSnapAlign: 'start' },
  dayTitle:     { fontSize: 11, fontWeight: 900, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase' },
  taskItem:     { background: 'var(--surface)', padding: '10px', borderRadius: 10, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start', border: '1px solid var(--border)' },
  taskName:     { fontSize: 12, fontWeight: 800, color: 'var(--text2)' },
  taskMeta:     { display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginTop: 4 },
  taskLink:     { color: 'var(--primary)', textDecoration: 'none' },
  checkbox:     { width: 16, height: 16, marginTop: 2 },
  
  proBadge:     { padding: '4px 10px', background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 8, fontSize: 10, fontWeight: 900 },
  summaryBox:   { background: 'var(--surface2)', padding: '1.25rem', borderRadius: 14, borderLeft: '4px solid var(--primary)', position: 'relative' },
  quote:        { position: 'absolute', top: 5, left: 10, fontSize: 32, color: 'var(--primary)', opacity: 0.1, fontFamily: 'serif' },
  summaryText:  { fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' },
  smallLabel:   { fontSize: 10, fontWeight: 900, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase' },
  skillGrid:    { display: 'flex', flexWrap: 'wrap', gap: 8 },
  skillPill:    { background: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 },
  
  dropzone:     { border: '2px dashed var(--border)', borderRadius: 14, padding: '2rem', textAlign: 'center', background: 'var(--surface2)' },
  loading:      { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--muted)', background: 'var(--bg)' },
  ghostBtn:     { background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, color: 'var(--muted)' },
  emptyText:    { fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '1rem' }
}
