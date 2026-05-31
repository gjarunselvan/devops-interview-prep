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
        await supabase.from('profiles').update({ 
          resume_text: text, 
          metadata: { ...(profile.metadata || {}), ...data.result } 
        }).eq('id', profile.id)
        alert('Resume Processed!'); window.location.reload()
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
        if (error) alert('Error: "roadmaps" table not found in your Supabase project.')
        else setRoadmap(data.result)
      }
    } catch (err) { alert(err.message) } finally { setGenerating(false) }
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
              <button style={s.reBtn} onClick={() => document.getElementById('res-up').click()}>{analyzing ? '⏳' : '🔄'} Update Resume</button>
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}><div style={s.cardTitle}>Roadmap</div><button style={s.ghostBtn} onClick={handleGenerateRoadmap}>REFRESH</button></div>
              {roadmap ? (
                <div style={s.roadmapScroll}>
                  {roadmap.days.map((d, i) => (
                    <div key={i} style={s.roadmapDay}>
                      <div style={s.dayTitle}>{d.day}</div>
                      {d.tasks.map((t, ti) => (
                        <div key={ti} style={s.taskItem}>
                          <div style={s.taskName}>{t.title}</div>
                          <div style={s.taskMeta}><span>{t.duration}</span> {t.resourceLink && <a href={t.resourceLink} target="_blank" rel="noreferrer" style={s.taskLink}>RESOURCE</a>}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : <p style={s.empty}>No active roadmap.</p>}
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>AI Career Profile</div>
              {meta.summary ? (
                <div style={s.profileBody}>
                  <div style={s.profileSummary}>"{meta.summary}"</div>
                  <div style={s.metaGrid}>
                    <div style={s.metaItem}><span style={s.metaLabel}>TARGET</span><span style={s.metaVal}>{meta.experienceLevel}</span></div>
                    <div style={s.metaItem}><span style={s.metaLabel}>SKILLS</span><div style={s.skillGrid}>{meta.skills?.slice(0, 10).map((sk, i) => <span key={i} style={s.skill}>{sk}</span>)}</div></div>
                  </div>
                </div>
              ) : (
                <div style={s.dropzone} onClick={() => document.getElementById('res-up').click()}>
                  <div style={{ fontSize: 32 }}>📁</div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>Process Resume</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>Click to upload and analyze your background.</div>
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
  xpFill:       { height: '100%', background: '#fff' },
  improveList:  { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 15 },
  improveItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, cursor: 'pointer' },
  improveText:  { fontSize: 12, fontWeight: 700, color: 'var(--text2)' },
  improveDate:  { fontSize: 9, color: 'var(--muted)', marginTop: 3 },
  startBtn:     { padding: '20px', background: 'var(--primary)', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 950, boxShadow: '0 8px 20px var(--primary-glow)', cursor: 'pointer' },
  reBtn:        { padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  roadmapScroll: { display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem' },
  roadmapDay:   { minWidth: 200, borderLeft: '2px solid var(--primary-l)', paddingLeft: 14 },
  dayTitle:     { fontSize: 10, fontWeight: 900, color: 'var(--primary)', marginBottom: 10, textTransform: 'uppercase' },
  taskItem:     { background: 'var(--surface2)', padding: '10px', borderRadius: 8, marginBottom: 8 },
  taskName:     { fontSize: 11, fontWeight: 800, color: 'var(--text2)' },
  taskMeta:     { display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 700, marginTop: 4 },
  taskLink:     { color: 'var(--primary)', textDecoration: 'none' },
  profileBody:  { marginTop: 15 },
  profileSummary: { fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 15 },
  metaItem:     { marginBottom: 15 },
  metaLabel:    { fontSize: 9, fontWeight: 900, color: 'var(--muted)', display: 'block', marginBottom: 5 },
  metaVal:      { fontSize: 12, fontWeight: 800, color: 'var(--primary)' },
  skillGrid:    { display: 'flex', flexWrap: 'wrap', gap: 6 },
  skill:        { fontSize: 10, fontWeight: 700, background: 'var(--surface2)', padding: '4px 10px', borderRadius: 6 },
  dropzone:     { border: '1.5px dashed var(--border2)', borderRadius: 12, padding: '2rem', textAlign: 'center', background: 'var(--surface2)', cursor: 'pointer' },
  loading:      { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--muted)', background: 'var(--bg)' },
  ghostBtn:     { background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' },
  empty:        { textAlign: 'center', padding: '1rem', color: 'var(--muted)', fontSize: 12 }
}
