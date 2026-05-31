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

  useEffect(() => { 
    if (profile?.id) loadDashboardData() 
  }, [profile?.id])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const { data: sess } = await supabase.from('sessions').select('*').eq('user_id', profile.id).eq('completed', true).order('created_at', { ascending: false })
      setSessions(sess || [])
      const { data: road, error: roadError } = await supabase.from('roadmaps').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!roadError) setRoadmap(road?.content || null)
    } catch (err) {
      console.warn('Dashboard fetch warning:', err.message)
    }
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
        const { error } = await supabase.from('roadmaps').insert({ user_id: profile.id, content: data.result })
        if (error) throw new Error('Roadmaps table error.')
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

  function handleSurpriseMe() {
    const mixedConfig = {
      level: { tag: profile.experience_level || 'Mid-Level', label: profile.experience_level || 'Mid-Level' },
      topics: [], 
      topicList: 'Full DevOps Stack (Mixed Domains)',
      mode: 'text',
      sessionType: 'questions',
      totalQ: 10,
      studyTime: profile.study_daily_mins || 60,
      interviewType: 'mixed',
      difficulty: 'hard'
    }
    onStartSession(mixedConfig)
  }

  const avgScore = sessions.length > 0 ? (sessions.reduce((acc, s) => acc + (s.avg_score || 0), 0) / sessions.length).toFixed(1) : '0.0'
  const improveHistory = sessions.flatMap(s => (s.improve_points || []).map(p => ({ text: p, date: new Date(s.created_at).toLocaleDateString(), sessionData: s }))).slice(0, 10)
  const meta = profile?.metadata || {}

  if (loading) return <div style={s.loading}>Synchronizing Dashboard...</div>

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navBrand}><div style={s.logo}>DI</div><span style={s.navTitle}>DevOps Command Center</span></div>
        <div style={s.navRight}>
          <button style={s.navLinkBtn} onClick={() => window.location.reload()}>🏠 Dashboard</button>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={s.avatar}>{profile?.full_name?.[0]}</div>
          <span style={s.navName}>{profile?.full_name}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Sign out</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={s.hero}>
          <h2 style={s.heroTitle}>Mission Overview: <span style={{ color: 'var(--primary)' }}>{profile?.full_name?.split(' ')[0]}</span></h2>
          <p style={s.heroSub}>Your technical growth and career roadmap in one view.</p>
        </div>

        <div style={s.grid}>
          <div style={s.left}>
            <div style={s.card}>
              <div style={s.cardTitle}>Performance</div>
              <div style={s.statsRow}>
                <div style={s.statBox}><div style={s.statVal}>{avgScore}</div><div style={s.statLabel}>AVG SCORE</div></div>
                <div style={s.statBox}><div style={s.statVal}>{sessions.length}</div><div style={s.statLabel}>SESSIONS</div></div>
              </div>
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontSize: 11, fontWeight: 800 }}>RANK</span><span>🔥 {profile.streak || 1} DAYS</span></div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>Lvl {meta.level || 1}</div>
              <div style={s.xpBar}><div style={{ ...s.xpFill, width: `${((meta.xp || 0) % 500) / 5}%` }} /></div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Improvements</div>
              <div style={s.improveList}>
                {improveHistory.map((item, i) => (
                  <div key={i} style={s.improveItem} onClick={() => onViewReport(item.sessionData)}>
                    <div><div style={s.improveText}>{item.text}</div><div style={s.improveDate}>{item.date}</div></div>
                    <span>→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={s.right}>
            <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
              <button style={{ ...s.startBtn, flex: 2, margin: 0 }} onClick={() => onStartSession()}>🚀 Start Interview</button>
              <button style={s.surpriseBtn} onClick={handleSurpriseMe}>✨ Surprise Me</button>
              <button style={s.reBtn} onClick={() => document.getElementById('res-up').click()}>{analyzing ? '⏳' : '🔄'} Update Resume</button>
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}><div style={s.cardTitle}>Roadmap</div><button style={s.ghostBtn} onClick={handleGenerateRoadmap}>REFRESH</button></div>
              {roadmap ? (
                <div style={s.roadmapScroll}>
                  {roadmap.days.map((d, di) => (
                    <div key={di} style={s.roadmapDay}>
                      <div style={s.dayTitle}>{d.day}</div>
                      {d.tasks.map((t, ti) => (
                        <div key={ti} style={{ ...s.taskItem, opacity: t.completed ? 0.6 : 1, background: t.completed ? 'var(--bg)' : 'var(--surface2)' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <input type="checkbox" checked={!!t.completed} onChange={() => toggleTaskCompletion(di, ti)} style={s.checkbox} />
                            <div style={{ flex: 1 }}>
                              <div style={{ ...s.taskName, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                              <div style={s.taskMeta}><span>{t.duration}</span> {t.resourceLink && <a href={t.resourceLink} target="_blank" rel="noreferrer" style={s.taskLink}>VIDEO →</a>}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : <p style={s.empty}>No active roadmap.</p>}
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={s.cardTitle}>Technical Identity</div>
                {meta.experienceLevel && <span style={s.proBadge}>{meta.experienceLevel.toUpperCase()}</span>}
              </div>
              
              {meta.summary ? (
                <div style={s.proProfile}>
                  <div style={s.summaryBox}>
                    <span style={s.quoteMark}>“</span>
                    <p style={s.proSummary}>{meta.summary}</p>
                  </div>
                  
                  <div style={{ marginTop: 24 }}>
                    <div style={s.smallLabel}>EXTRACTED SKILL SET</div>
                    <div style={s.skillCloud}>
                      {meta.skills?.slice(0, 15).map((sk, i) => (
                        <div key={i} style={s.proSkill}>
                          <span style={s.skillDot} />
                          {sk}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={s.dropzone} onClick={() => document.getElementById('res-up').click()}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
                  <div style={{ fontSize: 16, fontWeight: 850 }}>Initialize Career Analysis</div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, maxWidth: 280, margin: '8px auto 0' }}>Upload your resume to calibrate the AI interviewer and build your technical identity.</p>
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
  page:         { minHeight: '100vh', background: 'var(--bg)', width: '100%' },
  nav:          { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navBrand:     { display: 'flex', alignItems: 'center', gap: 10 },
  logo:         { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 },
  navTitle:     { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 15 },
  navLinkBtn:   { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', color: 'var(--text2)' },
  themeToggle:  { background: 'var(--surface2)', border: '1px solid var(--border)', width: 34, height: 34, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  avatar:       { width: 32, height: 32, background: 'var(--primary-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 12 },
  navName:      { fontSize: 13, fontWeight: 700, color: 'var(--text2)' },
  logoutBtn:    { padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  content:      { padding: '2rem 4rem', maxWidth: 1600, margin: '0 auto' },
  hero:         { marginBottom: '2.5rem' },
  heroTitle:    { fontSize: 32, fontWeight: 950, color: 'var(--text)', letterSpacing: '-0.02em' },
  heroSub:      { fontSize: 15, color: 'var(--muted)', marginTop: 5, fontWeight: 500 },
  grid:         { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '2rem' },
  left:         { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  right:        { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  cardTitle:    { fontSize: 10, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  statsRow:     { display: 'flex', marginTop: 15, textAlign: 'center' },
  statBox:      { flex: 1 },
  statVal:      { fontSize: 32, fontWeight: 950, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' },
  statLabel:    { fontSize: 9, fontWeight: 800, color: 'var(--muted)' },
  xpBar:        { height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 15, overflow: 'hidden' },
  xpFill:       { height: '100%', background: 'var(--surface)' },
  improveList:  { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 15 },
  improveItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, cursor: 'pointer' },
  improveText:  { fontSize: 12, fontWeight: 700, color: 'var(--text2)' },
  improveDate:  { fontSize: 9, color: 'var(--muted)', marginTop: 3 },
  startBtn:     { padding: '20px', background: 'var(--primary)', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 950, boxShadow: '0 8px 20px var(--primary-glow)', cursor: 'pointer' },
  surpriseBtn:  { flex: 1, padding: '10px 20px', background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' },
  reBtn:        { padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  roadmapScroll: { display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem' },
  roadmapDay:   { minWidth: 200, borderLeft: '2px solid var(--primary-l)', paddingLeft: 14 },
  dayTitle:     { fontSize: 10, fontWeight: 900, color: 'var(--primary)', marginBottom: 10, textTransform: 'uppercase' },
  taskItem:     { background: 'var(--surface2)', padding: '10px', borderRadius: 8, marginBottom: 8, transition: 'all 0.2s' },
  taskName:     { fontSize: 11, fontWeight: 800, color: 'var(--text2)' },
  taskMeta:     { display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 700, marginTop: 4 },
  taskLink:     { color: 'var(--primary)', textDecoration: 'none', fontWeight: 900 },
  checkbox:     { width: 14, height: 14, marginTop: 2, cursor: 'pointer' },
  proBadge:     { padding: '4px 12px', background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 20, fontSize: 10, fontWeight: 900, letterSpacing: '0.05em' },
  proProfile:   { marginTop: 10 },
  summaryBox:   { background: 'var(--surface2)', padding: '20px', borderRadius: 12, position: 'relative', borderLeft: '4px solid var(--primary)' },
  quoteMark:    { position: 'absolute', top: 10, left: 10, fontSize: 40, color: 'var(--primary)', opacity: 0.1, fontFamily: 'serif' },
  proSummary:   { fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, fontStyle: 'italic', position: 'relative', zIndex: 1 },
  smallLabel:   { fontSize: 9, fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 12 },
  skillCloud:   { display: 'flex', flexWrap: 'wrap', gap: 8 },
  proSkill:     { background: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow)' },
  skillDot:     { width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' },
  dropzone:     { border: '1.5px dashed var(--border2)', borderRadius: 12, padding: '2rem', textAlign: 'center', background: 'var(--surface2)', cursor: 'pointer' },
  loading:      { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--muted)', background: 'var(--bg)' },
  ghostBtn:     { background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' },
  empty:        { textAlign: 'center', padding: '1rem', color: 'var(--muted)', fontSize: 12 }
}
