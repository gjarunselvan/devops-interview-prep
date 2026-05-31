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
    if (avgScore >= 8) return { emoji: '🏆', text: 'Outstanding! You\'re interview ready.' }
    if (avgScore >= 6) return { emoji: '💪', text: 'Great job! Minor polish needed.' }
    return { emoji: '🔄', text: 'Keep practicing! Review the gaps.' }
  }

  const verdict = getVerdict()

  function copyReport() {
    const lines = [
      `DEVOPS REPORT — Score: ${avgScore}/10`,
      ...history.map((h, i) => `Q${i+1} [${h.score}/10]`),
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
          <button style={s.navLinkBtn} onClick={onGoHome}>🏠 Dashboard</button>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button style={s.primaryBtn} onClick={onRestart}>{isMobile ? 'NEW' : 'NEW SESSION'}</button>
        </div>
      </nav>

      <div style={s.container}>
        <div style={{ ...s.heroCard, flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={s.heroEmoji}>{verdict.emoji}</div>
          <div>
            <div style={s.heroScore}>{avgScore}<span style={{ fontSize: 18, color: 'var(--muted)' }}>/10</span></div>
            <div style={s.heroVerdict}>{verdict.text}</div>
            <div style={s.heroMeta}>{interviewType.toUpperCase()} · {level.tag}</div>
          </div>
        </div>

        <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 340px' }}>
          <div style={s.mainCol}>
            <div style={s.sectionTitle}>Breakdown</div>
            {history.map((h, i) => (
              <div key={i} style={s.card}>
                <div style={s.qaHeader} onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div style={s.qaLeft}>
                    <span style={s.qNum}>Q{i + 1}</span>
                    <div className="markdown-body" style={s.qText}><ReactMarkdown>{h.question}</ReactMarkdown></div>
                  </div>
                  <span style={{ ...s.scoreTag, background: scoreBg(h.score), color: scoreColor(h.score) }}>{h.score}/10</span>
                </div>
                {expanded === i && (
                  <div style={s.qaBody}>
                    <div style={s.box}><div style={s.boxLabel}>Your Response</div><p style={s.answerText}>"{h.answer}"</p></div>
                    <div style={s.box}><div style={s.boxLabel}>Alex's Feedback</div><div className="markdown-body" style={s.feedbackText}><ReactMarkdown>{h.feedback}</ReactMarkdown></div></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={s.sideCol}>
            <div style={s.card}>
              <div style={s.infoTitle}>Priority Improvements</div>
              <div style={s.improveList}>
                {allImprove.map((p, i) => (
                  <div key={i} style={s.improveItem}>
                    <span style={{ color: 'var(--primary)', fontWeight: 900 }}>•</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{p}</span>
                  </div>
                ))}
                {allImprove.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>No major gaps identified!</p>}
              </div>
            </div>
            <button style={s.copyBtn} onClick={copyReport}>{copied ? '✓ COPIED' : '📋 COPY REPORT'}</button>
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
  primaryBtn:   { padding: '7px 16px', border: 'none', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' },
  
  container:    { padding: '1.5rem 1rem', maxWidth: 1400, margin: '0 auto' },
  heroCard:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)', display: 'flex', gap: 24, alignItems: 'center' },
  heroEmoji:    { fontSize: 52 },
  heroScore:    { fontSize: 44, fontWeight: 900, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' },
  heroVerdict:  { fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginTop: 4 },
  heroMeta:     { fontSize: 11, color: 'var(--muted)', marginTop: 8, textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' },
  
  grid:         { display: 'grid', gap: '1.5rem', alignItems: 'start' },
  mainCol:      { display: 'flex', flexDirection: 'column' },
  sideCol:      { display: 'flex', flexDirection: 'column' },
  
  sectionTitle: { fontSize: 10, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 15 },
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem', boxShadow: 'var(--shadow)' },
  qaHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: 15 },
  qaLeft:       { display: 'flex', gap: 12, flex: 1 },
  qNum:         { fontSize: 10, fontWeight: 900, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 8px', borderRadius: 5, height: 20 },
  qText:        { fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 },
  scoreTag:     { padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 900, fontFamily: 'JetBrains Mono' },
  
  qaBody:       { marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' },
  box:          { background: 'var(--surface2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: '1px solid var(--border)' },
  boxLabel:     { fontSize: 9, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 },
  answerText:   { fontSize: 14, fontStyle: 'italic', color: 'var(--text2)', lineHeight: 1.6 },
  feedbackText: { fontSize: 14, color: 'var(--text)', lineHeight: 1.7 },
  
  infoTitle:    { fontSize: 10, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 15 },
  improveList:  { display: 'flex', flexDirection: 'column', gap: 12 },
  improveItem:  { display: 'flex', gap: 10, alignItems: 'flex-start' },
  copyBtn:      { width: '100%', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, fontWeight: 900, color: 'var(--text2)', cursor: 'pointer' }
}
