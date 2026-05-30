const LEVELS = [
  { id: '0-1', label: '0–1 years', tag: 'Fresher',             color: '#16a34a' },
  { id: '1-3', label: '1–3 years', tag: 'Junior',              color: '#2563eb' },
  { id: '3-5', label: '3–5 years', tag: 'Mid Level',           color: '#d97706' },
  { id: '5-8', label: '5–8 years', tag: 'Senior',              color: '#ea580c' },
  { id: '8+',  label: '8+ years',  tag: 'Principal/Architect', color: '#7c3aed' },
]

const TOPICS = [
  { id: 'aws',        label: 'AWS',           icon: '☁️'  },
  { id: 'kubernetes', label: 'Kubernetes',    icon: '🐳'  },
  { id: 'docker',     label: 'Docker',        icon: '📦'  },
  { id: 'terraform',  label: 'Terraform',     icon: '🏗️'  },
  { id: 'ansible',    label: 'Ansible',       icon: '⚙️'  },
  { id: 'cicd',       label: 'CI/CD',         icon: '🔄'  },
  { id: 'linux',      label: 'Linux',         icon: '🐧'  },
  { id: 'git',        label: 'Git',           icon: '🌿'  },
  { id: 'monitoring', label: 'Monitoring',    icon: '📊'  },
  { id: 'security',   label: 'DevSecOps',     icon: '🔐'  },
  { id: 'networking', label: 'Networking',    icon: '🌐'  },
  { id: 'gcp',        label: 'GCP',           icon: '🔵'  },
  { id: 'azure',      label: 'Azure',         icon: '🟦'  },
  { id: 'helm',       label: 'Helm',          icon: '⛵'  },
  { id: 'argocd',     label: 'Argo CD',       icon: '🤖'  },
  { id: 'jenkins',    label: 'Jenkins',       icon: '🏺'  },
  { id: 'prometheus', label: 'Prometheus',    icon: '🔥'  },
  { id: 'elk',        label: 'ELK Stack',     icon: '📋'  },
  { id: 'vault',      label: 'Vault',         icon: '🔑'  },
  { id: 'mlops',      label: 'MLOps',         icon: '🧠'  },
  { id: 'custom',     label: 'Custom Topic',  icon: '✏️'  },
]

const Q_OPTIONS   = [5, 10, 15, 20]
const TIME_OPTIONS = [15, 30, 45, 60]

export { LEVELS, TOPICS, Q_OPTIONS, TIME_OPTIONS }

