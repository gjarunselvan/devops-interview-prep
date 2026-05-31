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
    name: 'Containerization',
    topics: [
      { id: 'kubernetes', label: 'Kubernetes', icon: '☸️' },
      { id: 'docker', label: 'Docker', icon: '🐳' },
      { id: 'helm', label: 'Helm', icon: '⛵' },
      { id: 'argocd', label: 'Argo CD', icon: '🤖' },
    ]
  },
  {
    name: 'Infrastructure',
    topics: [
      { id: 'terraform', label: 'Terraform', icon: '🏗️' },
      { id: 'ansible', label: 'Ansible', icon: '⚙️' },
      { id: 'linux', label: 'Linux', icon: '🐧' },
    ]
  },
  {
    name: 'CI/CD & Git',
    topics: [
      { id: 'cicd', label: 'CI/CD', icon: '🔄' },
      { id: 'jenkins', label: 'Jenkins', icon: '🏺' },
      { id: 'git', label: 'Git', icon: '🌿' },
    ]
  },
  {
    name: 'Observability',
    topics: [
      { id: 'monitoring', label: 'Monitoring', icon: '📊' },
      { id: 'prometheus', label: 'Prometheus', icon: '🔥' },
      { id: 'elk', label: 'ELK Stack', icon: '📋' },
      { id: 'security', label: 'DevSecOps', icon: '🔐' },
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
  const [customTopic, setCustomTopic] = useState('')
  const [mode,        setMode]        = useState('text')
  const [type,        setType]        = useState('technical')
  const [difficulty,  setDifficulty]  = useState('medium')
  const [qTarget,     setQTarget]     = useState(10)
  const [studyTime,   setStudyTime]   = useState(profile?.study_daily_mins || 60)
  const [customYears, setCustomYears] = useState('')
  const [customQ,     setCustomQ]     = useState('')
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    
    const recommended = profile?.metadata?.recommendedTopics || []
    const initialTopics = []
    TOPIC_GROUPS.forEach(g => g.topics.forEach(t => { if (recommended.includes(t.id)) initialTopics.push(t) }))
    if (initialTopics.length > 0) setTopics(initialTopics)
    
    if (profile?.metadata?.experienceLevel) {
      const foundLevel = LEVELS.find(l => l.label === profile.metadata.experienceLevel || l.tag === profile.metadata.experienceLevel)
      if (foundLevel) setLevel(foundLevel)
    }
    return () => window.removeEventListener('resize', handleResize)
  }, [profile])

  function toggleTopic(t) {
    if (t.id === 'custom_entry') return 
    setTopics(prev => prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t])
  }

  const topicList = topics.map(t => t.label).filter(Boolean).join(', ')
  const canStart  = (level || customYears) && (type === 'behavioral' || type === 'surprise' || topics.length > 0)

  const finalLevel = customYears ? { tag: `${customYears}y Exp`, label: `${customYears} Years`, color: '#2563eb' } : level
  const finalQ = customQ ? parseInt(customQ) : qTarget

  function handleLaunch() {
    if (!canStart) return
    onStart({ 
      level: finalLevel, 
      topics: (type === 'behavioral' || type === 'surprise') ? [] : topics, 
      topicList: type === 'surprise' ? 'Any Domain (Surprise Mode)' : (type === 'behavioral' ? 'Behavioral & Culture' : topicList), 
      mode, 
      sessionType: 'questions', 
      totalQ: finalQ, 
      studyTime, 
      interviewType: type,
      difficulty: type === 'surprise' ? 'hard' : difficulty
    })
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{ ...s.navBrand, cursor: 'pointer' }} onClick={onGoBack}>
          <div style={s.logo}>DI</div>
          {!isMobile && <span style={s.navTitle}>DevOps Setup</span>}
        </div>
        <div style={s.navRight}>
          <button style={s.navLinkBtn} onClick={onGoBack}>🏠 {isMobile ? '' : 'Dashboard'}</button>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={s.avatar}>{profile?.full_name?.[0]}</div>
          <button style={s.logoutBtn} onClick={onLogout}>{isMobile ? 'EXIT' : 'SIGN OUT'}</button>
        </div>
      </nav>

      <div style={s.container}>
        <div style={s.hero}>
          <h2 style={s.heroTitle}>Initialize <span style={{ color: 'var(--primary)' }}>Simulation</span></h2>
          <p style={s.heroSub}>Configure your technical path and difficulty.</p>
        </div>

        <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 440px' }}>
          
          {/* STEP BY STEP CONFIG */}
          <div style={s.mainCol}>
            
            {/* 01: Seniority */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>01</span><div style={s.cardTitle}>Seniority Level</div></div>
              <div style={{ ...s.gridRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
                {LEVELS.map(l => (
                  <button key={l.id}
                    style={{ ...s.toggleBtn, borderColor: level?.id === l.id ? l.color : 'var(--border)', background: level?.id === l.id ? `${l.color}15` : 'var(--surface)', color: level?.id === l.id ? l.color : 'var(--muted)' }}
                    onClick={() => { setLevel(l); setCustomYears(''); }}>
                    <div style={{ fontWeight: 800 }}>{l.label}</div>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', marginTop: 2 }}>{l.tag}</div>
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Or custom years (e.g. 45)..." style={s.input} value={customYears} onChange={e => { setCustomYears(e.target.value); setLevel(null); }} />
            </div>

            {/* 02: Track */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>02</span><div style={s.cardTitle}>Interview Track</div></div>
              <div style={{ ...s.gridRow, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                {[
                  { id: 'technical', label: 'Technical Mastery', desc: 'Architecture & Tools' },
                  { id: 'coding',    label: 'Coding & IaC',      desc: 'Manifests & Scripting' },
                  { id: 'behavioral', label: 'Leadership',       desc: 'Soft Skills & Culture' },
                  { id: 'surprise',   label: 'Surprise Me! ✨',  desc: 'Any topic, Hard Mode' }
                ].map(it => (
                  <button key={it.id} 
                    style={{ ...s.trackBtn, borderColor: type === it.id ? 'var(--primary)' : 'var(--border)', background: type === it.id ? 'var(--primary-l)' : 'var(--surface)', color: type === it.id ? 'var(--primary)' : 'var(--muted)' }}
                    onClick={() => setType(it.id)}>
                    <div style={{ fontWeight: 850, fontSize: 15 }}>{it.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{it.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 03: Tech Stack */}
            {(type !== 'behavioral' && type !== 'surprise') && (
              <div style={s.card}>
                <div style={s.cardHeader}><span style={s.step}>03</span><div style={s.cardTitle}>Technical Focus</div></div>
                {TOPIC_GROUPS.map(g => (
                  <div key={g.name} style={{ marginBottom: 20 }}>
                    <div style={s.groupName}>{g.name}</div>
                    <div style={{ ...s.gridRow, gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)' }}>
                      {g.topics.map(t => {
                        const sel = !!topics.find(x => x.id === t.id)
                        return (
                          <button key={t.id}
                            style={{ ...s.topicBtn, borderColor: sel ? 'var(--primary)' : 'var(--border)', background: sel ? 'var(--primary-l)' : 'var(--surface)', color: sel ? 'var(--primary)' : 'var(--muted)' }}
                            onClick={() => toggleTopic(t)}>
                            <span style={{ fontSize: 20 }}>{t.icon}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, marginTop: 4 }}>{t.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div style={s.groupName}>Custom Topic</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="text" placeholder="Add custom focus..." style={{ ...s.input, flex: 1, margin: 0 }} value={customTopic} onChange={e => setCustomTopic(e.target.value)} />
                  <button 
                    style={{ ...s.actionBtn, background: customTopic ? 'var(--primary)' : 'var(--surface)', color: customTopic ? '#fff' : 'var(--muted)' }}
                    onClick={() => {
                      if (!customTopic.trim()) return
                      setTopics([...topics, { id: Date.now().toString(), label: customTopic, icon: '✏️' }])
                      setCustomTopic('')
                    }}>ADD</button>
                </div>
              </div>
            )}
          </div>

          {/* SETTINGS SIDEBAR */}
          <div style={s.sideCol}>
            
            {/* 04: Difficulty */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>04</span><div style={s.cardTitle}>Difficulty</div></div>
              <div style={{ display: 'flex', gap: 10 }}>
                {DIFFICULTIES.map(d => (
                  <button key={d.id}
                    disabled={type === 'surprise'}
                    style={{ ...s.pillBtn, flex: 1, borderColor: (type === 'surprise' ? 'hard' : difficulty) === d.id ? d.color : 'var(--border)', background: (type === 'surprise' ? 'hard' : difficulty) === d.id ? `${d.color}15` : 'var(--surface)', color: (type === 'surprise' ? 'hard' : difficulty) === d.id ? d.color : 'var(--muted)', opacity: type === 'surprise' && d.id !== 'hard' ? 0.4 : 1 }}
                    onClick={() => setDifficulty(d.id)}>{d.label}</button>
                ))}
              </div>
            </div>

            {/* 05: Mode */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>05</span><div style={s.cardTitle}>Mode</div></div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ id: 'text',  icon: '⌨️', label: 'Interactive' }, { id: 'voice', icon: '🎙️', label: 'Voice' }].map(m => (
                  <button key={m.id}
                    style={{ ...s.modeBtn, flex: 1, borderColor: mode === m.id ? 'var(--primary)' : 'var(--border)', background: mode === m.id ? 'var(--primary-l)' : 'var(--surface)', color: mode === m.id ? 'var(--primary)' : 'var(--text)' }}
                    onClick={() => setMode(m.id)}>
                    <div style={{ fontSize: 24, marginBottom: 5 }}>{m.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 06: Intensity */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.step}>06</span><div style={s.cardTitle}>Intensity</div></div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {Q_OPTIONS.map(q => (
                  <button key={q}
                    style={{ ...s.pillBtn, flex: 1, minWidth: 60, borderColor: (customQ ? '' : qTarget) === q ? 'var(--primary)' : 'var(--border)', background: (customQ ? '' : qTarget) === q ? 'var(--primary-l)' : 'var(--surface)', color: (customQ ? '' : qTarget) === q ? 'var(--primary)' : 'var(--muted)' }}
                    onClick={() => { setQTarget(q); setCustomQ(''); }}>{q} Qs</button>
                ))}
              </div>
              <input type="number" placeholder="Custom quantity..." style={s.input} value={customQ} onChange={e => { setCustomQ(e.target.value); setQTarget(null); }} />
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted)', marginTop: 20, marginBottom: 10, textTransform: 'uppercase' }}>Preparation: {studyTime}m</div>
              <input type="range" min="15" max="240" step="15" value={studyTime} onChange={e => setStudyTime(e.target.value)} style={{ width: '100%' }} />
            </div>

            <button style={{ ...s.launchBtn, opacity: canStart ? 1 : 0.4 }} disabled={!canStart} onClick={handleLaunch}>
              INITIALIZE AI AGENT →
            </button>
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
  navLinkBtn:   { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', color: 'var(--text2)' },
  themeToggle:  { background: 'var(--surface2)', border: '1px solid var(--border)', width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  avatar:       { width: 34, height: 34, background: 'var(--primary-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 14 },
  logoutBtn:    { padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 800, color: 'var(--red)', cursor: 'pointer' },
  
  container:    { padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' },
  hero:         { marginBottom: '2.5rem', textAlign: 'center' },
  heroTitle:    { fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 950, color: 'var(--text)', letterSpacing: '-0.03em' },
  heroSub:      { fontSize: 16, color: 'var(--muted)', fontWeight: 500, marginTop: 8 },
  
  grid:         { display: 'grid', gap: '1.5rem' },
  mainCol:      { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sideCol:      { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  cardHeader:   { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  step:         { width: 32, height: 32, background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, fontFamily: 'JetBrains Mono,monospace' },
  cardTitle:    { fontSize: 16, fontWeight: 850, color: 'var(--text)' },
  
  gridRow:      { display: 'grid', gap: 10 },
  toggleBtn:    { padding: '14px 10px', borderRadius: 12, border: '2px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: 'var(--surface)' },
  trackBtn:     { padding: '16px', borderRadius: 14, border: '2px solid', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', background: 'var(--surface)' },
  topicBtn:     { padding: '12px 5px', borderRadius: 12, border: '2px solid', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface)' },
  modeBtn:      { padding: '20px 10px', borderRadius: 14, border: '2px solid', cursor: 'pointer', textAlign: 'center', background: 'var(--surface)' },
  pillBtn:      { padding: '12px', borderRadius: 10, border: '2px solid', cursor: 'pointer', fontSize: 14, fontWeight: 800, background: 'var(--surface)' },
  
  input:        { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface2)', fontSize: 14, fontWeight: 600, outline: 'none', color: 'var(--text)', marginTop: 15 },
  groupName:    { fontSize: 10, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  actionBtn:    { padding: '0 20px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, fontWeight: 900, cursor: 'pointer' },
  launchBtn:    { width: '100%', padding: '20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 950, boxShadow: '0 10px 24px var(--primary-glow)', cursor: 'pointer' }
}
