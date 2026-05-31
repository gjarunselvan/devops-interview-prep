import { useState, useEffect } from 'react'

const LEVELS = [
  { id: '0-1', label: '0–1 years', tag: 'Fresher',             color: '#10b981' },
  { id: '1-3', label: '1–3 years', tag: 'Junior',              color: '#2563eb' },
  { id: '3-5', label: '3–5 years', tag: 'Mid Level',           color: '#f59e0b' },
  { id: '5-8', label: '5–8 years', tag: 'Senior',              color: '#ef4444' },
  { id: '8+',  label: '8+ years',  tag: 'Architect',           color: '#7c3aed' },
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
    name: 'Containers & Orchestration',
    topics: [
      { id: 'kubernetes', label: 'Kubernetes', icon: '☸️' },
      { id: 'docker', label: 'Docker', icon: '🐳' },
      { id: 'helm', label: 'Helm', icon: '⛵' },
      { id: 'argocd', label: 'Argo CD', icon: '🤖' },
    ]
  },
  {
    name: 'Infrastructure & Config',
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
const TIME_OPTIONS = [15, 30, 45, 60]

export default function Setup({ profile, onStart, onLogout, onGoBack }) {
  const [level,       setLevel]       = useState(null)
  const [topics,      setTopics]      = useState([])
  const [mode,        setMode]        = useState('text')
  const [type,        setType]        = useState('technical') // technical or behavioral
  const [sessionType, setSessionType] = useState('questions')
  const [qTarget,     setQTarget]     = useState(10)
  const [timeTarget,  setTimeTarget]  = useState(30)
  const [studyTime,   setStudyTime]   = useState(profile?.study_daily_mins || 60)
  const [customQ,     setCustomQ]     = useState('')
  const [customT,     setCustomT]     = useState('')

  // Pre-fill topics from profile recommendations
  useEffect(() => {
    const recommended = profile?.metadata?.recommendedTopics || []
    const initialTopics = []
    TOPIC_GROUPS.forEach(group => {
      group.topics.forEach(t => {
        if (recommended.includes(t.id)) {
          initialTopics.push(t)
        }
      })
    })
    if (initialTopics.length > 0) setTopics(initialTopics)
    
    // Also pre-fill level if available
    if (profile?.experience_level) {
      const foundLevel = LEVELS.find(l => l.tag === profile.experience_level || l.id === profile.experience_level)
      if (foundLevel) setLevel(foundLevel)
    }
  }, [profile])

  function toggleTopic(t) {
    setTopics(prev => prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t])
  }

  const topicList = topics.map(t => t.label).join(', ')
  const finalQ    = sessionType === 'questions' ? (parseInt(customQ) || qTarget) : null
  const finalT    = sessionType === 'time' ? (parseInt(customT) || timeTarget) : null
  const canStart  = level && (type === 'behavioral' || topics.length > 0)

  function handleStart() {
    if (!canStart) return
    onStart({ level, topics: type === 'behavioral' ? [] : topics, topicList: type === 'behavioral' ? 'Behavioral & Culture' : topicList, mode, sessionType, totalQ: finalQ, timeTarget: finalT, studyTime, interviewType: type })
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.container}>
          <div style={s.navContent}>
            <div style={s.navLeft}>
              <button style={s.backBtn} onClick={onGoBack}>← Dashboard</button>
              <span style={s.navTitle}>Interview Setup</span>
            </div>
            <div style={s.navRight}>
              <span style={s.navName}>{profile.full_name}</span>
              <button style={s.logoutBtn} onClick={onLogout}>Sign out</button>
            </div>
          </div>
        </div>
      </nav>

      <main style={s.container}>
        <div style={s.hero}>
          <h2 style={s.heroTitle}>Customize your <span style={s.accent}>Session</span></h2>
          <p style={s.heroSub}>Choose your target tech stack and experience level.</p>
        </div>

        <div style={s.grid}>
          {/* Main Config */}
          <div style={s.mainCol}>
            {/* Interview Type */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>0. Interview Focus</h3>
              <div style={s.typeGrid}>
                {[
                  { id: 'technical', icon: '💻', title: 'Technical Screen', desc: 'Focus on tools, syntax, and architecture' },
                  { id: 'behavioral', icon: '🤝', title: 'Behavioral & Culture', desc: 'Focus on SRE principles, STAR method, and leadership' }
                ].map(it => (
                  <button key={it.id}
                    style={{ 
                      ...s.typeBtn, 
                      borderColor: type === it.id ? 'var(--primary)' : 'var(--border)', 
                      background: type === it.id ? 'var(--primary-l)' : 'var(--surface)',
                      color: type === it.id ? 'var(--primary)' : 'var(--text)'
                    }}
                    onClick={() => setType(it.id)}>
                    <span style={{ fontSize: 24, marginBottom: 8 }}>{it.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{it.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{it.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>1. Experience Level</h3>
              <div style={s.levelGrid}>
                {LEVELS.map(l => (
                  <button key={l.id}
                    style={{ 
                      ...s.levelBtn, 
                      borderColor: level?.id === l.id ? l.color : 'var(--border)', 
                      background: level?.id === l.id ? `${l.color}10` : 'var(--surface)', 
                      color: level?.id === l.id ? l.color : 'var(--text-2)' 
                    }}
                    onClick={() => setLevel(l)}>
                    <div style={s.levelLabel}>{l.label}</div>
                    <div style={s.levelTag}>{l.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tech Stack Topics */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>2. Target Tech Stack</h3>
              <div style={s.groupsStack}>
                {TOPIC_GROUPS.map(group => (
                  <div key={group.name} style={s.group}>
                    <h4 style={s.groupName}>{group.name}</h4>
                    <div style={s.topicGrid}>
                      {group.topics.map(t => {
                        const sel = !!topics.find(x => x.id === t.id)
                        return (
                          <button key={t.id}
                            style={{ 
                              ...s.topicBtn, 
                              borderColor: sel ? 'var(--primary)' : 'var(--border)', 
                              background: sel ? 'var(--primary-l)' : 'var(--surface)', 
                              color: sel ? 'var(--primary)' : 'var(--text-2)' 
                            }}
                            onClick={() => toggleTopic(t)}>
                            <span style={s.topicIcon}>{t.icon}</span>
                            <span style={s.topicLabel}>{t.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preferences Sidebar */}
          <div style={s.sideCol}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>3. Interview Mode</h3>
              <div style={s.modeGrid}>
                {[
                  { id: 'text', icon: '⌨️', title: 'Text' },
                  { id: 'voice', icon: '🎙️', title: 'Voice' }
                ].map(m => (
                  <button key={m.id}
                    style={{ 
                      ...s.modeBtn, 
                      borderColor: mode === m.id ? 'var(--primary)' : 'var(--border)', 
                      background: mode === m.id ? 'var(--primary-l)' : 'var(--surface)' 
                    }}
                    onClick={() => setMode(m.id)}>
                    <span style={s.modeIcon}>{m.icon}</span>
                    <span style={s.modeTitle}>{m.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <h3 style={s.cardTitle}>4. Session Length</h3>
              <div style={s.typeTabs}>
                <button 
                  style={{ ...s.tab, borderBottom: sessionType === 'questions' ? '2px solid var(--primary)' : 'none', color: sessionType === 'questions' ? 'var(--primary)' : 'var(--muted)' }}
                  onClick={() => setSessionType('questions')}>Questions</button>
                <button 
                  style={{ ...s.tab, borderBottom: sessionType === 'time' ? '2px solid var(--primary)' : 'none', color: sessionType === 'time' ? 'var(--primary)' : 'var(--muted)' }}
                  onClick={() => setSessionType('time')}>Time Limit</button>
              </div>
              
              <div style={s.optionGrid}>
                {(sessionType === 'questions' ? Q_OPTIONS : TIME_OPTIONS).map(val => (
                  <button key={val}
                    style={{ 
                      ...s.optionBtn, 
                      borderColor: (sessionType === 'questions' ? (customQ ? '' : qTarget) : (customT ? '' : timeTarget)) === val ? 'var(--primary)' : 'var(--border)',
                      background: (sessionType === 'questions' ? (customQ ? '' : qTarget) : (customT ? '' : timeTarget)) === val ? 'var(--primary-l)' : 'var(--surface)'
                    }}
                    onClick={() => {
                      if (sessionType === 'questions') { setQTarget(val); setCustomQ('') }
                      else { setTimeTarget(val); setCustomT('') }
                    }}>
                    {val}{sessionType === 'questions' ? ' Qs' : ' min'}
                  </button>
                ))}
              </div>
              <input 
                style={s.customInput} 
                type="number" 
                placeholder={`Custom ${sessionType === 'questions' ? 'questions' : 'minutes'}...`}
                value={sessionType === 'questions' ? customQ : customT}
                onChange={e => sessionType === 'questions' ? setCustomQ(e.target.value) : setCustomT(e.target.value)}
              />
            </div>

            <div style={s.card}>
              <h3 style={s.cardTitle}>5. Daily Commitment</h3>
              <p style={s.cardSub}>Minutes per day for your study roadmap</p>
              <div style={s.timeInputRow}>
                <input type="range" min="15" max="240" step="15" value={studyTime} onChange={e => setStudyTime(e.target.value)} style={s.range} />
                <span style={s.timeVal}>{studyTime}m/day</span>
              </div>
            </div>

            <button style={{ ...s.startBtn, opacity: canStart ? 1 : 0.5 }} disabled={!canStart} onClick={handleStart}>
              Begin Interview
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  container: { maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' },
  nav: { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 0', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  backBtn: { background: 'none', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text)' },
  navTitle: { fontWeight: 700, fontSize: 16, color: 'var(--text)' },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  navName: { fontSize: 14, fontWeight: 500, color: 'var(--text-2)' },
  logoutBtn: { background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' },
  hero: { padding: '3rem 0 2rem' },
  heroTitle: { fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)' },
  accent: { color: 'var(--primary)' },
  heroSub: { color: 'var(--muted)', fontSize: '1.1rem', marginTop: '0.5rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' },
  mainCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card: { background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' },
  cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text)' },
  levelGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' },
  levelBtn: { padding: '1rem 0.5rem', borderRadius: 12, border: '2px solid', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  levelLabel: { fontWeight: 700, fontSize: 14 },
  levelTag: { fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  groupsStack: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  groupName: { fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: '0.75rem', textTransform: 'uppercase' },
  topicGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' },
  topicBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', borderRadius: 12, border: '2px solid', transition: 'all 0.2s' },
  topicIcon: { fontSize: '1.5rem', marginBottom: 6 },
  topicLabel: { fontSize: 11, fontWeight: 600 },
  modeGrid: { display: 'flex', gap: '0.75rem' },
  modeBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem', borderRadius: 10, border: '2px solid', color: 'var(--text)' },
  modeTitle: { fontWeight: 600, fontSize: 14 },
  typeTabs: { display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' },
  tab: { padding: '8px 0', background: 'none', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  optionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  optionBtn: { padding: '8px', borderRadius: 8, border: '1px solid', fontWeight: 500, fontSize: 13, color: 'var(--text)' },
  customInput: { width: '100%', marginTop: '0.75rem', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', outline: 'none' },
  cardSub: { fontSize: 12, color: 'var(--muted)', marginBottom: '1rem' },
  timeInputRow: { display: 'flex', alignItems: 'center', gap: '1rem' },
  range: { flex: 1 },
  timeVal: { fontWeight: 700, fontSize: 14, minWidth: 60, color: 'var(--text)' },
  startBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '1rem', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--shadow-lg)' }
}
