import { useState, useEffect } from 'react'

const LEVELS = [
  { id: '0-1', label: '0–1 years', tag: 'Fresher',             color: '#16a34a' },
  { id: '1-3', label: '1–3 years', tag: 'Junior',              color: '#2563eb' },
  { id: '3-5', label: '3–5 years', tag: 'Mid Level',           color: '#d97706' },
  { id: '5-8', label: '5–8 years', tag: 'Senior',              color: '#ea580c' },
  { id: '8+',  label: '8+ years',  tag: 'Principal/Architect', color: '#7c3aed' },
]

const TOPIC_GROUPS = [
  {
    name: 'Cloud Platforms',
    topics: [
      { id: 'aws', label: 'AWS', icon: '☁️' },
      { id: 'gcp', label: 'GCP', icon: '🔵' },
      { id: 'azure', label: 'Azure', icon: '🟦' },
    ]
  },
  {
    name: 'Containerization & Orchestration',
    topics: [
      { id: 'kubernetes', label: 'Kubernetes', icon: '☸️' },
      { id: 'docker', label: 'Docker', icon: '🐳' },
      { id: 'helm', label: 'Helm', icon: '⛵' },
      { id: 'argocd', label: 'Argo CD', icon: '🤖' },
    ]
  },
  {
    name: 'Infrastructure & Configuration',
    topics: [
      { id: 'terraform', label: 'Terraform', icon: '🏗️' },
      { id: 'ansible', label: 'Ansible', icon: '⚙️' },
      { id: 'linux', label: 'Linux', icon: '🐧' },
    ]
  },
  {
    name: 'CI/CD & Development',
    topics: [
      { id: 'cicd', label: 'CI/CD', icon: '🔄' },
      { id: 'jenkins', label: 'Jenkins', icon: '🏺' },
      { id: 'git', label: 'Git', icon: '🌿' },
    ]
  },
  {
    name: 'Observability & Security',
    topics: [
      { id: 'monitoring', label: 'Monitoring', icon: '📊' },
      { id: 'prometheus', label: 'Prometheus', icon: '🔥' },
      { id: 'elk', label: 'ELK Stack', icon: '📋' },
      { id: 'security', label: 'DevSecOps', icon: '🔐' },
      { id: 'vault', label: 'Vault', icon: '🔑' },
    ]
  }
]

const Q_OPTIONS   = [5, 10, 15, 20]

