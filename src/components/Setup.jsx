import { useState, useEffect } from 'react'

const LEVELS = [
  { id: 'student', label: 'Intern/Student', tag: 'Academic', color: '#16a34a' },
  { id: '0-2',     label: '0–2 years',     tag: 'Junior',   color: '#2563eb' },
  { id: '2-5',     label: '2–5 years',     tag: 'Mid-Level', color: '#d97706' },
  { id: '5-10',    label: '5–10 years',    tag: 'Senior',   color: '#ea580c' },
  { id: '10-20',   label: '10–20 years',   tag: 'Staff/Lead', color: '#7c3aed' },
  { id: '20-40',   label: '20–40 years',   tag: 'Architect', color: '#9333ea' },
  { id: '40+',     label: '40+ years',     tag: 'Fellow',    color: '#000000' },
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
const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   color: '#10b981' },
  { id: 'medium', label: 'Medium', color: '#f59e0b' },
  { id: 'hard',   label: 'Hard',   color: '#ef4444' }
]

export default function Setup({ profile, onStart, onLogout, onGoBack, theme, onPersonalize, bgColor }) {
  const [level,       setLevel]       = useState(null)
  const [topics,      setTopics]      = useState([])
  const [mode,        setMode]        = useState('text')
  const [type,        setType]        = useState('technical')
  const [difficulty,  setDifficulty]  = useState('medium')
  const [qTarget,     setQTarget]     = useState(10)
  const [studyTime,   setStudyTime]   = useState(profile?.study_daily_mins || 60)
  const [customYears, setCustomYears] = useState('')

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

  const finalLevel = customYears ? { tag: `${customYears}y Experience`, label: `${customYears} Years`, color: '#2563eb' } : level

  function handleLaunch() {
    if (!canStart) return
    onStart({ 
      level: finalLevel, 
      topics: type === 'behavioral' ? [] : topics, 
      topicList: type === 'behavioral' ? 'Behavioral & Culture' : topicList, 
      mode, 
      sessionType: 'questions', 
      totalQ: qTarget, 
      studyTime, 
      interviewType: type,
      difficulty
    })
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{ ...s.navBrand, cursor: 'pointer' }} onClick={onGoBack}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>DevOps Platform</span>
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
          <h2 style={s.heroTitle}>Launch your <span style={{ color: 'var(--primary)' }}>Technical Simulation</span></h2>
          <p style={s.heroSub}>Tailor every aspect of the interview to match your career stage.</p>
        </div>

        <div style={s.grid}>
          <div style={s.configPanel}>
            {/* Seniority */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>01</span><div style={s.cardTitle}>Career Seniority</div></div>
              <div style={s.levelGrid}>
                {LEVELS.map(l => (
                  <button key={l.id}
                    style={{ ...s.levelBtn, borderColor: level?.id === l.id ? l.color : 'var(--border)', background: level?.id === l.id ? `${l.color}12` : 'var(--surface)', color: level?.id === l.id ? l.color : 'var(--muted)' }}
                    onClick={() => { setLevel(l); setCustomYears(''); }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{l.label}</div>
                    <div style={{ fontSize: 9, marginTop: 2, textTransform: 'uppercase' }}>{l.tag}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <input 
                  type="number" 
                  placeholder="Or enter custom years (e.g. 45)..." 
                  style={s.input} 
                  value={customYears} 
                  onChange={e => { setCustomYears(e.target.value); setLevel({ id: 'custom' }); }}
                />
              </div>
            </div>

            {/* Track Selector */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>02</span><div style={s.cardTitle}>Interview Track</div></div>
              <div style={s.typeStack}>
                {[
                  { id: 'technical', label: 'Technical Screen', desc: 'Tools, syntax & architecture' },
                  { id: 'coding',    label: 'Coding & IaC',    desc: 'Manifests, automation & logic' },
                  { id: 'behavioral', label: 'SRE & Culture',   desc: 'Situational & Soft skills' },
                  { id: 'mixed',      label: 'Mixed Mode',      desc: 'All-in-one comprehensive' }
                ].map(it => (
                  <button key={it.id} 
                    style={{ ...s.trackBtn, borderColor: type === it.id ? 'var(--primary)' : 'var(--border)', background: type === it.id ? 'var(--primary-l)' : 'var(--surface)', color: type === it.id ? 'var(--primary)' : 'var(--muted)' }}
                    onClick={() => setType(it.id)}>
                    <div style={{ fontWeight: 850 }}>{it.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{it.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            {(type !== 'behavioral') && (
              <div style={s.card}>
                <div style={s.cardHeader}><span style={s.step}>03</span><div style={s.cardTitle}>Technical Focus</div></div>
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
                              <span style={{ fontSize: 20 }}>{t.icon}</span>
                              <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>{t.label}</span>
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
            {/* Difficulty */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>04</span><div style={s.cardTitle}>Simulation Difficulty</div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {DIFFICULTIES.map(d => (
                  <button key={d.id}
                    style={{ ...s.chipBtn, flex: 1, borderColor: difficulty === d.id ? d.color : 'var(--border)', background: difficulty === d.id ? `${d.color}15` : 'var(--surface)', color: difficulty === d.id ? d.color : 'var(--muted)' }}
                    onClick={() => setDifficulty(d.id)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>05</span><div style={s.cardTitle}>Interaction Mode</div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { id: 'text',  icon: '⌨️', title: 'Text' },
                  { id: 'voice', icon: '🎙️', title: 'Voice' },
                ].map(m => (
                  <button key={m.id}
                    style={{ ...s.modeBtn, flex: 1, borderColor: mode === m.id ? 'var(--primary)' : 'var(--border)', background: mode === m.id ? 'var(--primary-l)' : 'var(--surface)', color: mode === m.id ? 'var(--primary)' : 'var(--text2)' }}
                    onClick={() => setMode(m.id)}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{m.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>06</span><div style={s.cardTitle}>Intensity</div></div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {Q_OPTIONS.map(q => (
                  <button key={q}
                    style={{ ...s.chipBtn, flex: 1, borderColor: qTarget === q ? 'var(--primary)' : 'var(--border)', background: qTarget === q ? 'var(--primary-l)' : 'var(--surface)', color: qTarget === q ? 'var(--primary)' : 'var(--muted)' }}
                    onClick={() => setQTarget(q)}>
                    {q} Qs
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>Prep Budget: {studyTime}m/day</div>
              <input type="range" min="15" max="240" step="15" value={studyTime} onChange={e => setStudyTime(e.target.value)} style={{ width: '100%' }} />
            </div>

            <button style={{ ...s.startBtn, opacity: canStart ? 1 : 0.4 }} disabled={!canStart} onClick={handleLaunch}>
              Start {type.toUpperCase()} Simulation →
            </button>
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
  logoutBtn:    { padding: '6px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  content:      { maxWidth: 1300, margin: '0 auto', padding: '2rem 3rem' },
  hero:         { marginBottom: '3rem', textAlign: 'center' },
  heroTitle:    { fontSize: 40, fontWeight: 950, color: 'var(--text)', letterSpacing: '-0.03em' },
  heroSub:      { fontSize: 18, color: 'var(--muted)', marginTop: 8, fontWeight: 500 },
  grid:         { display: 'grid', gridTemplateColumns: '1fr 440px', gap: '3rem' },
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' },
  cardHeader:   { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  step:         { width: 32, height: 32, background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, fontFamily: 'JetBrains Mono,monospace' },
  cardTitle:    { fontSize: 18, fontWeight: 850, color: 'var(--text)' },
  levelGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  levelBtn:     { padding: '16px 10px', borderRadius: 12, border: '2px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  typeStack:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  trackBtn:     { padding: '16px', borderRadius: 14, border: '2px solid', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  groupsContainer: { display: 'flex', flexDirection: 'column', gap: 32 },
  groupName:    { fontSize: 12, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 },
  topicGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 },
  topicBtn:     { padding: '16px 10px', borderRadius: 14, border: '2px solid', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.2s' },
  modeBtn:      { padding: '24px 12px', borderRadius: 16, border: '2px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' },
  chipBtn:      { padding: '12px 18px', borderRadius: 12, border: '2px solid', cursor: 'pointer', fontSize: 14, fontWeight: 800, transition: 'all 0.2s' },
  startBtn:     { width: '100%', padding: '22px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 950, cursor: 'pointer', boxShadow: '0 12px 24px var(--primary-glow)' },
  input:        { width: '100%', padding: '14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 14, fontWeight: 600, outline: 'none' }
}
