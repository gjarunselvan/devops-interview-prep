import { useState, useEffect, useRef } from 'react'

// ─── DATA ────────────────────────────────────────────────────────────────────

const LEVELS = [
  { id: '0-1', label: '0–1 yrs', tag: 'Fresher',            color: '#4ade80' },
  { id: '1-3', label: '1–3 yrs', tag: 'Junior',             color: '#60a5fa' },
  { id: '3-5', label: '3–5 yrs', tag: 'Mid Level',          color: '#fbbf24' },
  { id: '5-8', label: '5–8 yrs', tag: 'Senior',             color: '#f97316' },
  { id: '8+',  label: '8+ yrs',  tag: 'Principal/Architect',color: '#e879f9' },
]

const TOPICS = [
  { id: 'aws',       label: 'AWS',            icon: '☁️'  },
  { id: 'kubernetes',label: 'Kubernetes',     icon: '🐳'  },
  { id: 'docker',    label: 'Docker',         icon: '📦'  },
  { id: 'terraform', label: 'Terraform',      icon: '🏗️'  },
  { id: 'ansible',   label: 'Ansible',        icon: '⚙️'  },
  { id: 'cicd',      label: 'CI/CD',          icon: '🔄'  },
  { id: 'linux',     label: 'Linux',          icon: '🐧'  },
  { id: 'git',       label: 'Git',            icon: '🌿'  },
  { id: 'monitoring',label: 'Monitoring',     icon: '📊'  },
  { id: 'security',  label: 'DevSecOps',      icon: '🔐'  },
  { id: 'networking',label: 'Networking',     icon: '🌐'  },
  { id: 'gcp',       label: 'GCP',            icon: '🔵'  },
  { id: 'azure',     label: 'Azure',          icon: '🟦'  },
  { id: 'helm',      label: 'Helm',           icon: '⛵'  },
  { id: 'argocd',    label: 'Argo CD',        icon: '🤖'  },
  { id: 'jenkins',   label: 'Jenkins',        icon: '🏺'  },
  { id: 'prometheus',label: 'Prometheus',     icon: '🔥'  },
  { id: 'elk',       label: 'ELK Stack',      icon: '📋'  },
  { id: 'vault',     label: 'Vault',          icon: '🔑'  },
  { id: 'mlops',     label: 'MLOps',          icon: '🧠'  },
  { id: 'custom',    label: 'Custom Topic',   icon: '✏️'  },
]

const Q_OPTIONS   = [5, 10, 15, 20]
const TIME_OPTIONS = [15, 30, 45, 60]
const SCREENS = { SETUP: 'setup', INTERVIEW: 'interview', REPORT: 'report' }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function speak(text, onEnd) {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
  utt.pitch = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices[0]
  if (preferred) utt.voice = preferred
  utt.onend = onEnd || null
  window.speechSynthesis.speak(utt)
}

function stopSpeaking() { window.speechSynthesis.cancel() }

