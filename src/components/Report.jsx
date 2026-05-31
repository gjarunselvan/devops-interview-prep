import { useState } from 'react'

function scoreColor(score) {
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

function scoreBg(score) {
  if (score >= 8) return 'var(--green-l)'
  if (score >= 6) return 'var(--yellow-l)'
  return 'var(--red-l)'
}

export default function Report({ history, config, profile, onRestart, onGoHome, theme, onPersonalize, bgColor }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const { level, topicList, mode, interviewType } = config
  const avgScore = history.length > 0
    ? Math.round((history.reduce((a, b) => a + b.score, 0) / history.length) * 10) / 10
    : 0

  const allImprove = [...new Set(history.flatMap(h => h.improvePoints || []))].filter(Boolean)

  function getVerdict() {
    if (avgScore >= 8) return { emoji: '🏆', text: 'Outstanding performance! You\'re interview ready.' }
    if (avgScore >= 6) return { emoji: '💪', text: 'Great job! Minor polish and you\'re set to go.' }
    return { emoji: '🔄', text: 'Keep practicing! Review the topics and try again.' }
  }

  const verdict = getVerdict()

  function copyReport() {
    const lines = [
      `DEVOPS INTERVIEW PREP — SESSION REPORT`,
      `Overall Score: ${avgScore}/10`,
      ...history.map((h, i) => `Q${i+1} [${h.score}/10]: ${h.question}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{ ...s.navBrand, cursor: 'pointer' }} onClick={onGoHome}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>DevOps Interview</span>
        </div>
        <div style={s.navRight}>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button style={s.outlineBtn} onClick={onGoHome}>Dashboard</button>
          <button style={s.primaryBtn} onClick={onRestart}>New Session</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={s.heroCard}>
          <div style={s.heroEmoji}>{verdict.emoji}</div>
          <div>
            <div style={s.heroScore}>{avgScore}<span style={{ fontSize: 20, color: 'var(--muted)' }}>/10</span></div>
            <div style={s.heroVerdict}>{verdict.text}</div>
            <div style={s.heroMeta}>{interviewType.toUpperCase()} · {level.tag} · {history.length} scenarios</div>
          </div>
        </div>

        <div style={s.grid}>
          <div>
            <div style={s.sectionTitle}>Session Breakdown</div>
            {history.map((h, i) => (
              <div key={i} style={s.qaCard}>
                <div style={s.qaHeader} onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div style={s.qaLeft}>
                    <span style={s.qNum}>Q{i + 1}</span>
                    <p style={s.qText}>{h.question}</p>
                  </div>
                  <div style={s.qaRight}>
                    <span style={{ ...s.scoreTag, background: scoreBg(h.score), color: scoreColor(h.score) }}>{h.score}/10</span>
                  </div>
                </div>
                {expanded === i && (
                  <div style={s.qaBody}>
                    <div style={s.box}><div style={s.boxLabel}>Your Response</div><p style={s.answerText}>"{h.answer}"</p></div>
                    <div style={s.box}><div style={s.boxLabel}>Feedback</div><pre style={s.feedbackText}>{h.feedback}</pre></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <div style={s.sideCard}>
              <div style={s.infoTitle}>Points to Improve</div>
              <div style={s.improveList}>
                {allImprove.map((p, i) => (
                  <div key={i} style={s.improveItem}>
                    <span style={{ color: 'var(--primary)', fontWeight: 900 }}>•</span>
                    <span style={{ fontSize: 13 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <button style={s.copyBtn} onClick={copyReport}>{copied ? '✓ Copied' : '📋 Copy Report'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:        { minHeight: '100vh', background: 'var(--bg)' },
  nav:         { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navBrand:    { display: 'flex', alignItems: 'center', gap: 10 },
  logo:        { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 },
  navTitle:    { fontWeight: 700, fontSize: 15 },
  navRight:    { display: 'flex', alignItems: 'center', gap: 10 },
  themeToggle: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4 },
  outlineBtn:  { padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  primaryBtn:  { padding: '7px 16px', border: 'none', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  content:     { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' },
  heroCard:    { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)', display: 'flex', gap: 24, alignItems: 'center' },
  heroEmoji:   { fontSize: 52 },
  heroScore:   { fontSize: 48, fontWeight: 800, color: 'var(--text)' },
  heroVerdict: { fontSize: 15, fontWeight: 500, marginTop: 4 },
  heroMeta:    { fontSize: 12, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase' },
  grid:        { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' },
  sectionTitle:{ fontSize: 16, fontWeight: 700, marginBottom: 14 },
  qaCard:      { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 10, overflow: 'hidden' },
  qaHeader:    { display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer', gap: 12 },
  qaLeft:      { display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 },
  qNum:        { fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 7px', borderRadius: 4 },
  qText:       { fontSize: 14, fontWeight: 500, lineHeight: 1.5 },
  qaRight:     { display: 'flex', alignItems: 'center' },
  scoreTag:    { padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700 },
  qaBody:      { borderTop: '1px solid var(--border)', padding: '1.25rem' },
  box:         { background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 },
  boxLabel:    { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 },
  answerText:  { fontSize: 13, fontStyle: 'italic' },
  feedbackText:{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit' },
  sideCard:    { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' },
  infoTitle:   { fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' },
  improveList: { display: 'flex', flexDirection: 'column', gap: 10 },
  improveItem: { display: 'flex', gap: 10 },
  copyBtn:     { width: '100%', padding: '12px', border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff', fontSize: 14, fontWeight: 600 },
}