export default function Setup({ profile, onStart, onLogout }) {
  const [level,       setLevel]       = window.React.useState(null)
  const [topics,      setTopics]      = window.React.useState([])
  const [customTopic, setCustomTopic] = window.React.useState('')
  const [mode,        setMode]        = window.React.useState('text')
  const [sessionType, setSessionType] = window.React.useState('questions')
  const [qTarget,     setQTarget]     = window.React.useState(10)
  const [timeTarget,  setTimeTarget]  = window.React.useState(30)
  const [customQ,     setCustomQ]     = window.React.useState('')

  function toggleTopic(t) {
    setTopics(prev => prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t])
  }

  const topicList = topics.map(t => t.id === 'custom' ? customTopic : t.label).filter(Boolean).join(', ')
  const totalQ    = sessionType === 'questions' ? (parseInt(customQ) || qTarget) : null
  const canStart  = level && topics.length > 0 && !(topics.find(t => t.id === 'custom') && !customTopic.trim())

  function handleStart() {
    if (!canStart) return
    onStart({ level, topics, topicList, mode, sessionType, totalQ, timeTarget })
  }

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>DevOps Interview</span>
        </div>
        <div style={s.navRight}>
          <div style={s.avatar}>{profile?.full_name?.[0] || 'U'}</div>
          <span style={s.navName}>{profile?.full_name}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Sign out</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={s.hero}>
          <h2 style={s.heroTitle}>Ready for your interview, <span style={{ color: 'var(--primary)' }}>{profile?.full_name?.split(' ')[0]}?</span></h2>
          <p style={s.heroSub}>Configure your session and let's get started.</p>
        </div>

        <div style={s.grid}>
          {/* Left column */}
          <div>
            {/* Level */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.step}>01</span>
                <div>
                  <div style={s.cardTitle}>Experience Level</div>
                  <div style={s.cardDesc}>Select your years of experience</div>
                </div>
              </div>
              <div style={s.levelGrid}>
                {LEVELS.map(l => (
                  <button key={l.id}
                    style={{ ...s.levelBtn, borderColor: level?.id === l.id ? l.color : 'var(--border)', background: level?.id === l.id ? `${l.color}12` : '#fff', color: level?.id === l.id ? l.color : 'var(--muted)' }}
                    onClick={() => setLevel(l)}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{l.label}</div>
                    <div style={{ fontSize: 10, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{l.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topics */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.step}>02</span>
                <div>
                  <div style={s.cardTitle}>Topics <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>(select multiple)</span></div>
                  <div style={s.cardDesc}>Choose one or more DevOps topics</div>
                </div>
              </div>
              <div style={s.topicGrid}>
                {TOPICS.map(t => {
                  const sel = !!topics.find(x => x.id === t.id)
                  return (
                    <button key={t.id}
                      style={{ ...s.topicBtn, borderColor: sel ? 'var(--primary)' : 'var(--border)', background: sel ? 'var(--primary-l)' : '#fff', color: sel ? 'var(--primary)' : 'var(--muted)' }}
                      onClick={() => toggleTopic(t)}>
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <span style={{ fontSize: 10, marginTop: 3, fontWeight: sel ? 600 : 400 }}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
              {topics.find(t => t.id === 'custom') && (
                <input style={{ ...s.input, marginTop: 12 }} placeholder="e.g. Cilium, Crossplane, FluxCD..." value={customTopic} onChange={e => setCustomTopic(e.target.value)} />
              )}
              {topicList && <div style={s.selectedTopics}>✓ {topicList}</div>}
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Mode */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.step}>03</span>
                <div>
                  <div style={s.cardTitle}>Interview Mode</div>
                  <div style={s.cardDesc}>How would you like to answer?</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { id: 'text',  icon: '⌨️', title: 'Text Mode',  desc: 'Type your answers' },
                  { id: 'voice', icon: '🎙️', title: 'Voice Mode', desc: 'Speak naturally' },
                ].map(m => (
                  <button key={m.id}
                    style={{ ...s.modeBtn, flex: 1, borderColor: mode === m.id ? 'var(--primary)' : 'var(--border)', background: mode === m.id ? 'var(--primary-l)' : '#fff', color: mode === m.id ? 'var(--primary)' : 'var(--text2)' }}
                    onClick={() => setMode(m.id)}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
              {mode === 'voice' && (
                <div style={s.voiceNote}>⚠️ Voice mode works best in Chrome or Edge</div>
              )}
            </div>

            {/* Session length */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.step}>04</span>
                <div>
                  <div style={s.cardTitle}>Session Length</div>
                  <div style={s.cardDesc}>Number of questions or time limit</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ id: 'questions', label: '# Questions' }, { id: 'time', label: '⏱ Time Limit' }].map(st => (
                  <button key={st.id}
                    style={{ ...s.chipBtn, flex: 1, borderColor: sessionType === st.id ? 'var(--primary)' : 'var(--border)', background: sessionType === st.id ? 'var(--primary-l)' : '#fff', color: sessionType === st.id ? 'var(--primary)' : 'var(--muted)', fontWeight: sessionType === st.id ? 600 : 400 }}
                    onClick={() => setSessionType(st.id)}>
                    {st.label}
                  </button>
                ))}
              </div>

              {sessionType === 'questions' && (
                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {Q_OPTIONS.map(q => (
                      <button key={q}
                        style={{ ...s.chipBtn, borderColor: qTarget === q && !customQ ? 'var(--primary)' : 'var(--border)', background: qTarget === q && !customQ ? 'var(--primary-l)' : '#fff', color: qTarget === q && !customQ ? 'var(--primary)' : 'var(--muted)' }}
                        onClick={() => { setQTarget(q); setCustomQ('') }}>
                        {q} Qs
                      </button>
                    ))}
                  </div>
                  <input style={s.input} type="number" min="1" max="50" placeholder="Custom number..." value={customQ} onChange={e => setCustomQ(e.target.value)} />
                </div>
              )}

              {sessionType === 'time' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TIME_OPTIONS.map(t => (
                    <button key={t}
                      style={{ ...s.chipBtn, borderColor: timeTarget === t ? 'var(--primary)' : 'var(--border)', background: timeTarget === t ? 'var(--primary-l)' : '#fff', color: timeTarget === t ? 'var(--primary)' : 'var(--muted)' }}
                      onClick={() => setTimeTarget(t)}>
                      {t} min
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button style={{ ...s.startBtn, opacity: canStart ? 1 : 0.4 }} disabled={!canStart} onClick={handleStart}>
              Start Interview →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:         { minHeight: '100vh', background: 'var(--bg)' },
  nav:          { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navBrand:     { display: 'flex', alignItems: 'center', gap: 10 },
  logo:         { width: 36, height: 36, background: 'var(--primary)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 },
  navTitle:     { fontWeight: 700, fontSize: 16, color: 'var(--text)' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 12 },
  avatar:       { width: 34, height: 34, background: 'var(--primary-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: 14 },
  navName:      { fontSize: 14, fontWeight: 500, color: 'var(--text2)' },
  logoutBtn:    { padding: '6px 14px', border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', color: 'var(--muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  content:      { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' },
  hero:         { marginBottom: '2rem' },
  heroTitle:    { fontSize: 26, fontWeight: 800, color: 'var(--text)' },
  heroSub:      { fontSize: 15, color: 'var(--muted)', marginTop: 4 },
  grid:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  card:         { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow)' },
  cardHeader:   { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  step:         { width: 28, height: 28, background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', flexShrink: 0, marginTop: 2 },
  cardTitle:    { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  cardDesc:     { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  levelGrid:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  levelBtn:     { padding: '12px 8px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', background: '#fff' },
  topicGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 },
  topicBtn:     { padding: '10px 4px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.15s' },
  selectedTopics: { marginTop: 12, fontSize: 12, color: 'var(--green)', fontWeight: 500, background: 'var(--green-l)', padding: '8px 12px', borderRadius: 7 },
  modeBtn:      { padding: '20px 16px', borderRadius: 10, border: '1.5px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' },
  voiceNote:    { marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' },
  chipBtn:      { padding: '9px 14px', borderRadius: 7, border: '1.5px solid', cursor: 'pointer', fontSize: 13, transition: 'all 0.15s', background: '#fff' },
  input:        { width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--text)', outline: 'none', background: '#fff' },
  startBtn:     { width: '100%', padding: '14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },
}
