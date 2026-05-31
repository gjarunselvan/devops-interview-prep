import { useState, useEffect } from 'react'

const LEVELS = [
  { id: '0-1', label: '0–1y', tag: 'Fresher',    color: '#10b981' },
  { id: '1-3', label: '1–3y', tag: 'Junior',     color: '#2563eb' },
  { id: '3-5', label: '3–5y', tag: 'Mid Level',  color: '#f59e0b' },
  { id: '5-8', label: '5–8y', tag: 'Senior',     color: '#ef4444' },
  { id: '8+',  label: '8y+',  tag: 'Architect',  color: '#7c3aed' },
]

const TOPIC_GROUPS = [
  {
    name: 'Cloud & Infrastructure',
    topics: [
      { id: 'aws', label: 'AWS', icon: '☁️' },
      { id: 'gcp', label: 'GCP', icon: '🔵' },
      { id: 'azure', label: 'Azure', icon: '🟦' },
      { id: 'terraform', label: 'Terraform', icon: '🏗️' },
      { id: 'ansible', label: 'Ansible', icon: '⚙️' },
    ]
  },
  {
    name: 'Containers & Dev',
    topics: [
      { id: 'kubernetes', label: 'K8s', icon: '☸️' },
      { id: 'docker', label: 'Docker', icon: '🐳' },
      { id: 'cicd', label: 'CI/CD', icon: '🔄' },
      { id: 'git', label: 'Git', icon: '🌿' },
    ]
  }
]

