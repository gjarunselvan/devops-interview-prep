import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export default function Dashboard({ profile, onStartSession, onLogout, theme, bgColor, onPersonalize, onViewReport, sidebarOpen, onToggleSidebar }) {
  const [sessions, setSessions] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadDashboardData() }, [])

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
      if (!text.trim()) throw new Error('Empty file')
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
  const improveHistory = sessions.flatMap(s => (s.improve_points || []).map(p => ({ text: p, date: new Date(s.created_at).toLocaleDateString(), sessionData: s }))).slice(0, 12)
  const suggestedCourses = profile?.metadata?.suggestedCourses || []

  if (loading) return <div style={s.loading}>Loading Engine...</div>

  return (
    <div style={s.page}>
      {sidebarOpen && <div style={s.overlay} onClick={onToggleSidebar} />}
      <aside style={{ ...s.sidebar, transform: `translateX(${sidebarOpen ? '0' : '-100%'})` }}>
        <div style={s.sidebarHeader}><div style={s.logoSmall}>DI</div><span style={s.logoText}>DevOps Prep</span></div>
        <div style={s.sidebarNav}>
          <button style={{ ...s.navItem, ...s.navItemActive }}>📊 Dashboard</button>
          <button style={s.navItem} onClick={onStartSession}>🚀 New Interview</button>
        </div>
        <div style={s.sidebarPersonalization}>
          <div style={s.sidebarLabel}>PERSONALIZATION</div>
          <div style={s.themePicker}>
            <button style={s.themeIcon} onClick={() => onPersonalize('light', bgColor)}>☀️</button>
            <button style={s.themeIcon} onClick={() => onPersonalize('dark', bgColor)}>🌙</button>
            <button style={s.themeIcon} onClick={() => onPersonalize('oled', bgColor)}>📱</button>
          </div>
          <input type="color" value={bgColor || '#f8fafc'} onChange={e => onPersonalize(theme, e.target.value)} style={s.miniColor} />
        </div>
        <div style={s.sidebarFooter}>
          <div style={s.userMini}>
            <div style={s.userAvatar}>{profile.full_name[0]}</div>
            <div style={s.userInfo}><div style={s.userName}>{profile.full_name.split(' ')[0]}</div><div style={s.userLevel}>Lvl {profile.level || 1}</div></div>
          </div>
          <button style={s.logoutBtn} onClick={onLogout}>Sign Out</button>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.topHeader}>
          <div style={s.headerLeft}><button style={s.menuBtn} onClick={onToggleSidebar}>☰</button><h1 style={s.mainTitle}>Command Center</h1></div>
          <button style={s.primaryBtn} onClick={onStartSession}>Launch Session</button>
        </header>

        <div style={s.bentoGrid}>
          {/* Performance Widget */}
          <div style={{ ...s.proCard, gridRow: 'span 1' }}>
            <div style={s.cardHeader}><span style={s.cardTitle}>PERFORMANCE</span><span style={s.cardBadge}>LIVE</span></div>
            <div style={s.statsRow}>
              <div style={s.statBox}><div style={s.statValue}>{avgScore}</div><div style={s.statLabel}>AVG SCORE</div></div>
              <div style={s.statBox}><div style={s.statValue}>{sessions.length}</div><div style={s.statLabel}>SESSIONS</div></div>
            </div>
          </div>

          {/* Player Identity */}
          <div style={{ ...s.proCard, background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff' }}>
            <div style={s.cardHeader}><span style={{ ...s.cardTitle, color: '#fff' }}>CAREER RANK</span><div style={s.streakBadge}>🔥 {profile.streak || 1} DAYS</div></div>
            <div style={s.rankInfo}>
              <div style={s.rankLabel}>LVL {profile.level || 1} <span style={{ float: 'right' }}>{profile.xp || 0} XP</span></div>
              <div style={s.xpBarFull}><div style={{ ...s.xpBarFill, width: `${((profile.xp || 0) % 500) / 5}%` }} /></div>
            </div>
          </div>

          {/* Roadmap - Large Area */}
          <div style={{ ...s.proCard, gridColumn: 'span 2', gridRow: 'span 2' }}>
            <div style={s.cardHeader}><span style={s.cardTitle}>TECHNICAL ROADMAP</span><button style={s.ghostBtn} onClick={handleGenerateRoadmap} disabled={generating}>REFRESH</button></div>
            {roadmap ? (
              <div style={s.roadmapScroll}>
                {roadmap.days.map((d, i) => (
                  <div key={i} style={s.roadmapDay}>
                    <div style={s.dayTitle}>{d.day}</div>
                    {d.tasks.map((t, ti) => (
                      <div key={ti} style={s.taskItem}>
                        <div style={s.taskCircle} />
                        <div style={s.taskDetails}>
                          <div style={s.taskName}>{t.title}</div>
                          <div style={s.taskMeta}><span style={s.taskDur}>{t.duration}</span> {t.resourceLink && <a href={t.resourceLink} target="_blank" rel="noreferrer" style={s.taskLink}>RESOURCE</a>}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : <div style={s.emptyState}>No active roadmap.</div>}
          </div>

          {/* Improvements */}
          <div style={{ ...s.proCard, gridRow: 'span 2' }}>
            <div style={s.cardHeader}><span style={s.cardTitle}>FOCUS AREAS</span></div>
            <div style={s.improveList}>
              {improveHistory.map((item, i) => (
                <div key={i} style={s.improveItem} onClick={() => onViewReport(item.sessionData)}>
                  <div style={s.improveInfo}><div style={s.improveText}>{item.text}</div><div style={s.improveDate}>{item.date}</div></div>
                  <span style={s.improveIcon}>→</span>
                </div>
              ))}
              {improveHistory.length === 0 && <div style={s.emptyState}>No weak points recorded.</div>}
            </div>
          </div>

          {/* Resume Upload */}
          <div style={s.proCard}>
            <div style={s.cardHeader}><span style={s.cardTitle}>RESUME ENGINE</span></div>
            <div style={s.dropzone}>
              <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} style={s.fileInput} id="res-up" />
              <label htmlFor="res-up" style={s.dropLabel}>
                <span style={s.dropIcon}>{analyzing ? '⏳' : '📁'}</span>
                <div style={s.dropText}>{analyzing ? 'ANALYZING...' : 'UPDATE PROFILE'}</div>
              </label>
            </div>
            {suggestedCourses.length > 0 && <div style={s.courseTags}>{suggestedCourses.slice(0, 3).map((c, i) => <span key={i} style={s.courseTag}>{c}</span>)}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 },
  sidebar: { width: 'var(--sidebar-w)', minWidth: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '1rem', position: 'fixed', height: '100vh', zIndex: 100, transition: 'transform 0.3s ease' },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem', padding: '0 0.5rem' },
  logoSmall: { width: 28, height: 28, background: 'var(--primary)', color: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12 },
  logoText: { fontWeight: 900, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.02em' },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'var(--muted)', background: 'none', textAlign: 'left' },
  navItemActive: { background: 'var(--primary-l)', color: 'var(--primary)' },
  sidebarPersonalization: { padding: '1rem 0.5rem', borderTop: '1px solid var(--border)', marginBottom: '1rem' },
  sidebarLabel: { fontSize: 9, fontWeight: 900, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.05em' },
  themePicker: { display: 'flex', gap: 6, marginBottom: 10 },
  themeIcon: { width: 28, height: 28, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 },
  miniColor: { width: '100%', height: 20, border: 'none', borderRadius: 4, cursor: 'pointer' },
  sidebarFooter: { borderTop: '1px solid var(--border)', paddingTop: '1rem' },
  userMini: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' },
  userAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: 800, color: 'var(--text)' },
  userLevel: { fontSize: 10, color: 'var(--primary)', fontWeight: 800 },
  logoutBtn: { width: '100%', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'var(--surface-2)', color: 'var(--red)' },
  
  main: { flex: 1, marginLeft: 'var(--sidebar-w)', padding: '1.5rem 2rem', maxWidth: '100vw' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  menuBtn: { fontSize: '1.25rem', background: 'none', display: 'none' },
  mainTitle: { fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' },
  primaryBtn: { background: 'var(--primary)', color: '#fff', padding: '10px 18px', borderRadius: 10, fontWeight: 800, fontSize: 12, boxShadow: '0 4px 12px var(--primary-glow)' },
  
  bentoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', width: '100%' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.25rem', display: 'flex', flexDirection: 'column' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  cardTitle: { fontSize: 9, fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.1em' },
  cardBadge: { fontSize: 8, fontWeight: 900, color: 'var(--green)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4 },
  
  statsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1 },
  statBox: { textAlign: 'center' },
  statValue: { fontSize: '2.25rem', fontWeight: 900, color: 'var(--text)', fontFamily: '"JetBrains Mono", monospace' },
  statLabel: { fontSize: 9, color: 'var(--muted)', fontWeight: 800, marginTop: 4 },
  
  streakBadge: { fontSize: 8, fontWeight: 900, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 6px', borderRadius: 4 },
  rankInfo: { marginTop: '0.25rem' },
  rankLabel: { fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  xpBarFull: { height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' },
  
  roadmapScroll: { display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' },
  roadmapDay: { minWidth: 180, flexShrink: 0 },
  dayTitle: { fontSize: 10, fontWeight: 900, color: 'var(--primary)', marginBottom: '0.75rem' },
  taskItem: { display: 'flex', gap: 8, marginBottom: '0.75rem' },
  taskCircle: { width: 6, height: 6, borderRadius: '50%', border: '1.5px solid var(--primary)', marginTop: 4, flexShrink: 0 },
  taskDetails: { flex: 1 },
  taskName: { fontSize: 11, fontWeight: 800, color: 'var(--text)', marginBottom: 2 },
  taskMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 700 },
  taskDur: { color: 'var(--muted)' },
  taskLink: { color: 'var(--primary)' },
  
  improveList: { display: 'flex', flexDirection: 'column', gap: 6 },
  improveItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, cursor: 'pointer' },
  improveInfo: { flex: 1 },
  improveText: { fontSize: 11, fontWeight: 800, color: 'var(--text-2)', marginBottom: 2 },
  improveDate: { fontSize: 8, color: 'var(--muted)', fontWeight: 700 },
  improveIcon: { fontSize: 10, color: 'var(--primary)', fontWeight: 900 },
  
  dropzone: { border: '1.5px dashed var(--border-2)', borderRadius: 10, padding: '1rem', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' },
  fileInput: { display: 'none' },
  dropLabel: { cursor: 'pointer' },
  dropIcon: { fontSize: '1.25rem', marginBottom: 4, display: 'block' },
  dropText: { fontSize: 11, fontWeight: 800, color: 'var(--text)' },
  courseTags: { display: 'flex', gap: 4, marginTop: '1rem', flexWrap: 'wrap' },
  courseTag: { fontSize: 8, fontWeight: 900, background: 'var(--primary-l)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 4 },
  
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontSize: 12, fontWeight: 800 },
  ghostBtn: { background: 'none', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, color: 'var(--muted)' },
  emptyState: { padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }
}

if (typeof window !== 'undefined' && window.innerWidth <= 768) { s.menuBtn.display = 'block' }
