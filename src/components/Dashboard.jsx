import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export default function Dashboard({ profile, onStartSession, onLogout, theme, bgColor, onPersonalize, onViewReport, sidebarOpen, onToggleSidebar }) {
  const [sessions, setSessions] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
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
        alert('PDF or DOCX only.')
        setAnalyzing(false)
        return
      }
      if (!text.trim()) throw new Error('Empty file.')
      const res = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text })
      })
      const data = await res.json()
      if (data.result) {
        const { summary, skills, recommendedTopics, experienceLevel, suggestedCourses } = data.result
        await supabase.from('profiles').update({
          resume_text: text, suggested_skills: skills, experience_level: experienceLevel,
          metadata: { summary, recommendedTopics, suggestedCourses }
        }).eq('id', profile.id)
        alert('Analysis complete!')
        window.location.reload()
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
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
        body: JSON.stringify({ profile, recentSessions: sessions.slice(0, 3), studyTimePref: profile.study_daily_mins || 60 })
      })
      const data = await res.json()
      if (data.result) {
        await supabase.from('roadmaps').insert({ user_id: profile.id, content: data.result })
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

  const improveHistory = sessions.flatMap(s => 
    (s.improve_points || []).map(p => ({
      text: p, date: new Date(s.created_at).toLocaleDateString(), sessionData: s
    }))
  ).slice(0, 8)

  const suggestedCourses = profile?.metadata?.suggestedCourses || []

  if (loading) return <div style={s.loading}>Initializing Dashboard...</div>

  return (
    <div style={s.page}>
      {/* Mobile Overlay */}
      {sidebarOpen && <div style={s.overlay} onClick={onToggleSidebar} />}

      {/* Sidebar Navigation */}
      <aside style={{ ...s.sidebar, transform: `translateX(${sidebarOpen ? '0' : '-100%'})` }}>
        <div style={s.sidebarHeader}>
          <div style={s.logoSmall}>DI</div>
          <span style={s.logoText}>DevOps Prep</span>
        </div>

        <div style={s.sidebarNav}>
          <button style={{ ...s.navItem, ...s.navItemActive }}>
            <span style={s.navIcon}>📊</span> Dashboard
          </button>
          <button style={s.navItem} onClick={onStartSession}>
            <span style={s.navIcon}>🚀</span> New Interview
          </button>
        </div>

        <div style={s.sidebarPersonalization}>
          <div style={s.sidebarLabel}>Personalization</div>
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
            <div style={s.userInfo}>
              <div style={s.userName}>{profile.full_name.split(' ')[0]}</div>
              <div style={s.userLevel}>Level {profile.level || 1}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={onLogout}>Sign Out</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={s.main}>
        <header style={s.topHeader}>
          <div style={s.headerLeft}>
            <button style={s.menuBtn} onClick={onToggleSidebar}>☰</button>
            <div>
              <h1 style={s.mainTitle}>Dashboard</h1>
              <p style={s.mainSubtitle}>Overview of your technical progress</p>
            </div>
          </div>
          <button style={s.primaryBtn} onClick={onStartSession}>
            New Session
          </button>
        </header>

        <div style={s.contentGrid}>
          {/* Metrics */}
          <div style={s.proCard}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>Performance</h3>
              <span style={s.cardBadge}>LIVE</span>
            </div>
            <div style={s.statsRow}>
              <div style={s.statBox}>
                <div style={s.statValue}>{avgScore}</div>
                <div style={s.statLabel}>Avg Score</div>
              </div>
              <div style={s.statDivider} />
              <div style={s.statBox}>
                <div style={s.statValue}>{sessions.length}</div>
                <div style={s.statLabel}>Sessions</div>
              </div>
            </div>
          </div>

          {/* Rank */}
          <div style={{ ...s.proCard, background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff' }}>
            <div style={s.cardHeader}>
              <h3 style={{ ...s.cardTitle, color: '#fff' }}>Rank</h3>
              <div style={s.streakBadge}>🔥 {profile.streak || 1} DAYS</div>
            </div>
            <div style={s.rankInfo}>
              <div style={s.rankLabel}>LEVEL <span style={{ color: '#fff', fontWeight: 900 }}>{profile.level || 1}</span></div>
              <div style={s.rankLabel}>XP <span style={{ color: '#fff', fontWeight: 900 }}>{profile.xp || 0}</span></div>
              <div style={s.xpBarFull}>
                <div style={{ ...s.xpBarFill, width: `${((profile.xp || 0) % 500) / 5}%` }} />
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div style={{ ...s.proCard, gridColumn: '1 / -1' }}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>Roadmap</h3>
              <button style={s.ghostBtn} onClick={handleGenerateRoadmap} disabled={generating}>Refresh</button>
            </div>
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
                          <div style={s.taskMeta}>
                            <span style={s.taskDur}>{t.duration}</span>
                            {t.resourceLink && <a href={t.resourceLink} target="_blank" rel="noreferrer" style={s.taskLink}>Link</a>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.emptyState}>No plan generated.</div>
            )}
          </div>

          {/* Improvement Areas */}
          <div style={s.proCard}>
            <div style={s.cardHeader}><h3 style={s.cardTitle}>Improvements</h3></div>
            <div style={s.improveList}>
              {improveHistory.map((item, i) => (
                <div key={i} style={s.improveItem} onClick={() => onViewReport(item.sessionData)}>
                  <div style={s.improveInfo}>
                    <div style={s.improveText}>{item.text}</div>
                    <div style={s.improveDate}>{item.date}</div>
                  </div>
                  <span style={s.improveIcon}>→</span>
                </div>
              ))}
              {improveHistory.length === 0 && <div style={s.emptyState}>No data.</div>}
            </div>
          </div>

          {/* Resume */}
          <div style={s.proCard}>
            <div style={s.cardHeader}><h3 style={s.cardTitle}>Resume</h3></div>
            <div style={s.dropzone}>
              <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} style={s.fileInput} id="res-up" />
              <label htmlFor="res-up" style={s.dropLabel}>
                <span style={s.dropIcon}>{analyzing ? '⏳' : '📁'}</span>
                <div style={s.dropText}>{analyzing ? 'Analyzing...' : 'Click to Upload'}</div>
              </label>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 },
  sidebar: { width: 'var(--sidebar-w)', minWidth: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '1.5rem', position: 'fixed', height: '100vh', zIndex: 100, transition: 'transform 0.3s ease' },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2.5rem' },
  logoSmall: { width: 32, height: 32, background: 'var(--primary)', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 },
  logoText: { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--muted)', background: 'none', textAlign: 'left' },
  navItemActive: { background: 'var(--primary-l)', color: 'var(--primary)' },
  navIcon: { fontSize: 16 },
  sidebarPersonalization: { padding: '1.5rem 0', borderTop: '1px solid var(--border)', marginBottom: '1.5rem' },
  sidebarLabel: { fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' },
  themePicker: { display: 'flex', gap: 8, marginBottom: 12 },
  themeIcon: { width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  miniColor: { width: '100%', height: 24, border: 'none', borderRadius: 6, padding: 0, cursor: 'pointer' },
  sidebarFooter: { borderTop: '1px solid var(--border)', paddingTop: '1.5rem' },
  userMini: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' },
  userAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  userLevel: { fontSize: 11, color: 'var(--primary)', fontWeight: 700 },
  logoutBtn: { width: '100%', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--red)' },
  
  main: { flex: 1, marginLeft: 'var(--sidebar-w)', padding: 'clamp(1rem, 5vw, 2.5rem)', maxWidth: '100vw' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  menuBtn: { fontSize: '1.5rem', background: 'none', display: 'none' }, // Shown via media query in index.css if possible, but here we can just use inline
  // Re-adding the media query equivalent for menuBtn
  mainTitle: { fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' },
  mainSubtitle: { fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 },
  primaryBtn: { background: 'var(--primary)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px var(--primary-glow)' },
  
  contentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.5rem', display: 'flex', flexDirection: 'column' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  cardTitle: { fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardBadge: { fontSize: 9, fontWeight: 800, color: 'var(--green)', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 7px', borderRadius: 6 },
  
  statsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0.5rem 0' },
  statBox: { textAlign: 'center' },
  statValue: { fontSize: '2rem', fontWeight: 900, color: 'var(--text)', fontFamily: '"JetBrains Mono", monospace' },
  statLabel: { fontSize: 11, color: 'var(--muted)', fontWeight: 600 },
  statDivider: { width: 1, height: 30, background: 'var(--border-2)' },
  
  streakBadge: { fontSize: 9, fontWeight: 900, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '3px 8px', borderRadius: 30 },
  rankInfo: { marginTop: '0.5rem' },
  rankLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  xpBarFull: { height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  xpBarFill: { height: '100%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' },
  
  roadmapScroll: { display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none' },
  roadmapDay: { minWidth: 200, flexShrink: 0 },
  dayTitle: { fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase' },
  taskItem: { display: 'flex', gap: 10, marginBottom: '1rem' },
  taskCircle: { width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--primary)', marginTop: 4, flexShrink: 0 },
  taskDetails: { flex: 1 },
  taskName: { fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 },
  taskMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  taskDur: { fontSize: 10, color: 'var(--muted)', fontWeight: 500 },
  taskLink: { fontSize: 10, color: 'var(--primary)', fontWeight: 700 },
  
  improveList: { display: 'flex', flexDirection: 'column', gap: 8 },
  improveItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, cursor: 'pointer' },
  improveInfo: { flex: 1 },
  improveText: { fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 2 },
  improveDate: { fontSize: 9, color: 'var(--muted)', fontWeight: 600 },
  improveIcon: { fontSize: 12, color: 'var(--primary)', fontWeight: 900 },
  
  dropzone: { border: '2px dashed var(--border-2)', borderRadius: 12, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' },
  fileInput: { display: 'none' },
  dropLabel: { cursor: 'pointer' },
  dropIcon: { fontSize: '1.5rem', marginBottom: 8, display: 'block' },
  dropText: { fontSize: 12, fontWeight: 700, color: 'var(--text)' },
  
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontSize: 14, fontWeight: 600 },
  ghostBtn: { background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: 'var(--muted)' },
  emptyState: { padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }
}

// Inline Media Query Handler for Mobile Menu Button
if (typeof window !== 'undefined' && window.innerWidth <= 768) {
  s.sidebar.transform = `translateX(${s.sidebar.transform === 'translateX(0)' ? '0' : '-100%'})`
  s.menuBtn.display = 'block'
}
