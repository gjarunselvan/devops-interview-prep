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
        const { summary, skills, recommendedTopics, experienceLevel, suggestedCourses } = data.result
        const { error: upError } = await supabase.from('profiles').update({ 
          resume_text: text, 
          suggested_skills: skills, 
          experience_level: experienceLevel, 
          metadata: { summary, recommendedTopics, suggestedCourses } 
        }).eq('id', profile.id)
        
        if (upError) throw upError
        alert('Analysis complete and profile updated!'); 
        window.location.reload()
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
  const improveHistory = sessions.flatMap(s => (s.improve_points || []).map(p => ({ text: p, date: new Date(s.created_at).toLocaleDateString(), sessionData: s }))).slice(0, 10)
  const suggestedCourses = profile?.metadata?.suggestedCourses || []

  if (loading) return <div style={s.loading}>Initializing Command Center...</div>

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>DevOps Command Center</span>
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
        <div style={s.grid}>
          {/* Main Performance & Rank */}
          <div style={s.leftCol}>
            <div style={s.card}>
              <div style={s.cardTitle}>Technical Standing</div>
              <div style={s.statsRow}>
                <div style={s.statBox}>
                  <div style={s.statVal}>{avgScore}</div>
                  <div style={s.statLabel}>AVG SCORE</div>
                </div>
                <div style={s.statBox}>
                  <div style={s.statVal}>{sessions.length}</div>
                  <div style={s.statLabel}>COMPLETED</div>
                </div>
              </div>
            </div>

            <div style={{ ...s.card, background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>CAREER RANK</span>
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 4 }}>🔥 {profile.streak || 1} DAYS</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>Level {profile.level || 1}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{profile.xp || 0} Total XP</div>
              <div style={s.xpBar}><div style={{ ...s.xpFill, width: `${((profile.xp || 0) % 500) / 5}%` }} /></div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Improvement Feed</div>
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
                {improveHistory.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '1rem 0' }}>No data yet. Start your first session.</p>}
              </div>
            </div>
          </div>

          {/* Roadmap & Profile */}
          <div style={s.rightCol}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button style={{ ...s.startBtn, flex: 2, marginBottom: 0 }} onClick={onStartSession}>🚀 Start New Interview</button>
              <button style={{ ...s.reuploadBtn, flex: 1 }} onClick={() => document.getElementById('res-up').click()}>
                {analyzing ? '⏳' : '🔄'} Update Resume
              </button>
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={s.cardTitle}>Dynamic Roadmap</div>
                <button style={s.ghostBtn} onClick={handleGenerateRoadmap} disabled={generating}>{generating ? '...' : 'Refresh'}</button>
              </div>
              {roadmap ? (
                <div style={s.roadmapStack}>
                  {roadmap.focus && <div style={s.roadmapFocus}><strong>Focus:</strong> {roadmap.focus}</div>}
                  <div style={s.roadmapScroll}>
                    {roadmap.days.map((d, i) => (
                      <div key={i} style={s.roadmapDay}>
                        <div style={s.dayTitle}>{d.day}</div>
                        {d.tasks.map((t, ti) => (
                          <div key={ti} style={s.taskItem}>
                            <div style={s.taskName}>{t.title}</div>
                            <div style={s.taskMeta}>
                              <span style={s.taskDur}>{t.duration}</span>
                              {t.resourceLink && <a href={t.resourceLink} target="_blank" rel="noreferrer" style={s.taskLink}>RESOURCE</a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>Upload your resume to generate a plan.</p>}
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Career Profile Analysis</div>
              {profile?.metadata?.summary ? (
                <div>
                  <div style={s.profileSummary}>{profile.metadata.summary}</div>
                  <div style={s.profileMeta}>
                    <span style={s.profileBadge}>Target: {profile.experience_level || 'General'}</span>
                  </div>
                  <div style={s.skillGrid}>
                    {profile.suggested_skills?.slice(0, 12).map((sk, i) => (
                      <span key={i} style={s.skillTag}>{sk}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={s.dropzone}>
                  <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} style={{ display: 'none' }} id="res-up" />
                  <label htmlFor="res-up" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Upload Resume for AI Analysis</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Identify skills gaps and generate a roadmap</div>
                  </label>
                </div>
              )}
              {suggestedCourses.length > 0 && (
                <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>Recommended Tech Stacks</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {suggestedCourses.map((c, i) => <span key={i} style={s.courseTag}>{c}</span>)}
                  </div>
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
  logo:         { width: 36, height: 36, background: 'var(--primary)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 },
  navTitle:     { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 16 },
  themeToggle:  { background: 'var(--surface2)', border: '1px solid var(--border)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' },
  avatar:       { width: 34, height: 34, background: 'var(--primary-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 14 },
  navName:      { fontSize: 14, fontWeight: 700, color: 'var(--text2)' },
  logoutBtn:    { padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  content:      { padding: '2rem' },
  grid:         { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem' },
  leftCol:      { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  rightCol:     { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  cardTitle:    { fontSize: 12, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 },
  statsRow:     { display: 'flex', justifyContent: 'space-around', textAlign: 'center' },
  statBox:      { flex: 1 },
  statVal:      { fontSize: 36, fontWeight: 900, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' },
  statLabel:    { fontSize: 10, fontWeight: 800, color: 'var(--muted)', marginTop: 8 },
  xpBar:        { height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
  xpFill:       { height: '100%', background: '#fff', boxShadow: '0 0 10px rgba(255,255,255,0.5)' },
  improveList:  { display: 'flex', flexDirection: 'column', gap: 10 },
  improveItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface2)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' },
  improveText:  { fontSize: 13, fontWeight: 700, color: 'var(--text2)' },
  improveDate:  { fontSize: 10, color: 'var(--muted)', marginTop: 4 },
  startBtn:     { width: '100%', padding: '18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', marginBottom: '1.5rem', boxShadow: '0 8px 20px var(--primary-glow)' },
  reuploadBtn:  { padding: '12px', border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text2)' },
  roadmapStack: { display: 'flex', flexDirection: 'column', gap: 16 },
  roadmapFocus: { fontSize: 14, color: 'var(--primary)', background: 'var(--primary-l)', padding: '10px 14px', borderRadius: 10, marginBottom: 10 },
  roadmapScroll: { display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' },
  roadmapDay:   { minWidth: 220, borderLeft: '3px solid var(--primary-l)', paddingLeft: 16 },
  dayTitle:     { fontSize: 11, fontWeight: 900, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase' },
  taskItem:     { marginBottom: 12, background: 'var(--surface2)', padding: '10px', borderRadius: 10 },
  taskName:     { fontSize: 12, fontWeight: 800, color: 'var(--text2)', marginBottom: 4 },
  taskMeta:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  taskDur:      { fontSize: 10, color: 'var(--muted)', fontWeight: 600 },
  taskLink:     { fontSize: 9, color: 'var(--primary)', fontWeight: 900, textDecoration: 'none' },
  dropzone:     { border: '2px dashed var(--border2)', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', background: 'var(--surface2)', transition: 'all 0.2s' },
  profileSummary: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' },
  profileMeta:    { display: 'flex', gap: 10, marginBottom: 16 },
  profileBadge:   { fontSize: 11, fontWeight: 800, background: 'var(--primary-l)', padding: '4px 10px', borderRadius: 6, color: 'var(--primary)' },
  skillGrid:      { display: 'flex', flexWrap: 'wrap', gap: 8 },
  skillTag:       { fontSize: 11, fontWeight: 700, background: 'var(--surface2)', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 8, color: 'var(--text2)' },
  courseTag:    { fontSize: 10, fontWeight: 800, background: 'var(--primary-l)', color: 'var(--primary)', padding: '6px 12px', borderRadius: 8, textTransform: 'uppercase' },
  loading:      { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--muted)', fontWeight: 800, background: 'var(--bg)' },
  ghostBtn:     { background: 'none', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, color: 'var(--muted)' }
}
