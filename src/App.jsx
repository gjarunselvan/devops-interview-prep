import { useState } from 'react'

const LEVELS = [
  { id: '0-1', label: '0–1 years', tag: 'Fresher', color: '#4ade80' },
  { id: '1-3', label: '1–3 years', tag: 'Junior', color: '#60a5fa' },
  { id: '3-5', label: '3–5 years', tag: 'Mid Level', color: '#fbbf24' },
  { id: '5-8', label: '5–8 years', tag: 'Senior', color: '#f97316' },
  { id: '8+', label: '8+ years', tag: 'Principal / Architect', color: '#e879f9' },
]

const TOPICS = [
  { id: 'aws', label: 'AWS', icon: '☁️' },
  { id: 'kubernetes', label: 'Kubernetes', icon: '🐳' },
  { id: 'docker', label: 'Docker', icon: '📦' },
  { id: 'terraform', label: 'Terraform', icon: '🏗️' },
  { id: 'ansible', label: 'Ansible', icon: '⚙️' },
  { id: 'cicd', label: 'CI/CD', icon: '🔄' },
  { id: 'linux', label: 'Linux', icon: '🐧' },
  { id: 'git', label: 'Git', icon: '🌿' },
  { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  { id: 'security', label: 'DevSecOps', icon: '🔐' },
  { id: 'networking', label: 'Networking', icon: '🌐' },
  { id: 'gcp', label: 'GCP', icon: '🔵' },
  { id: 'azure', label: 'Azure', icon: '🟦' },
  { id: 'helm', label: 'Helm', icon: '⛵' },
  { id: 'argocd', label: 'Argo CD', icon: '🤖' },
  { id: 'jenkins', label: 'Jenkins', icon: '🏺' },
  { id: 'prometheus', label: 'Prometheus', icon: '🔥' },
  { id: 'elk', label: 'ELK Stack', icon: '📋' },
  { id: 'vault', label: 'HashiCorp Vault', icon: '🔑' },
  { id: 'mlops', label: 'MLOps', icon: '🧠' },
  { id: 'custom', label: 'Custom Topic', icon: '✏️' },
]

const SCREENS = { SETUP: 'setup', INTERVIEW: 'interview', RESULT: 'result' }

export default function App() {
  const [screen, setScreen] = useState(SCREENS.SETUP)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [customTopic, setCustomTopic] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [qCount, setQCount] = useState(0)
  const [scores, setScores] = useState([])
  const [history, setHistory] = useState([])

  const topic = selectedTopic?.id === 'custom' ? customTopic : selectedTopic?.label

  async function startInterview() {
    if (!selectedLevel || !selectedTopic) return
    if (selectedTopic.id === 'custom' && !customTopic.trim()) return
    setLoading(true)
    setScreen(SCREENS.INTERVIEW)
    setQCount(1)
    setScores([])
    setHistory([])
    setFeedback(null)
    setAnswer('')
    await fetchQuestion([], 1)
    setLoading(false)
  }

  async function fetchQuestion(hist, count) {
    const historyText = hist.length > 0
      ? `Previous questions asked: ${hist.map(h => h.q).join(' | ')}`
      : 'This is the first question.'

    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'question',
        topic,
        level: `${selectedLevel.label} (${selectedLevel.tag})`,
        history: historyText,
        count
      })
    })
    const data = await res.json()
    setQuestion(data.result)
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    setLoading(true)

    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'evaluate',
        topic,
        level: `${selectedLevel.label} (${selectedLevel.tag})`,
        question,
        answer
      })
    })
    const data = await res.json()
    setFeedback(data.result)

    const scoreMatch = data.result.match(/(\d+)\s*\/\s*10/)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5
    const newScores = [...scores, score]
    setScores(newScores)
    setHistory([...history, { q: question, a: answer, f: data.result, score }])
    setLoading(false)
  }

  async function nextQuestion() {
    if (qCount >= 5) {
      setScreen(SCREENS.RESULT)
      return
    }
    setLoading(true)
    setFeedback(null)
    setAnswer('')
    const newCount = qCount + 1
    setQCount(newCount)
    await fetchQuestion(history, newCount)
    setLoading(false)
  }

  function restart() {
    setScreen(SCREENS.SETUP)
    setSelectedLevel(null)
    setSelectedTopic(null)
    setCustomTopic('')
    setQuestion('')
    setAnswer('')
    setFeedback(null)
    setScores([])
    setHistory([])
    setQCount(0)
  }

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return (
    <div style={s.page}>
      <div style={s.grid} />
      <div style={s.wrap}>

        {/* HEADER */}
        <header style={s.header}>
          <span style={s.badge}>$ devops --interview-prep</span>
          <h1 style={s.h1}>DevOps Interview <span style={s.green}>Prep</span></h1>
          <p style={s.sub}>AI-powered mock interviews for DevOps engineers</p>
        </header>

        {/* SETUP SCREEN */}
        {screen === SCREENS.SETUP && (
          <div>
            {/* Experience Level */}
            <div style={s.card}>
              <div style={s.cardTitle}>// SELECT YOUR EXPERIENCE</div>
              <div style={s.levelGrid}>
                {LEVELS.map(l => (
                  <button
                    key={l.id}
                    style={{
                      ...s.levelBtn,
                      borderColor: selectedLevel?.id === l.id ? l.color : 'var(--border)',
                      background: selectedLevel?.id === l.id ? `${l.color}18` : 'var(--surface2)',
                      color: selectedLevel?.id === l.id ? l.color : 'var(--muted)',
                    }}
                    onClick={() => setSelectedLevel(l)}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{l.label}</div>
                    <div style={{ fontSize: 11, marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>{l.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div style={s.card}>
              <div style={s.cardTitle}>// SELECT TOPIC</div>
              <div style={s.topicGrid}>
                {TOPICS.map(t => (
                  <button
                    key={t.id}
                    style={{
                      ...s.topicBtn,
                      borderColor: selectedTopic?.id === t.id ? 'var(--green)' : 'var(--border)',
                      background: selectedTopic?.id === t.id ? 'var(--green-dim)' : 'var(--surface2)',
                      color: selectedTopic?.id === t.id ? 'var(--green)' : 'var(--muted)',
                    }}
                    onClick={() => setSelectedTopic(t)}
                  >
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span style={{ fontSize: 12, marginTop: 4 }}>{t.label}</span>
                  </button>
                ))}
              </div>

              {selectedTopic?.id === 'custom' && (
                <input
                  style={{ ...s.input, marginTop: 16 }}
                  placeholder="e.g. ArgoCD GitOps, Cilium, Crossplane..."
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                />
              )}
            </div>

            <button
              style={{
                ...s.runBtn,
                opacity: (!selectedLevel || !selectedTopic || (selectedTopic?.id === 'custom' && !customTopic.trim())) ? 0.4 : 1
              }}
              disabled={!selectedLevel || !selectedTopic || (selectedTopic?.id === 'custom' && !customTopic.trim())}
              onClick={startInterview}
            >
              Start Interview (5 Questions) →
            </button>
          </div>
        )}

        {/* INTERVIEW SCREEN */}
        {screen === SCREENS.INTERVIEW && (
          <div>
            {/* Progress */}
            <div style={s.progressBar}>
              <div style={s.progressMeta}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--green)' }}>
                  Question {qCount} / 5
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--muted)' }}>
                  {topic} · {selectedLevel?.tag}
                </span>
              </div>
              <div style={s.progressTrack}>
                <div style={{ ...s.progressFill, width: `${(qCount / 5) * 100}%` }} />
              </div>
            </div>

            {/* Question */}
            <div style={s.card}>
              <div style={s.cardTitle}>// QUESTION {qCount}</div>
              {loading && !question ? (
                <div style={s.loadingRow}>
                  {[0,1,2].map(i => <span key={i} style={{ ...s.dot, animationDelay: `${i*0.2}s` }} />)}
                  <span style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>generating question...</span>
                </div>
              ) : (
                <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>{question}</p>
              )}
            </div>

            {/* Answer */}
            {!feedback && question && (
              <div style={s.card}>
                <div style={s.cardTitle}>// YOUR ANSWER</div>
                <textarea
                  style={{ ...s.input, minHeight: 140, resize: 'vertical' }}
                  placeholder="Type your answer here..."
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                />
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
                <button
                  style={{ ...s.runBtn, marginTop: 16 }}
                  onClick={nextQuestion}
                >
                  {qCount >= 5 ? 'See Final Results →' : `Next Question (${qCount + 1}/5) →`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* RESULT SCREEN */}
        {screen === SCREENS.RESULT && (
          <div>
            <div style={{ ...s.card, textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {avgScore >= 8 ? '🏆' : avgScore >= 6 ? '💪' : avgScore >= 4 ? '📚' : '🔄'}
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: avgScore >= 7 ? 'var(--green)' : avgScore >= 5 ? 'var(--yellow)' : 'var(--red)' }}>
                {avgScore}/10
              </div>
              <div style={{ fontSize: 16, color: 'var(--muted)', marginTop: 8 }}>
                {avgScore >= 8 ? 'Excellent! You\'re interview ready.' : avgScore >= 6 ? 'Good job! A bit more prep and you\'re set.' : avgScore >= 4 ? 'Keep studying — you\'re getting there.' : 'More practice needed. Don\'t give up!'}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                {topic} · {selectedLevel?.tag}
              </div>
            </div>

            {/* Score breakdown */}
            <div style={s.card}>
              <div style={s.cardTitle}>// QUESTION BREAKDOWN</div>
              {history.map((h, i) => (
                <div key={i} style={s.historyItem}>
                  <div style={s.historyHeader}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--muted)' }}>Q{i + 1}</span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                      color: h.score >= 7 ? 'var(--green)' : h.score >= 5 ? 'var(--yellow)' : 'var(--red)'
                    }}>{h.score}/10</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>{h.q}</p>
                  <details>
                    <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>view feedback</summary>
                    <pre style={{ ...s.feedbackText, marginTop: 8, fontSize: 13 }}>{h.f}</pre>
                  </details>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ ...s.runBtn, flex: 1 }} onClick={restart}>
                Try Again →
              </button>
              <button
                style={{ ...s.runBtn, flex: 1, background: 'var(--surface2)', color: 'var(--green)', border: '1px solid var(--green)' }}
                onClick={() => { setScreen(SCREENS.SETUP); setSelectedTopic(null); }}
              >
                Change Topic →
              </button>
            </div>
          </div>
        )}

        <footer style={s.footer}>built by gjarunselvan</footer>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:0.2; transform:scale(0.8); }
          50% { opacity:1; transform:scale(1.2); }
        }
        details summary::-webkit-details-marker { color: var(--muted); }
      `}</style>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem', position: 'relative' },
  grid: { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,255,157,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,157,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },
  wrap: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 760 },
  header: { marginBottom: '2.5rem', textAlign: 'center' },
  badge: { display: 'inline-block', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#00ff9d', border: '1px solid #00ff9d', padding: '3px 10px', borderRadius: 2, marginBottom: '1rem', letterSpacing: '0.1em' },
  h1: { fontSize: 'clamp(1.8rem,5vw,3rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#e2e8f0' },
  green: { color: '#00ff9d' },
  sub: { marginTop: '0.75rem', color: '#64748b', fontSize: 15 },
  card: { background: '#0f1724', border: '1px solid #1e2d40', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' },
  cardTitle: { fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#00ff9d', letterSpacing: '0.1em', marginBottom: 16 },
  levelGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 },
  levelBtn: { padding: '14px 10px', borderRadius: 8, border: '1px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' },
  topicGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8 },
  topicBtn: { padding: '12px 8px', borderRadius: 8, border: '1px solid', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.15s' },
  input: { width: '100%', background: '#080d18', border: '1px solid #1e2d40', borderRadius: 8, color: '#e2e8f0', fontFamily: 'JetBrains Mono,monospace', fontSize: 14, padding: '14px 16px', outline: 'none' },
  runBtn: { width: '100%', padding: 14, background: '#00ff9d', color: '#080d18', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', letterSpacing: '0.03em' },
  progressBar: { marginBottom: '1.25rem' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  progressTrack: { height: 4, background: '#1e2d40', borderRadius: 2 },
  progressFill: { height: '100%', background: '#00ff9d', borderRadius: 2, transition: 'width 0.4s ease' },
  loadingRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' },
  dot: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00ff9d', animation: 'pulse 1.2s ease-in-out infinite' },
  feedbackText: { fontSize: 14, lineHeight: 1.8, color: '#e2e8f0', whiteSpace: 'pre-wrap', fontFamily: 'Syne,sans-serif' },
  historyItem: { borderBottom: '1px solid #1e2d40', paddingBottom: 16, marginBottom: 16 },
  historyHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  footer: { marginTop: '2rem', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#64748b' },
}
