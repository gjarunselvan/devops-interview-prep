import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
          {!isMobile && <span style={s.navTitle}>DevOps Analytics</span>}
        </div>
        <div style={s.navRight}>
          <button style={s.navLinkBtn} onClick={onGoHome}>🏠 {isMobile ? '' : 'Dashboard'}</button>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button style={s.primaryBtn} onClick={onRestart}>{isMobile ? 'New' : 'New Session'}</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={{ ...s.heroCard, flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={s.heroEmoji}>{verdict.emoji}</div>
          <div>
            <div style={s.heroScore}>{avgScore}<span style={{ fontSize: 20, color: 'var(--muted)' }}>/10</span></div>
            <div style={s.heroVerdict}>{verdict.text}</div>
            <div style={s.heroMeta}>{interviewType.toUpperCase()} · {level.tag} · {history.length} scenarios</div>
          </div>
        </div>

        <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 340px' }}>
          <div>
            <div style={s.sectionTitle}>Session Breakdown</div>
            {history.map((h, i) => (
              <div key={i} style={s.qaCard}>
                <div style={s.qaHeader} onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div style={s.qaLeft}>
                    <span style={s.qNum}>Q{i + 1}</span>
                    <div className="markdown-body" style={s.qText}><ReactMarkdown>{h.question}</ReactMarkdown></div>
                  </div>
                  <div style={s.qaRight}>
                    <span style={{ ...s.scoreTag, background: scoreBg(h.score), color: scoreColor(h.score) }}>{h.score}/10</span>
                  </div>
                </div>
                {expanded === i && (
                  <div style={s.qaBody}>
                    <div style={s.box}><div style={s.boxLabel}>Your Response</div><p style={s.answerText}>"{h.answer}"</p></div>
                    <div style={s.box}><div style={s.boxLabel}>Feedback</div><div className="markdown-body" style={s.feedbackText}><ReactMarkdown>{h.feedback}</ReactMarkdown></div></div>
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
  page:        { minHeight: '100vh', background: 'var(--bg)', width: '100%' },
  nav:         { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navBrand:    { display: 'flex', alignItems: 'center', gap: 10 },
  logo:        { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 },
  navTitle:    { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:    { display: 'flex', alignItems: 'center', gap: 10 },
  navLinkBtn:  { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', color: 'var(--text2)' },
  themeToggle: { background: 'var(--surface2)', border: '1px solid var(--border)', width: 34, height: 34, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  outlineBtn:  { padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  primaryBtn:  { padding: '7px 16px', border: 'none', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  content:     { maxWidth: 1400, margin: '0 auto', padding: '1.5rem 1rem' },
  heroCard:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-md)', display: 'flex', gap: 20, alignItems: 'center' },
  heroEmoji:   { fontSize: 48 },
  heroScore:   { fontSize: 42, fontWeight: 900, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' },
  heroVerdict: { fontSize: 15, fontWeight: 700, color: 'var(--text2)' },
  heroMeta:    { fontSize: 11, color: 'var(--muted)', marginTop: 6, textTransform: 'uppercase', fontWeight: 800 },
  grid:        { display: 'grid', gap: '1.5rem', alignItems: 'start' },
  sectionTitle:{ fontSize: 13, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 },
  qaCard:      { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 10, overflow: 'hidden' },
  qaHeader:    { display: 'flex', justifyContent: 'space-between', padding: '1rem', cursor: 'pointer', gap: 12 },
  qaLeft:      { display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 },
  qNum:        { fontSize: 10, fontWeight: 900, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 8px', borderRadius: 4 },
  qText:       { flex: 1 },
  qaRight:     { display: 'flex', alignItems: 'center' },
  scoreTag:    { padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 900, fontFamily: 'JetBrains Mono,monospace' },
  qaBody:      { borderTop: '1px solid var(--border)', padding: '1rem', background: 'var(--surface2)' },
  box:         { background: 'var(--surface)', borderRadius: 12, padding: '1rem', marginBottom: 12, border: '1px solid var(--border)' },
  boxLabel:    { fontSize: 9, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 },
  answerText:  { fontSize: 13, fontStyle: 'italic', color: 'var(--text2)', lineHeight: 1.6 },
  feedbackText:{ fontSize: 13, color: 'var(--text)' },
  sideCard:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem', boxShadow: 'var(--shadow)' },
  infoTitle:   { fontSize: 10, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 },
  improveList: { display: 'flex', flexDirection: 'column', gap: 10 },
  improveItem: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  copyBtn:     { width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', fontSize: 13, fontWeight: 800, cursor: 'pointer', color: 'var(--text2)' },
}
