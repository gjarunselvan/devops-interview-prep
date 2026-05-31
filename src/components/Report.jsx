import { useState } from 'react'

function scoreColor(score) {
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export default function Report({ history, config, profile, onRestart, onGoHome }) {
  const [expanded, setExpanded] = useState(null)
  const { level, topicList, interviewType } = config

  const avgScore = history.length > 0
    ? Math.round((history.reduce((a, b) => a + b.score, 0) / history.length) * 10) / 10
    : 0

  const allImprove = [...new Set(history.flatMap(h => h.improvePoints || []))].filter(Boolean)

  function getVerdict() {
    if (avgScore >= 8) return { emoji: '🏆', text: 'Production Ready', sub: 'Technical proficiency exceeds market standards.' }
    if (avgScore >= 6) return { emoji: '📈', text: 'Strong Potential', sub: 'Solid foundation with minor conceptual gaps.' }
    return { emoji: '📚', text: 'Bridge the Gaps', sub: 'Recommend focusing on fundamental principles.' }
  }

  const verdict = getVerdict()

  return (
    <div style={s.page}>
      {/* Sidebar - Consistent with Dashboard/Setup */}
      <aside style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <div style={s.logoSmall}>DI</div>
          <span style={s.logoText}>DevOps Prep</span>
        </div>
        <div style={s.sidebarNav}>
          <button style={s.navItem} onClick={onGoHome}><span style={s.navIcon}>📊</span> Dashboard</button>
          <button style={s.navItem} onClick={onRestart}><span style={s.navIcon}>🚀</span> New Interview</button>
        </div>
        <div style={s.sidebarFooter}>
          <button style={s.backBtn} onClick={onGoHome}>← Back Home</button>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.topHeader}>
          <div style={s.scoreCircle}>
            <div style={{ ...s.scoreVal, color: scoreColor(avgScore) }}>{avgScore}</div>
            <div style={s.scoreMax}>/10</div>
          </div>
          <div style={s.verdictInfo}>
            <div style={s.verdictTag}>SESSION COMPLETE</div>
            <h1 style={s.verdictTitle}>{verdict.text} {verdict.emoji}</h1>
            <p style={s.verdictSub}>{verdict.sub}</p>
            <div style={s.metaTags}>
              <span style={s.tag}>{interviewType.toUpperCase()}</span>
              <span style={s.tag}>{level.tag}</span>
              <span style={s.tag}>{history.length} SCENARIOS</span>
            </div>
          </div>
        </header>

        <div style={s.grid}>
          {/* Detailed Breakdown */}
          <div style={s.leftCol}>
            <h3 style={s.sectionLabel}>Technical Breakdown</h3>
            <div style={s.qaStack}>
              {history.map((h, i) => (
                <div key={i} style={s.qaCard}>
                  <div style={s.qaHeader} onClick={() => setExpanded(expanded === i ? null : i)}>
                    <div style={s.qInfo}>
                      <span style={s.qNum}>SCENARIO {i+1}</span>
                      <div style={s.qText}>{h.question}</div>
                    </div>
                    <div style={{ ...s.qScore, color: scoreColor(h.score) }}>{h.score}</div>
                  </div>
                  {expanded === i && (
                    <div style={s.qaBody}>
                      <div style={s.box}>
                        <div style={s.boxLabel}>Your Response</div>
                        <div style={s.answerText}>"{h.answer}"</div>
                      </div>
                      <div style={s.box}>
                        <div style={s.boxLabel}>Alex's Evaluation</div>
                        <pre style={s.feedbackText}>{h.feedback}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Analytics */}
          <div style={s.rightCol}>
            <div style={s.proCard}>
              <h3 style={s.cardTitle}>Improvement Plan</h3>
              <div style={s.improveList}>
                {allImprove.map((p, i) => (
                  <div key={i} style={s.improveItem}>
                    <span style={s.bullet}>•</span>
                    <span style={s.pText}>{p}</span>
                  </div>
                ))}
                {allImprove.length === 0 && <p style={s.empty}>Excellent performance. No critical gaps.</p>}
              </div>
            </div>

            <div style={s.actionCard}>
              <h3 style={s.actionTitle}>Ready to try again?</h3>
              <p style={s.actionSub}>A new set of scenarios is ready based on your weak points.</p>
              <button style={s.primaryBtn} onClick={onRestart}>Start New Session</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex' },
  sidebar: { width: 'var(--sidebar-w)', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '1.5rem', position: 'fixed', height: '100vh', zIndex: 100 },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2.5rem' },
  logoSmall: { width: 32, height: 32, background: 'var(--primary)', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 },
  logoText: { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--muted)', background: 'none', textAlign: 'left' },
  sidebarFooter: { borderTop: '1px solid var(--border)', paddingTop: '1.5rem' },
  backBtn: { background: 'none', color: 'var(--muted)', fontWeight: 700, fontSize: 12 },

  main: { flex: 1, marginLeft: 'var(--sidebar-w)', padding: '4rem 6rem' },
  topHeader: { display: 'flex', gap: '3rem', alignItems: 'center', marginBottom: '4rem' },
  scoreCircle: { width: 140, height: 140, borderRadius: '50%', background: 'var(--surface)', border: '8px solid var(--surface-2)', display: 'flex', alignItems: 'baseline', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' },
  scoreVal: { fontSize: '4rem', fontWeight: 900, fontFamily: '"JetBrains Mono", monospace' },
  scoreMax: { fontSize: '1.25rem', color: 'var(--muted)', fontWeight: 700 },
  verdictInfo: { flex: 1 },
  verdictTag: { fontSize: 10, fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.2em', marginBottom: 8 },
  verdictTitle: { fontSize: '2.5rem', fontWeight: 900, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.02em' },
  verdictSub: { fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '1.5rem' },
  metaTags: { display: 'flex', gap: 8 },
  tag: { padding: '4px 12px', background: 'var(--surface-2)', borderRadius: 20, fontSize: 10, fontWeight: 800, color: 'var(--text-2)' },

  grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '3rem' },
  sectionLabel: { fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.05em' },
  qaStack: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  qaCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', transition: 'all 0.2s' },
  qaHeader: { padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  qInfo: { flex: 1 },
  qNum: { fontSize: 9, fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 6, display: 'block' },
  qText: { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  qScore: { fontSize: '1.5rem', fontWeight: 900, fontFamily: '"JetBrains Mono", monospace', marginLeft: '2rem' },
  qaBody: { padding: '0 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  box: { background: 'var(--surface-2)', padding: '1.5rem', borderRadius: 16 },
  boxLabel: { fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 },
  answerText: { fontSize: 14, fontStyle: 'italic', lineHeight: 1.6 },
  feedbackText: { fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'var(--text-2)', fontFamily: 'inherit' },

  rightCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.75rem' },
  cardTitle: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' },
  improveList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  improveItem: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  bullet: { color: 'var(--primary)', fontWeight: 900 },
  pText: { fontSize: 13, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.5 },
  
  actionCard: { background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '2rem', borderRadius: 'var(--radius)', color: '#fff', textAlign: 'center' },
  actionTitle: { fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 },
  actionSub: { fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem', lineHeight: 1.5 },
  primaryBtn: { width: '100%', background: 'var(--primary)', color: '#fff', padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: 13 },
  empty: { fontSize: 12, color: 'var(--muted)', textAlign: 'center' }
}
