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

export default function Setup({ profile, onStart, onLogout, onGoBack }) {
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
      {/* Sidebar - Reusing styles from Dashboard */}
      <aside style={s.sidebar}>
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
          <div>
            <h1 style={s.mainTitle}>Session Configuration</h1>
            <p style={s.mainSubtitle}>Tailor the AI behavior to your preparation goals.</p>
          </div>
          <button style={{ ...s.primaryBtn, opacity: canStart ? 1 : 0.5 }} disabled={!canStart} onClick={() => onStart({ level, topics, topicList, mode, sessionType: 'questions', totalQ: qTarget, studyTime, interviewType: type })}>
            Launch Interview
          </button>
        </header>

        <div style={s.grid}>
          {/* Section 1: Focus & Level */}
          <div style={s.section}>
            <div style={s.proCard}>
              <h3 style={s.cardTitle}>Interview Track</h3>
              <div style={s.typeGrid}>
                {[
                  { id: 'technical', icon: '💻', title: 'Technical', desc: 'Tools & Architecture' },
                  { id: 'behavioral', icon: '🤝', title: 'Behavioral', desc: 'SRE & Leadership' }
                ].map(it => (
                  <button key={it.id} 
                    style={{ ...s.typeBtn, borderColor: type === it.id ? 'var(--primary)' : 'var(--border)', background: type === it.id ? 'var(--primary-l)' : 'var(--surface)' }}
                    onClick={() => setType(it.id)}>
                    <span style={s.typeIcon}>{it.icon}</span>
                    <div style={s.typeTitle}>{it.title}</div>
                  </button>
                ))}
              </div>

              <h3 style={{ ...s.cardTitle, marginTop: '2rem' }}>Experience Level</h3>
              <div style={s.levelGrid}>
                {LEVELS.map(l => (
                  <button key={l.id}
                    style={{ ...s.levelBtn, borderColor: level?.id === l.id ? l.color : 'var(--border)', background: level?.id === l.id ? `${l.color}15` : 'var(--surface)', color: level?.id === l.id ? l.color : 'var(--text-2)' }}
                    onClick={() => setLevel(l)}>
                    <div style={s.levelLabel}>{l.label}</div>
                    <div style={s.levelTag}>{l.tag}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Tech Stack (if technical) */}
          <div style={s.section}>
            {type === 'technical' ? (
              <div style={s.proCard}>
                <h3 style={s.cardTitle}>Target Tech Stack</h3>
                <div style={s.topicScroll}>
                  {TOPIC_GROUPS.map(group => (
                    <div key={group.name} style={s.group}>
                      <div style={s.groupName}>{group.name}</div>
                      <div style={s.topicGrid}>
                        {group.topics.map(t => {
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
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={s.behavioralInfo}>
                <div style={s.infoIcon}>🤝</div>
                <h3 style={s.infoTitle}>Behavioral Focus</h3>
                <p style={s.infoDesc}>Alex will focus on incident management, blameless culture, and situational leadership scenarios. Tech stack selection is disabled.</p>
              </div>
            )}
          </div>

          {/* Section 3: Modes & Length */}
          <div style={s.section}>
            <div style={s.proCard}>
              <h3 style={s.cardTitle}>Mode & Length</h3>
              <div style={s.modeGrid}>
                {['text', 'voice'].map(m => (
                  <button key={m} style={{ ...s.modeBtn, background: mode === m ? 'var(--primary-l)' : 'var(--surface-2)', color: mode === m ? 'var(--primary)' : 'var(--muted)' }} onClick={() => setMode(m)}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={s.qControl}>
                <div style={s.qLabel}>Questions: <span style={s.qVal}>{qTarget}</span></div>
                <input type="range" min="5" max="25" step="5" value={qTarget} onChange={e => setQTarget(e.target.value)} style={s.range} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex' },
  sidebar: { width: 'var(--sidebar-w)', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '1.5rem', position: 'fixed', height: '100vh', zIndex: 100 },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2.5rem' },
  logoSmall: { width: 32, height: 32, background: 'var(--primary)', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 },
  logoText: { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--muted)', background: 'none', textAlign: 'left' },
  navItemActive: { background: 'var(--primary-l)', color: 'var(--primary)' },
  navIcon: { fontSize: 16 },
  sidebarFooter: { borderTop: '1px solid var(--border)', paddingTop: '1.5rem' },
  backBtn: { background: 'none', color: 'var(--muted)', fontWeight: 700, fontSize: 12 },
  
  main: { flex: 1, marginLeft: 'var(--sidebar-w)', padding: '2.5rem 3.5rem' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' },
  mainTitle: { fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' },
  mainSubtitle: { fontSize: '0.95rem', color: 'var(--muted)', fontWeight: 500 },
  primaryBtn: { background: 'var(--primary)', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 800, fontSize: 15, boxShadow: '0 8px 20px var(--primary-glow)' },
  
  grid: { display: 'grid', gridTemplateColumns: '380px 1fr 300px', gap: '1.5rem', alignItems: 'start' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.75rem' },
  cardTitle: { fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' },
  
  typeGrid: { display: 'flex', gap: '1rem' },
  typeBtn: { flex: 1, padding: '1.5rem 1rem', borderRadius: 16, border: '2px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  typeIcon: { fontSize: 24 },
  typeTitle: { fontSize: 14, fontWeight: 800 },
  
  levelGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
  levelBtn: { padding: '1rem 0.5rem', borderRadius: 12, border: '2px solid', textAlign: 'center' },
  levelLabel: { fontWeight: 800, fontSize: 14 },
  levelTag: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', marginTop: 4 },
  
  topicScroll: { maxHeight: 500, overflowY: 'auto', paddingRight: '1rem' },
  group: { marginBottom: '2rem' },
  groupName: { fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase' },
  topicGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' },
  topicBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0.5rem', borderRadius: 14, border: '2px solid' },
  tIcon: { fontSize: 20, marginBottom: 8 },
  tLabel: { fontSize: 12, fontWeight: 700 },
  
  behavioralInfo: { background: 'var(--primary-l)', borderRadius: 'var(--radius)', padding: '3rem 2rem', textAlign: 'center' },
  infoIcon: { fontSize: '3rem', marginBottom: '1.5rem' },
  infoTitle: { fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem' },
  infoDesc: { fontSize: '0.95rem', color: 'var(--text-2)', lineHeight: 1.6 },
  
  modeGrid: { display: 'flex', gap: 8, marginBottom: '2rem' },
  modeBtn: { flex: 1, padding: '10px', borderRadius: 10, fontWeight: 800, fontSize: 11 },
  qControl: { marginTop: '1.5rem' },
  qLabel: { fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text)' },
  qVal: { color: 'var(--primary)', fontSize: 16 },
  range: { width: '100%' }
}
