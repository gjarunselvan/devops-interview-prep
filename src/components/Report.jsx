import { useState } from 'react'

function scoreColor(score) {
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export default function Report({ history, config, profile, onRestart, onGoHome }) {
  const [expanded, setExpanded] = useState(null)

  const { level, topicList, mode } = config
  const avgScore = history.length > 0
    ? Math.round((history.reduce((a, b) => a + b.score, 0) / history.length) * 10) / 10
    : 0

  const allImprove = [...new Set(history.flatMap(h => h.improvePoints || []))].filter(Boolean)

  function getVerdict() {
    if (avgScore >= 8) return { emoji: '🏆', text: 'Interview Ready', sub: 'Outstanding performance across all topics.' }
    if (avgScore >= 6) return { emoji: '📈', text: 'On the Right Track', sub: 'Good foundation, focus on the missed points.' }
    return { emoji: '📚', text: 'Needs More Prep', sub: 'Review the fundamentals and try again.' }
  }

  const verdict = getVerdict()

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.container}>
          <div style={s.navContent}>
            <div style={s.logo}>DI</div>
            <div style={s.navActions}>
              <button style={s.homeBtn} onClick={onGoHome}>Dashboard</button>
              <button style={s.newBtn} onClick={onRestart}>New Session</button>
            </div>
          </div>
        </div>
      </nav>

      <main style={s.container}>
        <div style={s.hero}>
          <div style={s.scoreBox}>
            <div style={s.verdictEmoji}>{verdict.emoji}</div>
            <div style={s.scoreCircle}>
              <div style={{ ...s.scoreVal, color: scoreColor(avgScore) }}>{avgScore}</div>
              <div style={s.scoreMax}>/10</div>
            </div>
          </div>
          <div style={s.heroInfo}>
            <h1 style={s.verdictTitle}>{verdict.text}</h1>
            <p style={s.verdictSub}>{verdict.sub}</p>
            <div style={s.meta}>{topicList} · {level.tag} · {history.length} Questions</div>
          </div>
        </div>

        <div style={s.grid}>
          <div style={s.leftCol}>
            <h3 style={s.sectionTitle}>Detailed Breakdown</h3>
            {history.map((h, i) => (
              <div key={i} style={s.qaCard}>
                <div style={s.qaHeader} onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div style={s.qaTitle}>
                    <span style={s.qNum}>Q{i+1}</span>
                    <span style={s.qText}>{h.question}</span>
                  </div>
                  <div style={{ ...s.qScore, color: scoreColor(h.score) }}>{h.score}/10</div>
                </div>
                {expanded === i && (
                  <div style={s.qaBody}>
                    <div style={s.box}>
                      <div style={s.boxLabel}>Your Answer</div>
                      <div style={s.answerText}>"{h.answer}"</div>
                    </div>
                    <div style={s.box}>
                      <div style={s.boxLabel}>Alex's Feedback</div>
                      <pre style={s.feedbackText}>{h.feedback}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={s.rightCol}>
            <div style={s.improveCard}>
              <h3 style={s.improveTitle}>Points to Improve</h3>
              <div style={s.improveList}>
                {allImprove.map((p, i) => (
                  <div key={i} style={s.improveItem}>
                    <span style={s.bullet}>→</span>
                    <span>{p}</span>
                  </div>
                ))}
                {allImprove.length === 0 && <p style={s.empty}>Excellent work! No major gaps identified.</p>}
              </div>
            </div>
            
            <div style={s.card}>
              <h3 style={s.sideTitle}>Next Steps</h3>
              <p style={s.sideDesc}>We've updated your dashboard with these results and generated a fresh study roadmap.</p>
              <button style={s.fullHomeBtn} onClick={onGoHome}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' },
  nav: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0.75rem 0' },
  navContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { background: 'var(--primary)', color: '#fff', padding: '6px 10px', borderRadius: 8, fontWeight: 800 },
  navActions: { display: 'flex', gap: '1rem' },
  homeBtn: { background: 'none', border: '1px solid var(--border)', padding: '6px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600 },
  newBtn: { background: 'var(--primary)', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600 },
  hero: { padding: '3rem 0', display: 'flex', alignItems: 'center', gap: '3rem' },
  scoreBox: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  verdictEmoji: { fontSize: '4rem' },
  scoreCircle: { display: 'flex', alignItems: 'baseline' },
  scoreVal: { fontSize: '5rem', fontWeight: 900, fontFamily: 'JetBrains Mono' },
  scoreMax: { fontSize: '1.5rem', color: 'var(--muted)', fontWeight: 600 },
  heroInfo: { flex: 1 },
  verdictTitle: { fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' },
  verdictSub: { color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '1rem' },
  meta: { fontSize: 13, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-l)', display: 'inline-block', padding: '6px 12px', borderRadius: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', paddingBottom: '4rem' },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: '1.5rem' },
  qaCard: { background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1rem', overflow: 'hidden' },
  qaHeader: { padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: '1rem' },
  qaTitle: { display: 'flex', gap: '0.75rem', flex: 1 },
  qNum: { fontSize: 11, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 6px', borderRadius: 4, height: 'fit-content' },
  qText: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 },
  qScore: { fontWeight: 800, fontSize: 15, fontFamily: 'JetBrains Mono' },
  qaBody: { padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  box: { background: 'var(--surface-2)', padding: '1rem', borderRadius: 10 },
  boxLabel: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 },
  answerText: { fontSize: 14, fontStyle: 'italic', color: 'var(--text-2)' },
  feedbackText: { fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text)', fontFamily: 'inherit' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  improveCard: { background: 'var(--secondary-l)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1.5px solid var(--secondary)' },
  improveTitle: { fontSize: 16, fontWeight: 800, color: 'var(--secondary)', marginBottom: '1.25rem' },
  improveList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  improveItem: { display: 'flex', gap: '0.75rem', fontSize: 14, fontWeight: 500, lineHeight: 1.5 },
  bullet: { color: 'var(--secondary)', fontWeight: 800 },
  card: { background: '#fff', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' },
  sideTitle: { fontSize: 15, fontWeight: 700, marginBottom: '0.5rem' },
  sideDesc: { fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1.5rem' },
  fullHomeBtn: { width: '100%', padding: '12px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 },
  empty: { fontSize: 13, color: 'var(--muted)', textAlign: 'center' }
}