export default function Setup({ profile, onStart, onLogout, onGoBack, theme, onPersonalize, bgColor }) {
  const [level,       setLevel]       = useState(null)
  const [topics,      setTopics]      = useState([])
  const [mode,        setMode]        = useState('text')
  const [type,        setType]        = useState('technical')
  const [qTarget,     setQTarget]     = useState(10)
  const [studyTime,   setStudyTime]   = useState(profile?.study_daily_mins || 60)

  useEffect(() => {
    const recommended = profile?.metadata?.recommendedTopics || []
    const initialTopics = []
    TOPIC_GROUPS.forEach(g => g.topics.forEach(t => { if (recommended.includes(t.id)) initialTopics.push(t) }))
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
      <nav style={s.nav}>
        <div style={{ ...s.navBrand, cursor: 'pointer' }} onClick={onGoBack}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>Session Setup</span>
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
          <h2 style={s.heroTitle}>Customize your <span style={{ color: 'var(--primary)' }}>Interview Simulation</span></h2>
          <p style={s.heroSub}>Choose your track, level, and specific technical focus.</p>
        </div>

        <div style={s.grid}>
          <div style={s.configPanel}>
            {/* Step 1: Experience */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>01</span><div style={s.cardTitle}>Target Seniority</div></div>
              <div style={s.levelGrid}>
                {LEVELS.map(l => (
                  <button key={l.id}
                    style={{ ...s.levelBtn, borderColor: level?.id === l.id ? l.color : 'var(--border)', background: level?.id === l.id ? `${l.color}12` : 'var(--surface)', color: level?.id === l.id ? l.color : 'var(--muted)' }}
                    onClick={() => setLevel(l)}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{l.label}</div>
                    <div style={{ fontSize: 10, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{l.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Track */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>02</span><div style={s.cardTitle}>Interview Track</div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ id: 'technical', label: 'Technical Screen' }, { id: 'behavioral', label: 'Behavioral & Culture' }].map(it => (
                  <button key={it.id} 
                    style={{ ...s.chipBtn, flex: 1, borderColor: type === it.id ? 'var(--primary)' : 'var(--border)', background: type === it.id ? 'var(--primary-l)' : 'var(--surface)', color: type === it.id ? 'var(--primary)' : 'var(--muted)' }}
                    onClick={() => setType(it.id)}>
                    {it.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Tech Stack */}
            {type === 'technical' && (
              <div style={s.card}>
                <div style={s.cardHeader}><span style={s.step}>03</span><div style={s.cardTitle}>Target Tech Stack</div></div>
                <div style={s.groupsContainer}>
                  {TOPIC_GROUPS.map(g => (
                    <div key={g.name} style={s.group}>
                      <div style={s.groupName}>{g.name}</div>
                      <div style={s.topicGrid}>
                        {g.topics.map(t => {
                          const sel = !!topics.find(x => x.id === t.id)
                          return (
                            <button key={t.id}
                              style={{ ...s.topicBtn, borderColor: sel ? 'var(--primary)' : 'var(--border)', background: sel ? 'var(--primary-l)' : 'var(--surface)', color: sel ? 'var(--primary)' : 'var(--muted)' }}
                              onClick={() => toggleTopic(t)}>
                              <span style={{ fontSize: 18 }}>{t.icon}</span>
                              <span style={{ fontSize: 10, marginTop: 4, fontWeight: 700 }}>{t.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={s.settingsPanel}>
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>04</span><div style={s.cardTitle}>Interview Mode</div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { id: 'text',  icon: '⌨️', title: 'Text' },
                  { id: 'voice', icon: '🎙️', title: 'Voice' },
                ].map(m => (
                  <button key={m.id}
                    style={{ ...s.modeBtn, flex: 1, borderColor: mode === m.id ? 'var(--primary)' : 'var(--border)', background: mode === m.id ? 'var(--primary-l)' : 'var(--surface)', color: mode === m.id ? 'var(--primary)' : 'var(--text2)' }}
                    onClick={() => setMode(m.id)}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>05</span><div style={s.cardTitle}>Session Targets</div></div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {Q_OPTIONS.map(q => (
                  <button key={q}
                    style={{ ...s.chipBtn, flex: 1, borderColor: qTarget === q ? 'var(--primary)' : 'var(--border)', background: qTarget === q ? 'var(--primary-l)' : 'var(--surface)', color: qTarget === q ? 'var(--primary)' : 'var(--muted)' }}
                    onClick={() => setQTarget(q)}>
                    {q} Qs
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>Daily Prep Goal: {studyTime}m</div>
              <input type="range" min="15" max="240" step="15" value={studyTime} onChange={e => setStudyTime(e.target.value)} style={{ width: '100%' }} />
            </div>

            <button style={{ ...s.startBtn, opacity: canStart ? 1 : 0.4 }} disabled={!canStart} onClick={() => onStart({ level, topics, topicList, mode, sessionType: 'questions', totalQ: qTarget, studyTime, interviewType: type })}>
              Launch AI Simulation →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:         { minHeight: '100vh', background: 'var(--bg)' },
  nav:          { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navBrand:     { display: 'flex', alignItems: 'center', gap: 10 },
  logo:         { width: 36, height: 36, background: 'var(--primary)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 },
  navTitle:     { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 16 },
  themeToggle:  { background: 'var(--surface2)', border: '1px solid var(--border)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' },
  avatar:       { width: 34, height: 34, background: 'var(--primary-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 14 },
  navName:      { fontSize: 14, fontWeight: 700, color: 'var(--text2)' },
  logoutBtn:    { padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  content:      { maxWidth: 1300, margin: '0 auto', padding: '2rem 1.5rem' },
  hero:         { marginBottom: '2.5rem', textAlign: 'center' },
  heroTitle:    { fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' },
  heroSub:      { fontSize: 16, color: 'var(--muted)', marginTop: 8, fontWeight: 500 },
  grid:         { display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' },
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow)' },
  cardHeader:   { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  step:         { width: 30, height: 30, background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, fontFamily: 'JetBrains Mono,monospace' },
  cardTitle:    { fontSize: 16, fontWeight: 800, color: 'var(--text)' },
  levelGrid:    { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 },
  levelBtn:     { padding: '14px 8px', borderRadius: 10, border: '2px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  groupsContainer: { display: 'flex', flexDirection: 'column', gap: 24 },
  groupName:    { fontSize: 11, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 },
  topicGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 },
  topicBtn:     { padding: '12px 8px', borderRadius: 12, border: '2px solid', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.2s' },
  modeBtn:      { padding: '20px 12px', borderRadius: 14, border: '2px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  chipBtn:      { padding: '11px 14px', borderRadius: 10, border: '2px solid', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' },
  startBtn:     { width: '100%', padding: '18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px var(--primary-glow)' },
}
