import { useState } from 'react'

function scoreColor(score) {
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  if (score >= 4) return 'var(--yellow)'
  return 'var(--red)'
}

function scoreBg(score) {
  if (score >= 8) return 'var(--green-l)'
  if (score >= 6) return 'var(--yellow-l)'
  return 'var(--red-l)'
}

export default function Report({ history, config, profile, onRestart, onGoHome }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const { level, topicList, mode, sessionType, totalQ, timeTarget } = config
  const avgScore = history.length > 0
    ? Math.round((history.reduce((a, b) => a + b.score, 0) / history.length) * 10) / 10
    : 0

  const allImprove = [...new Set(history.flatMap(h => h.improvePoints || []))].filter(Boolean)

  function getVerdict() {
    if (avgScore >= 8) return { emoji: '🏆', text: 'Outstanding performance! You\'re interview ready.', color: 'var(--green)' }
    if (avgScore >= 7) return { emoji: '💪', text: 'Great job! Minor polish and you\'re set to go.', color: 'var(--green)' }
    if (avgScore >= 5) return { emoji: '📚', text: 'Good effort! Focus on the improvement areas below.', color: 'var(--yellow)' }
    return { emoji: '🔄', text: 'Keep practicing! Review the topics and try again.', color: 'var(--red)' }
  }

  const verdict = getVerdict()

  function copyReport() {
    const lines = [
      `DEVOPS INTERVIEW PREP — SESSION REPORT`,
      `Generated: ${new Date().toLocaleString()}`,
      `Candidate: ${profile.full_name} (@${profile.username})`,
      `Topics: ${topicList}`,
      `Level: ${level.tag}`,
      `Mode: ${mode}`,
      `Overall Score: ${avgScore}/10`,
      `Questions: ${history.length}`,
      ``,
      `─── QUESTIONS & ANSWERS ───`,
      ...history.map((h, i) => [
        ``,
        `Q${i+1} [${h.score}/10]: ${h.question}`,
        `Answer: ${h.answer}`,
        `Feedback:\n${h.feedback}`,
      ].join('\n')),
      ``,
      `─── POINTS TO IMPROVE ───`,
      ...allImprove.map(p => `• ${p}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <button style={s.outlineBtn} onClick={onGoHome}>← Dashboard</button>
          <button style={s.primaryBtn} onClick={onRestart}>New Session</button>
        </div>
      </nav>

      <div style={s.content}>
        {/* Hero score card */}
        <div style={s.heroCard}>
          <div style={s.heroLeft}>
            <div style={s.heroEmoji}>{verdict.emoji}</div>
            <div>
              <div style={s.heroScore} style2={{ color: verdict.color }}>{avgScore}<span style={{ fontSize: 20, color: 'var(--muted)', fontWeight: 400 }}>/10</span></div>
              <div style={s.heroVerdict}>{verdict.text}</div>
              <div style={s.heroMeta}>{topicList} · {level.tag} · {history.length} questions · {mode === 'voice' ? '🎙️ Voice' : '⌨️ Text'}</div>
            </div>
          </div>

          {/* Score tiles */}
          <div style={s.scoreTiles}>
            {history.map((h, i) => (
              <div key={i} title={`Q${i+1}: ${h.score}/10`}
                style={{ ...s.scoreTile, background: scoreBg(h.score), color: scoreColor(h.score) }}>
                <div style={{ fontSize: 10, fontWeight: 600 }}>Q{i+1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'JetBrains Mono,monospace' }}>{h.score}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.grid}>
          {/* Left: Q&A breakdown */}
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
                    <span style={s.expandIcon}>{expanded === i ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === i && (
                  <div style={s.qaBody}>
                    <div style={s.answerBox}>
                      <div style={s.boxLabel}>Your Answer</div>
                      <p style={s.answerText}>"{h.answer}"</p>
                    </div>
                    <div style={s.feedbackBox}>
                      <div style={s.boxLabel}>Feedback</div>
                      <pre style={s.feedbackText}>{h.feedback}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: improve + actions */}
          <div>
            {/* Points to improve */}
            {allImprove.length > 0 && (
              <div style={s.improveCard}>
                <div style={s.improveTitle}>📈 Points to Improve</div>
                <div style={s.improveList}>
                  {allImprove.map((p, i) => (
                    <div key={i} style={s.improveItem}>
                      <span style={s.arrow}>→</span>
                      <span style={s.improveText}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session info */}
            <div style={s.infoCard}>
              <div style={s.infoTitle}>Session Summary</div>
              {[
                ['Candidate',  profile.full_name],
                ['Topics',     topicList],
                ['Level',      level.tag],
                ['Mode',       mode === 'voice' ? '🎙️ Voice' : '⌨️ Text'],
                ['Questions',  history.length],
                ['Avg Score',  `${avgScore}/10`],
                ['Date',       new Date().toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} style={s.infoRow}>
                  <span style={s.infoKey}>{k}</span>
                  <span style={s.infoVal}>{v}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={s.actions}>
              <button style={s.copyBtn} onClick={copyReport}>
                {copied ? '✓ Copied!' : '📋 Copy Report'}
              </button>
              <button style={s.restartBtn} onClick={onRestart}>🔁 New Session</button>
              <button style={s.homeBtn} onClick={onGoHome}>🏠 Dashboard</button>
            </div>
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
  navRight:    { display: 'flex', gap: 10 },
  outlineBtn:  { padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  primaryBtn:  { padding: '7px 16px', border: 'none', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  content:     { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' },
  heroCard:    { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 },
  heroLeft:    { display: 'flex', alignItems: 'center', gap: 20 },
  heroEmoji:   { fontSize: 52 },
  heroScore:   { fontSize: 48, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
  heroVerdict: { fontSize: 15, color: 'var(--text2)', marginTop: 6, fontWeight: 500 },
  heroMeta:    { fontSize: 12, color: 'var(--muted)', marginTop: 4, fontFamily: 'JetBrains Mono,monospace' },
  scoreTiles:  { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  scoreTile:   { width: 44, height: 50, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontWeight: 700 },
  grid:        { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' },
  sectionTitle:{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 },
  qaCard:      { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' },
  qaHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem 1.25rem', cursor: 'pointer', gap: 12 },
  qaLeft:      { display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 },
  qNum:        { fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono,monospace', whiteSpace: 'nowrap', marginTop: 2 },
  qText:       { fontSize: 14, color: 'var(--text)', fontWeight: 500, lineHeight: 1.5 },
  qaRight:     { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  scoreTag:    { padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' },
  expandIcon:  { fontSize: 10, color: 'var(--muted)' },
  qaBody:      { borderTop: '1px solid var(--border)', padding: '1.25rem' },
  answerBox:   { background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 },
  boxLabel:    { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  answerText:  { fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, fontStyle: 'italic' },
  feedbackBox: { background: 'var(--green-l)', borderRadius: 8, padding: '12px 14px' },
  feedbackText:{ fontSize: 13, lineHeight: 1.85, color: 'var(--text2)', whiteSpace: 'pre-wrap', fontFamily: 'Inter,sans-serif' },
  improveCard: { background: '#fff', border: '1.5px solid #e9d5ff', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow)' },
  improveTitle:{ fontSize: 14, fontWeight: 700, color: 'var(--purple)', marginBottom: 14 },
  improveList: { display: 'flex', flexDirection: 'column', gap: 10 },
  improveItem: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  arrow:       { color: 'var(--purple)', fontWeight: 700, fontSize: 14, marginTop: 1 },
  improveText: { fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 },
  infoCard:    { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow)' },
  infoTitle:   { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoRow:     { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 },
  infoKey:     { color: 'var(--muted)' },
  infoVal:     { fontWeight: 500, color: 'var(--text2)', maxWidth: 160, textAlign: 'right', fontSize: 12 },
  actions:     { display: 'flex', flexDirection: 'column', gap: 10 },
  copyBtn:     { padding: '12px', border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  restartBtn:  { padding: '12px', border: 'none', borderRadius: 9, background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  homeBtn:     { padding: '12px', border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
