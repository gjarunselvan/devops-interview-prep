import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-clike'
import 'prismjs/themes/prism.css'

const INTERVIEWER_NAME = 'Alex'

const TRANSITIONS = [
  "Great, let's move on to the next one.",
  "Thanks for that answer. Here's your next question.",
  "Alright, moving forward.",
  "Good. Let's continue.",
  "Noted. Next question coming up.",
]

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ROBUST SPEECH ENGINE
function speak(text, onEnd) {
  try {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95; utt.pitch = 1.0; utt.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en')) || voices[0]
    if (voice) utt.voice = voice

    let completed = false
    const finish = () => { if (!completed) { completed = true; onEnd?.() } }
    utt.onend = finish; utt.onerror = finish
    setTimeout(finish, 15000) 

    window.speechSynthesis.speak(utt)
  } catch (e) { onEnd?.() }
}

function stopSpeaking() { window.speechSynthesis.cancel() }

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function scoreColor(score) {
  if (score >= 8) return 'var(--green)'
  if (score >= 6) return 'var(--yellow)'
  return 'var(--red)'
}

export default function Interview({ config, profile, onComplete, onSaveSession, theme, onPersonalize, bgColor, onGoHome }) {
  const { level, topicList, mode, sessionType, totalQ, timeTarget, interviewType } = config

  const [question,  setQuestion]  = useState('')
  const [answer,    setAnswer]    = useState('')
  const [feedback,  setFeedback]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [qIndex,    setQIndex]    = useState(0)
  const [history,   setHistory]   = useState([])
  const [speaking,  setSpeaking]  = useState(false)
  const [timeLeft,  setTimeLeft]  = useState(timeTarget * 60)
  const [status,    setStatus]    = useState('') 
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768)
  const [voiceUnlocked, setVoiceUnlocked] = useState(false)

  const timerRef       = useRef(null)
  const historyRef     = useRef([])

  useEffect(() => { 
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    historyRef.current = history 
    return () => window.removeEventListener('resize', handleResize)
  }, [history])

  useEffect(() => {
    if (sessionType === 'time') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); handleEndSession(); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [])

  // INITIALIZATION
  useEffect(() => {
    if (mode === 'voice' && !voiceUnlocked) {
      setStatus('Waiting for voice activation...')
      return
    }
    const name = profile.full_name.split(' ')[0]
    const introText = `Hello ${name}, I'm ${INTERVIEWER_NAME}. Let's start your ${interviewType} session.`
    setStatus(introText)
    if (mode === 'voice') {
      setSpeaking(true); speak(introText, () => { setSpeaking(false); loadQuestion([]) })
    } else { loadQuestion([]) }
  }, [voiceUnlocked])

  async function loadQuestion(hist) {
    setLoading(true); setStatus('Preparing next question...')
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'question', topics: topicList, level: `${level.label} (${level.tag})`,
          history: hist.map(h => h.question).join(' | ') || 'none', count: hist.length + 1, interviewType
        })
      })
      const data = await res.json()
      setQuestion(data.result); setStatus('')
      if (mode === 'voice') { setSpeaking(true); speak(data.result, () => setSpeaking(false)) }
    } catch { setStatus('Error.') } finally { setLoading(false) }
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    stopSpeaking(); setLoading(true); setStatus('Evaluating...')
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'evaluate', topics: topicList, level: `${level.label} (${level.tag})`,
          question, answer, interviewType
        })
      })
      const data = await res.json()
      setFeedback(data.result); setStatus('')
      const scoreMatch = data.result.match(/(\d+)\s*\/\s*10/)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5
      const entry = { question, answer, feedback: data.result, score, topic: topicList }
      const newHistory = [...historyRef.current, entry]
      setHistory(newHistory); await onSaveSession(newHistory, false)
      if (mode === 'voice') { setSpeaking(true); speak(`Score: ${score}/10. ${randomFrom(TRANSITIONS)}`, () => setSpeaking(false)) }
    } catch { setStatus('Failed.') } finally { setLoading(false) }
  }

  function handleEndSession() { clearInterval(timerRef.current); stopSpeaking(); onComplete(historyRef.current) }

  const currentScore = feedback ? (feedback.match(/(\d+)\s*\/\s*10/)?.[1] || '?') : null

  // VOICE UNLOCK SCREEN FOR MOBILE
  if (mode === 'voice' && !voiceUnlocked) {
    return (
      <div style={s.unlockPage}>
        <div style={s.unlockCard}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🎙️</div>
          <h2 style={{ marginBottom: 10 }}>Voice Mode Ready</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 25, fontSize: 14 }}>Mobile browsers require a tap to enable AI audio.</p>
          <button style={s.launchBtn} onClick={() => {
            // Mobile audio unlock sequence
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(' '));
            setVoiceUnlocked(true);
          }}>TAP TO BEGIN SESSION</button>
          <button style={s.ghostBtn} onClick={onGoHome} style={{ marginTop: 15 }}>Return to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={onGoHome}>← {isMobile ? '' : 'Abort'}</button>
          {!isMobile && <div style={s.logo}>DI</div>}
          <span style={s.navTitle}>{isMobile ? 'Simulation' : 'Interview'}</span>
        </div>
        <div style={s.navRight}>
          {sessionType === 'time' ? <div style={s.timer}>{fmtTime(timeLeft)}</div> : <div style={s.qCounter}>Q{qIndex + 1}/{totalQ}</div>}
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button style={s.endBtn} onClick={handleEndSession}>END</button>
        </div>
      </nav>

      <div style={s.container}>
        <div style={{ ...s.layout, gridTemplateColumns: isMobile ? '1fr' : '1fr 300px' }}>
          
          <div style={s.mainCol}>
            <div style={s.interviewerCard}>
              <div style={{ ...s.avatar, ...(speaking ? s.avatarSpeaking : {}) }}>{INTERVIEWER_NAME[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={s.interviewerName}>{INTERVIEWER_NAME}</div>
                <div style={s.interviewerStatus}>{status || 'Waiting...'}</div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardLabel}>TECHNICAL SCENARIO {qIndex + 1}</div>
              <div className="markdown-body" style={s.questionText}>
                {loading && !question ? <div style={s.loader}><div className="spinner"></div></div> : <ReactMarkdown>{question}</ReactMarkdown>}
              </div>
            </div>

            {!feedback && !loading && question && (
              <div style={s.card}>
                {mode === 'text' ? (
                  <textarea style={s.textarea} placeholder="Describe your solution..." value={answer} onChange={e => setAnswer(e.target.value)} rows={isMobile ? 5 : 8} />
                ) : (
                  <div style={s.voiceBox}>
                    <p style={{ opacity: answer ? 1 : 0.5 }}>{answer || 'Speak your answer clearly...'}</p>
                    {/* Simulated Voice Bar */}
                    <div style={s.voiceVisualizer}><span></span><span></span><span></span><span></span></div>
                  </div>
                )}
                <button style={{ ...s.submitBtn, opacity: answer.trim() ? 1 : 0.4 }} disabled={!answer.trim()} onClick={submitAnswer}>SUBMIT RESPONSE →</button>
              </div>
            )}

            {feedback && (
              <div style={{ ...s.card, border: '2px solid var(--green)' }} className="fade-in">
                <div style={s.cardHeader}>
                  <div style={s.cardTitle}>Assessment</div>
                  <div style={{ ...s.scoreBadge, background: scoreColor(parseInt(currentScore)) + '15', color: scoreColor(parseInt(currentScore)) }}>{currentScore}/10</div>
                </div>
                <div className="markdown-body" style={s.feedbackText}><ReactMarkdown>{feedback}</ReactMarkdown></div>
                <button style={s.nextBtn} onClick={() => { setFeedback(null); setAnswer(''); setQIndex(q => q + 1); if (qIndex + 1 < totalQ) loadQuestion(history); else handleEndSession() }}>
                  {qIndex + 1 >= totalQ ? 'FINALIZE REPORT' : 'NEXT QUESTION →'}
                </button>
              </div>
            )}
          </div>

          {!isMobile && (
            <div style={s.sideCol}>
              <div style={s.card}>
                <div style={s.cardTitle}>Live Log</div>
                <div style={s.historyList}>
                  {history.map((h, i) => (
                    <div key={i} style={s.historyItem}>
                      <span style={s.hNum}>S{i+1}</span>
                      <span style={{ ...s.hScore, color: scoreColor(h.score) }}>{h.score}/10</span>
                    </div>
                  ))}
                  {history.length === 0 && <div style={s.empty}>Ready to begin.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page:         { minHeight: '100vh', background: 'var(--bg)', width: '100%', overflowX: 'hidden' },
  nav:          { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 0.75rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft:      { display: 'flex', alignItems: 'center', gap: 8 },
  backBtn:      { padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer' },
  logo:         { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 },
  navTitle:     { fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 8 },
  themeToggle:  { background: 'var(--surface2)', border: '1px solid var(--border)', width: 34, height: 34, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  qCounter:     { fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-l)', padding: '4px 8px', borderRadius: 6 },
  timer:        { fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 800, color: 'var(--text2)' },
  endBtn:       { padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--red)', fontSize: 10, fontWeight: 900, cursor: 'pointer' },
  
  container:    { padding: '1rem', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' },
  layout:       { display: 'grid', gap: '1rem' },
  mainCol:      { display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '100%' },
  sideCol:      { display: 'flex', flexDirection: 'column', gap: '1rem' },
  
  interviewerCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow)' },
  avatar:       { width: 40, height: 40, background: 'linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, border: '2px solid var(--surface)' },
  avatarSpeaking: { boxShadow: '0 0 0 4px var(--primary-glow)', transform: 'scale(1.05)' },
  interviewerName: { fontSize: 14, fontWeight: 800 },
  interviewerStatus: { fontSize: 11, color: 'var(--muted)', fontWeight: 500 },
  
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)', boxSizing: 'border-box', width: '100%' },
  cardLabel:    { fontSize: 9, fontWeight: 900, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle:    { fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' },
  
  questionText: { fontSize: 'clamp(14px, 4vw, 16px)', lineHeight: 1.6, color: 'var(--text)', fontWeight: 500 },
  textarea:     { width: '100%', padding: '1rem', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 15, outline: 'none', color: 'var(--text)', boxSizing: 'border-box' },
  editorBox:    { background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', minHeight: 250 },
  editor:       { fontFamily: '"JetBrains Mono", monospace', fontSize: 13 },
  
  voiceBox:     { minHeight: 120, background: 'var(--surface2)', border: '2px dashed var(--border)', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 15, color: 'var(--text2)', marginBottom: 15 },
  voiceVisualizer: { display: 'flex', gap: 4, height: 20, alignItems: 'center', marginTop: 10 },
  
  submitBtn:    { width: '100%', marginTop: 10, padding: '16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 900, boxShadow: '0 8px 16px var(--primary-glow)' },
  scoreBadge:   { padding: '4px 12px', borderRadius: 8, fontSize: 14, fontWeight: 900, fontFamily: 'JetBrains Mono' },
  feedbackText: { fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 },
  nextBtn:      { width: '100%', marginTop: 15, padding: '14px', background: 'var(--text)', color: 'var(--bg)', borderRadius: 10, fontSize: 13, fontWeight: 800 },
  
  historyList:  { display: 'flex', flexDirection: 'column', gap: 8 },
  historyItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' },
  hNum:         { fontSize: 10, fontWeight: 900, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 6px', borderRadius: 4 },
  hScore:       { fontSize: 12, fontWeight: 800 },
  
  unlockPage:   { height: '100vh', width: '100vw', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', boxSizing: 'border-box' },
  unlockCard:   { background: 'var(--surface)', padding: '2.5rem', borderRadius: 24, textAlign: 'center', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 400 },
  launchBtn:    { width: '100%', padding: '18px', background: 'var(--primary)', color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 900, boxShadow: '0 10px 20px var(--primary-glow)' },
  ghostBtn:     { background: 'none', color: 'var(--muted)', fontSize: 13, fontWeight: 600, border: 'none' },
  
  loader:       { display: 'flex', justifyContent: 'center', padding: '1rem' },
  empty:        { textAlign: 'center', color: 'var(--muted)', fontSize: 12 }
}