function scoreColor(s) {
  if (s >= 8) return '#00ff9d'
  if (s >= 6) return '#fbbf24'
  if (s >= 4) return '#f97316'
  return '#f87171'
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  // setup
  const [level,        setLevel]        = useState(null)
  const [topics,       setTopics]       = useState([])
  const [customTopic,  setCustomTopic]  = useState('')
  const [mode,         setMode]         = useState('text')      // 'text' | 'voice'
  const [sessionType,  setSessionType]  = useState('questions') // 'questions' | 'time'
  const [qTarget,      setQTarget]      = useState(10)
  const [timeTarget,   setTimeTarget]   = useState(30)
  const [customQ,      setCustomQ]      = useState('')

  // interview
  const [screen,       setScreen]       = useState(SCREENS.SETUP)
  const [question,     setQuestion]     = useState('')
  const [answer,       setAnswer]       = useState('')
  const [feedback,     setFeedback]     = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [qIndex,       setQIndex]       = useState(0)
  const [history,      setHistory]      = useState([])
  const [speaking,     setSpeaking]     = useState(false)
  const [listening,    setListening]    = useState(false)
  const [timeLeft,     setTimeLeft]     = useState(0)
  const [sessionDone,  setSessionDone]  = useState(false)

  const recognitionRef = useRef(null)
  const timerRef       = useRef(null)
  const totalQ = sessionType === 'questions' ? (parseInt(customQ) || qTarget) : 999

  // voices load async in some browsers
  useEffect(() => { window.speechSynthesis.getVoices() }, [])

  // timer
  useEffect(() => {
    if (screen === SCREENS.INTERVIEW && sessionType === 'time') {
      setTimeLeft(timeTarget * 60)
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); endSession(); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [screen])

  function topicList() {
    return topics.map(t => t.id === 'custom' ? customTopic : t.label).join(', ')
  }

  // ── API CALLS ──────────────────────────────────────────────────────────────

  async function fetchQuestion(hist) {
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'question',
        topics: topicList(),
        level: `${level.label} (${level.tag})`,
        history: hist.map(h => h.question).join(' | ') || 'none',
        count: hist.length + 1,
      })
    })
    const data = await res.json()
    return data.result
  }

  async function evaluateAnswer(q, a) {
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'evaluate',
        topics: topicList(),
        level: `${level.label} (${level.tag})`,
        question: q,
        answer: a,
      })
    })
    const data = await res.json()
    return data.result
  }

  // ── FLOW ───────────────────────────────────────────────────────────────────

  async function startInterview() {
    if (!level || topics.length === 0) return
    if (topics.find(t => t.id === 'custom') && !customTopic.trim()) return
    setLoading(true)
    setScreen(SCREENS.INTERVIEW)
    setHistory([])
    setQIndex(0)
    setFeedback(null)
    setAnswer('')
    setSessionDone(false)
    const q = await fetchQuestion([])
    setQuestion(q)
    setLoading(false)
    if (mode === 'voice') setTimeout(() => speakQuestion(q), 300)
  }

  function speakQuestion(q) {
    setSpeaking(true)
    speak(q, () => setSpeaking(false))
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    stopSpeaking()
    setLoading(true)
    const fb = await evaluateAnswer(question, answer)
    setFeedback(fb)
    const scoreMatch = fb.match(/(\d+)\s*\/\s*10/)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5
    const improveMatch = fb.match(/📈 POINTS TO IMPROVE\n([\s\S]*?)(?=\n[📌🔍💡]|$)/)
    const improvePoints = improveMatch
      ? improveMatch[1].trim().split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim())
      : []

    const entry = { question, answer, feedback: fb, score, improvePoints, topic: topics[Math.floor(Math.random() * topics.length)]?.label || topicList() }
    setHistory(prev => [...prev, entry])
    setLoading(false)

    if (mode === 'voice') {
      const short = `Score: ${score} out of 10. ${fb.split('\n').slice(0, 3).join(' ')}`
      speak(short)
    }
  }

  async function nextQuestion() {
    const newIndex = qIndex + 1
    if (sessionType === 'questions' && newIndex >= totalQ) { endSession(); return }
    setFeedback(null)
    setAnswer('')
    setLoading(true)
    setQIndex(newIndex)
    const q = await fetchQuestion(history)
    setQuestion(q)
    setLoading(false)
    if (mode === 'voice') setTimeout(() => speakQuestion(q), 300)
  }

  function endSession() {
    clearInterval(timerRef.current)
    stopSpeaking()
    setSessionDone(true)
    setScreen(SCREENS.REPORT)
  }

  // ── VOICE INPUT ────────────────────────────────────────────────────────────

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    stopSpeaking()
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = e => { setAnswer(e.results[0][0].transcript); setListening(false) }
    rec.onerror  = () => setListening(false)
    rec.onend    = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function toggleTopic(t) {
    setTopics(prev =>
      prev.find(x => x.id === t.id)
        ? prev.filter(x => x.id !== t.id)
        : [...prev, t]
    )
  }

  // ── REPORT ─────────────────────────────────────────────────────────────────

  const avgScore = history.length > 0
    ? Math.round((history.reduce((a, b) => a + b.score, 0) / history.length) * 10) / 10
    : 0

  const allImprove = [...new Set(history.flatMap(h => h.improvePoints))].filter(Boolean)

  function copyReport() {
    const text = history.map((h, i) =>
      `Q${i+1}: ${h.question}\nAnswer: ${h.answer}\nScore: ${h.score}/10\nFeedback: ${h.feedback}\n`
    ).join('\n---\n') + `\n\nPOINTS TO IMPROVE:\n${allImprove.map(p => `• ${p}`).join('\n')}`
    navigator.clipboard.writeText(text)
  }

  function restart() {
    setScreen(SCREENS.SETUP)
    setLevel(null); setTopics([]); setCustomTopic('')
    setMode('text'); setSessionType('questions'); setQTarget(10); setTimeTarget(30); setCustomQ('')
    setQuestion(''); setAnswer(''); setFeedback(null)
    setHistory([]); setQIndex(0); setSessionDone(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <div style={s.grid} />
      <div style={s.wrap}>

        {/* HEADER */}
        <header style={s.header}>
          <span style={s.badge}>$ devops --interview-prep v2.0</span>
          <h1 style={s.h1}>DevOps Interview <span style={s.green}>Prep</span></h1>
          <p style={s.sub}>AI-powered mock interviews · Text & Voice · Full session report</p>
        </header>

        {/* ── SETUP ── */}
        {screen === SCREENS.SETUP && (
          <div>

            {/* Experience */}
            <div style={s.card}>
              <div style={s.cardTitle}>01 // EXPERIENCE LEVEL</div>
              <div style={s.levelGrid}>
                {LEVELS.map(l => (
                  <button key={l.id} style={{ ...s.levelBtn, borderColor: level?.id === l.id ? l.color : 'var(--border)', background: level?.id === l.id ? `${l.color}18` : 'var(--surface2)', color: level?.id === l.id ? l.color : 'var(--muted)' }} onClick={() => setLevel(l)}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{l.label}</div>
                    <div style={{ fontSize: 10, marginTop: 3, fontFamily: 'JetBrains Mono,monospace' }}>{l.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topics */}
            <div style={s.card}>
              <div style={s.cardTitle}>02 // SELECT TOPICS <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(pick multiple)</span></div>
              <div style={s.topicGrid}>
                {TOPICS.map(t => {
                  const sel = !!topics.find(x => x.id === t.id)
                  return (
                    <button key={t.id} style={{ ...s.topicBtn, borderColor: sel ? 'var(--green)' : 'var(--border)', background: sel ? 'var(--green-dim)' : 'var(--surface2)', color: sel ? 'var(--green)' : 'var(--muted)' }} onClick={() => toggleTopic(t)}>
                      <span style={{ fontSize: 20 }}>{t.icon}</span>
                      <span style={{ fontSize: 11, marginTop: 4 }}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
              {topics.find(t => t.id === 'custom') && (
                <input style={{ ...s.input, marginTop: 12 }} placeholder="e.g. Cilium, Crossplane, FluxCD..." value={customTopic} onChange={e => setCustomTopic(e.target.value)} />
              )}
              {topics.length > 0 && (
                <div style={{ marginTop: 10, fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: 'var(--green)' }}>
                  Selected: {topicList()}
                </div>
              )}
            </div>

            {/* Mode */}
            <div style={s.card}>
              <div style={s.cardTitle}>03 // INTERVIEW MODE</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ id: 'text', icon: '⌨️', label: 'Text Mode', desc: 'Type your answers' }, { id: 'voice', icon: '🎙️', label: 'Voice Mode', desc: 'Speak your answers' }].map(m => (
                  <button key={m.id} style={{ ...s.modeBtn, flex: 1, borderColor: mode === m.id ? 'var(--blue)' : 'var(--border)', background: mode === m.id ? 'var(--blue-dim)' : 'var(--surface2)', color: mode === m.id ? 'var(--blue)' : 'var(--muted)' }} onClick={() => setMode(m.id)}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                    <div style={{ fontSize: 11, marginTop: 3, fontFamily: 'JetBrains Mono,monospace' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
              {mode === 'voice' && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#38bdf808', border: '1px solid #38bdf830', borderRadius: 8, fontSize: 12, color: 'var(--blue)', fontFamily: 'JetBrains Mono,monospace' }}>
                  ⚠️ Voice mode works best in Chrome or Edge
                </div>
              )}
            </div>

            {/* Session config */}
            <div style={s.card}>
              <div style={s.cardTitle}>04 // SESSION LENGTH</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {[{ id: 'questions', label: '# Questions' }, { id: 'time', label: '⏱ Time Limit' }].map(st => (
                  <button key={st.id} style={{ ...s.modeBtn, flex: 1, borderColor: sessionType === st.id ? 'var(--green)' : 'var(--border)', background: sessionType === st.id ? 'var(--green-dim)' : 'var(--surface2)', color: sessionType === st.id ? 'var(--green)' : 'var(--muted)', padding: '12px' }} onClick={() => setSessionType(st.id)}>
                    {st.label}
                  </button>
                ))}
              </div>

              {sessionType === 'questions' && (
                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Q_OPTIONS.map(q => (
                      <button key={q} style={{ ...s.chipBtn, borderColor: qTarget === q && !customQ ? 'var(--green)' : 'var(--border)', background: qTarget === q && !customQ ? 'var(--green-dim)' : 'var(--surface2)', color: qTarget === q && !customQ ? 'var(--green)' : 'var(--muted)' }} onClick={() => { setQTarget(q); setCustomQ('') }}>
                        {q} Questions
                      </button>
                    ))}
                  </div>
                  <input style={{ ...s.input, marginTop: 10 }} type="number" min="1" max="50" placeholder="Or enter custom number..." value={customQ} onChange={e => setCustomQ(e.target.value)} />
                </div>
              )}

              {sessionType === 'time' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TIME_OPTIONS.map(t => (
                    <button key={t} style={{ ...s.chipBtn, borderColor: timeTarget === t ? 'var(--green)' : 'var(--border)', background: timeTarget === t ? 'var(--green-dim)' : 'var(--surface2)', color: timeTarget === t ? 'var(--green)' : 'var(--muted)' }} onClick={() => setTimeTarget(t)}>
                      {t} min
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              style={{ ...s.runBtn, opacity: (!level || topics.length === 0 || (topics.find(t => t.id === 'custom') && !customTopic.trim())) ? 0.4 : 1 }}
              disabled={!level || topics.length === 0}
              onClick={startInterview}
            >
              🚀 Start Interview
            </button>
          </div>
        )}

        {/* ── INTERVIEW ── */}
        {screen === SCREENS.INTERVIEW && (
          <div>
            {/* Top bar */}
            <div style={s.topBar}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--green)' }}>
                {sessionType === 'questions' ? `Q ${qIndex + 1} / ${totalQ}` : `Q ${qIndex + 1}`}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--muted)' }}>
                {topicList()} · {level?.tag} · {mode === 'voice' ? '🎙️ Voice' : '⌨️ Text'}
              </div>
              {sessionType === 'time' && (
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, color: timeLeft < 60 ? 'var(--red)' : 'var(--yellow)', fontWeight: 700 }}>
                  ⏱ {fmtTime(timeLeft)}
                </div>
              )}
            </div>

            {sessionType === 'questions' && (
              <div style={s.progressTrack}>
                <div style={{ ...s.progressFill, width: `${((qIndex) / totalQ) * 100}%` }} />
              </div>
            )}

            {/* Question card */}
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={s.cardTitle}>// QUESTION {qIndex + 1}</div>
                {mode === 'voice' && question && (
                  <button style={s.iconBtn} onClick={() => speaking ? stopSpeaking() : speakQuestion(question)}>
                    {speaking ? '⏹ Stop' : '🔊 Listen'}
                  </button>
                )}
              </div>
              {loading && !question ? (
                <Dots label="generating question..." />
              ) : (
                <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text)' }}>{question}</p>
              )}
            </div>

            {/* Answer */}
            {!feedback && question && (
              <div style={s.card}>
                <div style={s.cardTitle}>// YOUR ANSWER</div>

                {mode === 'text' ? (
                  <textarea
                    style={{ ...s.input, minHeight: 140, resize: 'vertical' }}
                    placeholder="Type your answer here..."
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                  />
                ) : (
                  <div>
                    <div style={s.voiceArea}>
                      {answer ? (
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', textAlign: 'left', width: '100%' }}>{answer}</p>
                      ) : (
                        <p style={{ color: 'var(--muted)', fontSize: 14 }}>{listening ? '🎤 Listening...' : 'Press the mic to speak your answer'}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button
                        style={{ ...s.runBtn, flex: 1, background: listening ? 'var(--red)' : 'var(--blue)', color: '#fff' }}
                        onClick={listening ? stopListening : startListening}
                      >
                        {listening ? '⏹ Stop Recording' : '🎤 Start Speaking'}
                      </button>
                      {answer && (
                        <button style={{ ...s.iconBtn, padding: '0 16px' }} onClick={() => setAnswer('')}>Clear</button>
                      )}
                    </div>
                  </div>
                )}

                <button
                  style={{ ...s.runBtn, marginTop: 12, opacity: (!answer.trim() || loading) ? 0.4 : 1 }}
                  disabled={!answer.trim() || loading}
                  onClick={submitAnswer}
                >
                  {loading ? 'Evaluating...' : 'Submit Answer →'}
                </button>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div style={{ ...s.card, borderColor: '#1e3a2f' }}>
                <div style={s.cardTitle}>// FEEDBACK</div>
                <pre style={s.feedbackText}>{feedback}</pre>
                <button style={{ ...s.runBtn, marginTop: 16 }} onClick={nextQuestion}>
                  {sessionType === 'questions' && qIndex + 1 >= totalQ ? '📊 See Full Report →' : 'Next Question →'}
                </button>
                {sessionType === 'time' && (
                  <button style={{ ...s.runBtn, marginTop: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }} onClick={endSession}>
                    End Session Early
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── REPORT ── */}
        {screen === SCREENS.REPORT && (
          <div>
            {/* Score hero */}
            <div style={{ ...s.card, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>
                {avgScore >= 8 ? '🏆' : avgScore >= 6 ? '💪' : avgScore >= 4 ? '📚' : '🔄'}
              </div>
              <div style={{ fontSize: 52, fontWeight: 800, color: scoreColor(avgScore) }}>{avgScore}/10</div>
              <div style={{ fontSize: 15, color: 'var(--muted)', marginTop: 8 }}>
                {avgScore >= 8 ? 'Excellent! You\'re interview ready.' : avgScore >= 6 ? 'Good job! A bit more prep and you\'re set.' : avgScore >= 4 ? 'Keep studying — you\'re getting there.' : 'More practice needed. Don\'t give up!'}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                {topicList()} · {level?.tag} · {history.length} questions · {mode === 'voice' ? '🎙️ Voice' : '⌨️ Text'}
              </div>
              {/* Score bar */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                {history.map((h, i) => (
                  <div key={i} title={`Q${i+1}: ${h.score}/10`} style={{ width: 28, height: 28, borderRadius: 6, background: scoreColor(h.score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', fontFamily: 'JetBrains Mono,monospace' }}>
                    {h.score}
                  </div>
                ))}
              </div>
            </div>

            {/* Points to improve */}
            {allImprove.length > 0 && (
              <div style={{ ...s.card, borderColor: '#2d1f3a' }}>
                <div style={{ ...s.cardTitle, color: 'var(--purple)' }}>// 📈 POINTS TO IMPROVE</div>
                <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                  {allImprove.map((p, i) => (
                    <li key={i} style={{ padding: '8px 0', borderBottom: i < allImprove.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 14, color: 'var(--text)', display: 'flex', gap: 10 }}>
                      <span style={{ color: 'var(--purple)', fontWeight: 700 }}>→</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full Q&A breakdown */}
            <div style={s.card}>
              <div style={s.cardTitle}>// FULL SESSION BREAKDOWN</div>
              {history.map((h, i) => (
                <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--muted)' }}>Q{i+1} · {h.topic}</span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 700, color: scoreColor(h.score) }}>{h.score}/10</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{h.question}</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontStyle: 'italic' }}>"{h.answer}"</p>
                  <details>
                    <summary style={{ fontSize: 12, color: 'var(--green)', cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace' }}>▶ view feedback</summary>
                    <pre style={{ ...s.feedbackText, marginTop: 10, fontSize: 13, background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>{h.feedback}</pre>
                  </details>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button style={{ ...s.runBtn, flex: 1 }} onClick={restart}>🔁 New Session</button>
              <button style={{ ...s.runBtn, flex: 1, background: 'var(--surface2)', color: 'var(--green)', border: '1px solid var(--green)' }} onClick={copyReport}>📋 Copy Report</button>
            </div>
          </div>
        )}

        <footer style={s.footer}>built by gjarunselvan</footer>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        details summary::-webkit-details-marker { color: var(--green); }
        details[open] summary { margin-bottom: 4px; }
      `}</style>
    </div>
  )
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────

function Dots({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pulse 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s` }} />
      ))}
      <span style={{ color:'var(--muted)', fontSize:13, fontFamily:'JetBrains Mono,monospace' }}>{label}</span>
    </div>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const s = {
  page:      { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', padding:'3rem 1.5rem', position:'relative' },
  grid:      { position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(0,255,157,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,157,0.03) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none', zIndex:0 },
  wrap:      { position:'relative', zIndex:1, width:'100%', maxWidth:780 },
  header:    { marginBottom:'2.5rem', textAlign:'center' },
  badge:     { display:'inline-block', fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#00ff9d', border:'1px solid #00ff9d', padding:'3px 10px', borderRadius:2, marginBottom:'1rem', letterSpacing:'0.1em' },
  h1:        { fontSize:'clamp(1.8rem,5vw,3rem)', fontWeight:800, lineHeight:1.1, letterSpacing:'-0.03em', color:'#e2e8f0' },
  green:     { color:'#00ff9d' },
  sub:       { marginTop:'0.75rem', color:'#64748b', fontSize:14 },
  card:      { background:'#0f1724', border:'1px solid #1e2d40', borderRadius:12, padding:'1.5rem', marginBottom:'1.25rem' },
  cardTitle: { fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#00ff9d', letterSpacing:'0.1em', marginBottom:16, fontWeight:700 },
  levelGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 },
  levelBtn:  { padding:'14px 10px', borderRadius:8, border:'1px solid', cursor:'pointer', textAlign:'center', transition:'all 0.15s', background:'var(--surface2)' },
  topicGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))', gap:8 },
  topicBtn:  { padding:'12px 6px', borderRadius:8, border:'1px solid', cursor:'pointer', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', transition:'all 0.15s' },
  modeBtn:   { padding:'20px 16px', borderRadius:8, border:'1px solid', cursor:'pointer', textAlign:'center', transition:'all 0.15s' },
  chipBtn:   { padding:'8px 16px', borderRadius:6, border:'1px solid', cursor:'pointer', fontFamily:'JetBrains Mono,monospace', fontSize:12, transition:'all 0.15s' },
  input:     { width:'100%', background:'#080d18', border:'1px solid #1e2d40', borderRadius:8, color:'#e2e8f0', fontFamily:'JetBrains Mono,monospace', fontSize:14, padding:'14px 16px', outline:'none' },
  runBtn:    { width:'100%', padding:14, background:'#00ff9d', color:'#080d18', fontSize:15, fontWeight:700, border:'none', borderRadius:8, cursor:'pointer', letterSpacing:'0.03em' },
  iconBtn:   { padding:'8px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--muted)', fontSize:12, cursor:'pointer', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' },
  topBar:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 },
  progressTrack: { height:4, background:'#1e2d40', borderRadius:2, marginBottom:16 },
  progressFill:  { height:'100%', background:'#00ff9d', borderRadius:2, transition:'width 0.4s ease' },
  voiceArea: { minHeight:120, background:'#080d18', border:'1px solid #1e2d40', borderRadius:8, padding:16, display:'flex', alignItems:'center', justifyContent:'center' },
  feedbackText: { fontSize:14, lineHeight:1.8, color:'#e2e8f0', whiteSpace:'pre-wrap', fontFamily:'Syne,sans-serif' },
  footer:    { marginTop:'2rem', textAlign:'center', fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#64748b' },
}