export default function Setup({ profile, onStart, onLogout, onGoBack, sidebarOpen, onToggleSidebar }) {
  const [level,       setLevel]       = useState(null)
  const [topics,      setTopics]      = useState([])
  const [mode,        setMode]        = useState('text')
  const [type,        setType]        = useState('technical')
  const [qTarget,     setQTarget]     = useState(10)
  const [studyTime,   setStudyTime]   = useState(profile?.study_daily_mins || 60)

  useEffect(() => {
    const recommended = profile?.metadata?.recommendedTopics || []
    const initialTopics = []
    TOPIC_GROUPS.forEach(group => {
      group.topics.forEach(t => { if (recommended.includes(t.id)) initialTopics.push(t) })
    })
    if (initialTopics.length > 0) setTopics(initialTopics)
    if (profile?.experience_level) {
      const foundLevel = LEVELS.find(l => l.tag === profile.experience_level || l.id === profile.experience_level)
      if (foundLevel) setLevel(foundLevel)
    }
  }, [profile])

  function toggleTopic(t) {
    setTopics(prev => prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t])
  }

  const topicList = topics.map(t => t.label).join(', ')
  const canStart  = level && (type === 'behavioral' || topics.length > 0)

  return (
    <div style={s.page}>
      {sidebarOpen && <div style={s.overlay} onClick={onToggleSidebar} />}

      <aside style={{ ...s.sidebar, transform: `translateX(${sidebarOpen ? '0' : '-100%'})` }}>
        <div style={s.sidebarHeader}>
          <div style={s.logoSmall}>DI</div>
          <span style={s.logoText}>DevOps Prep</span>
        </div>
        <div style={s.sidebarNav}>
          <button style={s.navItem} onClick={onGoBack}><span style={s.navIcon}>📊</span> Dashboard</button>
          <button style={{ ...s.navItem, ...s.navItemActive }}><span style={s.navIcon}>🚀</span> New Interview</button>
        </div>
        <div style={s.sidebarFooter}>
          <button style={s.backBtn} onClick={onGoBack}>← Back to Home</button>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.topHeader}>
          <div style={s.headerLeft}>
            <button style={s.menuBtn} onClick={onToggleSidebar}>☰</button>
            <div>
              <h1 style={s.mainTitle}>New Session</h1>
              <p style={s.mainSubtitle}>Configure your interview scenario</p>
            </div>
          </div>
          <button style={{ ...s.primaryBtn, opacity: canStart ? 1 : 0.5 }} disabled={!canStart} onClick={() => onStart({ level, topics, topicList, mode, sessionType: 'questions', totalQ: qTarget, studyTime, interviewType: type })}>
            Launch
          </button>
        </header>

        <div style={s.grid}>
          <div style={s.proCard}>
            <h3 style={s.cardTitle}>Focus</h3>
            <div style={s.typeGrid}>
              {[{ id: 'technical', icon: '💻', title: 'Tech' }, { id: 'behavioral', icon: '🤝', title: 'Soft' }].map(it => (
                <button key={it.id} 
                  style={{ ...s.typeBtn, borderColor: type === it.id ? 'var(--primary)' : 'var(--border)', background: type === it.id ? 'var(--primary-l)' : 'var(--surface)' }}
                  onClick={() => setType(it.id)}>
                  <span style={s.typeIcon}>{it.icon}</span>
                  <div style={s.typeTitle}>{it.title}</div>
                </button>
              ))}
            </div>

            <h3 style={{ ...s.cardTitle, marginTop: '2rem' }}>Experience</h3>
            <div style={s.levelGrid}>
              {LEVELS.map(l => (
                <button key={l.id}
                  style={{ ...s.levelBtn, borderColor: level?.id === l.id ? l.color : 'var(--border)', background: level?.id === l.id ? `${l.color}15` : 'var(--surface)', color: level?.id === l.id ? l.color : 'var(--text-2)' }}
                  onClick={() => setLevel(l)}>
                  <div style={s.levelLabel}>{l.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={s.proCard}>
            {type === 'technical' ? (
              <>
                <h3 style={s.cardTitle}>Tech Stack</h3>
                <div style={s.topicGrid}>
                  {TOPIC_GROUPS.flatMap(g => g.topics).map(t => {
                    const sel = !!topics.find(x => x.id === t.id)
                    return (
                      <button key={t.id}
                        style={{ ...s.topicBtn, borderColor: sel ? 'var(--primary)' : 'var(--border)', background: sel ? 'var(--primary-l)' : 'var(--surface)', color: sel ? 'var(--primary)' : 'var(--text-2)' }}
                        onClick={() => toggleTopic(t)}>
                        <span style={s.tIcon}>{t.icon}</span>
                        <span style={s.tLabel}>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div style={s.behavioralInfo}>
                <div style={s.infoIcon}>🤝</div>
                <p style={s.infoDesc}>Alex will focus on leadership and SRE culture.</p>
              </div>
            )}
          </div>

          <div style={s.proCard}>
            <h3 style={s.cardTitle}>Settings</h3>
            <div style={s.modeGrid}>
              {['text', 'voice'].map(m => (
                <button key={m} style={{ ...s.modeBtn, background: mode === m ? 'var(--primary-l)' : 'var(--surface-2)', color: mode === m ? 'var(--primary)' : 'var(--muted)' }} onClick={() => setMode(m)}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={s.qControl}>
              <div style={s.qLabel}>Questions: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{qTarget}</span></div>
              <input type="range" min="5" max="25" step="5" value={qTarget} onChange={e => setQTarget(e.target.value)} style={s.range} />
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
  sidebarFooter: { borderTop: '1px solid var(--border)', paddingTop: '1.5rem' },
  backBtn: { background: 'none', color: 'var(--muted)', fontWeight: 700, fontSize: 12 },
  
  main: { flex: 1, marginLeft: 'var(--sidebar-w)', padding: 'clamp(1rem, 5vw, 2.5rem)', maxWidth: '100vw' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  menuBtn: { fontSize: '1.5rem', background: 'none', display: 'none' },
  mainTitle: { fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' },
  mainSubtitle: { fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 },
  primaryBtn: { background: 'var(--primary)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px var(--primary-glow)' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', alignItems: 'start' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.5rem' },
  cardTitle: { fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' },
  
  typeGrid: { display: 'flex', gap: 8 },
  typeBtn: { flex: 1, padding: '1rem', borderRadius: 12, border: '2px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  typeIcon: { fontSize: 20 },
  typeTitle: { fontSize: 12, fontWeight: 800 },
  
  levelGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 },
  levelBtn: { padding: '8px', borderRadius: 8, border: '2px solid', textAlign: 'center' },
  levelLabel: { fontWeight: 800, fontSize: 12 },
  
  topicGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 },
  topicBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', borderRadius: 12, border: '2px solid' },
  tIcon: { fontSize: 16, marginBottom: 4 },
  tLabel: { fontSize: 11, fontWeight: 700 },
  
  behavioralInfo: { background: 'var(--primary-l)', borderRadius: 12, padding: '2rem 1.5rem', textAlign: 'center' },
  infoIcon: { fontSize: '2rem', marginBottom: '1rem' },
  infoDesc: { fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.5 },
  
  modeGrid: { display: 'flex', gap: 8, marginBottom: '1.5rem' },
  modeBtn: { flex: 1, padding: '8px', borderRadius: 8, fontWeight: 800, fontSize: 10 },
  qControl: { marginTop: '1rem' },
  qLabel: { fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text)' },
  range: { width: '100%' }
}

if (typeof window !== 'undefined' && window.innerWidth <= 768) {
  s.sidebar.transform = `translateX(${s.sidebar.transform === 'translateX(0)' ? '0' : '-100%'})`
  s.menuBtn.display = 'block'
}
