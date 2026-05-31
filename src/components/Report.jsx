import { useState } from 'react'

function scoreColor(score) {
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export default function Report({ history, config, profile, onRestart, onGoHome, sidebarOpen, onToggleSidebar }) {
  const [expanded, setExpanded] = useState(null)
  const { level, topicList, interviewType } = config

  const avgScore = history.length > 0
    ? Math.round((history.reduce((a, b) => a + b.score, 0) / history.length) * 10) / 10
    : 0

  const allImprove = [...new Set(history.flatMap(h => h.improvePoints || []))].filter(Boolean)

  function getVerdict() {
    if (avgScore >= 8) return { emoji: '🏆', text: 'Production Ready' }
    if (avgScore >= 6) return { emoji: '📈', text: 'Strong Potential' }
    return { emoji: '📚', text: 'Bridge the Gaps' }
  }

  const verdict = getVerdict()

  return (
    <div style={s.page}>
      {sidebarOpen && <div style={s.overlay} onClick={onToggleSidebar} />}

      <aside style={{ ...s.sidebar, transform: `translateX(${sidebarOpen ? '0' : '-100%'})` }}>
        <div style={s.sidebarHeader}>
          <div style={s.logoSmall}>DI</div>
          <span style={s.logoText}>DevOps Prep</span>
        </div>
        <div style={s.sidebarNav}>
          <button style={s.navItem} onClick={onGoHome}><span style={s.navIcon}>📊</span> Dashboard</button>
          <button style={s.navItem} onClick={onRestart}><span style={s.navIcon}>🚀</span> New Interview</button>
        </div>
        <div style={s.sidebarFooter}>
          <button style={s.backBtn} onClick={onGoHome}>← Home</button>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.topHeader}>
          <div style={s.headerLeft}>
            <button style={s.menuBtn} onClick={onToggleSidebar}>☰</button>
            <div style={s.scoreCircle}>
              <div style={{ ...s.scoreVal, color: scoreColor(avgScore) }}>{avgScore}</div>
            </div>
            <div>
              <div style={s.verdictTag}>SESSION COMPLETE</div>
              <h1 style={s.verdictTitle}>{verdict.text} {verdict.emoji}</h1>
            </div>
          </div>
          <button style={s.primaryBtn} onClick={onRestart}>Restart</button>
        </header>

        <div style={s.grid}>
          <div style={s.leftCol}>
            <h3 style={s.sectionLabel}>Performance Breakdown</h3>
            <div style={s.qaStack}>
              {history.map((h, i) => (
                <div key={i} style={s.qaCard}>
                  <div style={s.qaHeader} onClick={() => setExpanded(expanded === i ? null : i)}>
                    <div style={s.qInfo}>
                      <span style={s.qNum}>Q{i+1}</span>
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
                        <div style={s.boxLabel}>Feedback</div>
                        <pre style={s.feedbackText}>{h.feedback}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={s.rightCol}>
            <div style={s.proCard}>
              <h3 style={s.cardTitle}>Improvements</h3>
              <div style={s.improveList}>
                {allImprove.map((p, i) => (
                  <div key={i} style={s.improveItem}>
                    <span style={s.bullet}>•</span>
                    <span style={s.pText}>{p}</span>
                  </div>
                ))}
                {allImprove.length === 0 && <p style={s.empty}>Excellent!</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 },
  sidebar: { width: 'var(--sidebar-w)', minWidth: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '1.5rem', position: 'fixed', height: '100vh', zIndex: 100, transition: 'transform 0.3s ease' },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2.5rem' },
  logoSmall: { width: 32, height: 32, background: 'var(--primary)', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 },
  logoText: { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--muted)', background: 'none', textAlign: 'left' },
  sidebarFooter: { borderTop: '1px solid var(--border)', paddingTop: '1.5rem' },
  backBtn: { background: 'none', color: 'var(--muted)', fontWeight: 700, fontSize: 12 },

  main: { flex: 1, marginLeft: 'var(--sidebar-w)', padding: 'clamp(1rem, 5vw, 3rem)', maxWidth: '100vw' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  menuBtn: { fontSize: '1.5rem', background: 'none', display: 'none' },
  scoreCircle: { width: 60, height: 60, borderRadius: '50%', background: 'var(--surface)', border: '4px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)' },
  scoreVal: { fontSize: '1.5rem', fontWeight: 900, fontFamily: '"JetBrains Mono", monospace' },
  verdictTag: { fontSize: 9, fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 4 },
  verdictTitle: { fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' },
  primaryBtn: { background: 'var(--primary)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 12 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '2rem' },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' },
  qaStack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  qaCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' },
  qaHeader: { padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '1rem' },
  qInfo: { flex: 1 },
  qNum: { fontSize: 8, fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 4, display: 'block' },
  qText: { fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 },
  qScore: { fontSize: '1.25rem', fontWeight: 900, fontFamily: '"JetBrains Mono", monospace' },
  qaBody: { padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  box: { background: 'var(--surface-2)', padding: '1rem', borderRadius: 12 },
  boxLabel: { fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 },
  answerText: { fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 },
  feedbackText: { fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-2)', fontFamily: 'inherit', maxHeight: 200, overflowY: 'auto' },

  rightCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.5rem' },
  cardTitle: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' },
  improveList: { display: 'flex', flexDirection: 'column', gap: 8 },
  improveItem: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  bullet: { color: 'var(--primary)', fontWeight: 900 },
  pText: { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.4 },
  empty: { fontSize: 11, color: 'var(--muted)', textAlign: 'center' }
}

if (typeof window !== 'undefined' && window.innerWidth <= 768) {
  s.sidebar.transform = `translateX(${s.sidebar.transform === 'translateX(0)' ? '0' : '-100%'})`
  s.menuBtn.display = 'block'
}
