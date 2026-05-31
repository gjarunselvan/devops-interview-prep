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
  const [listening, setListening] = useState(false)
  const [timeLeft,  setTimeLeft]  = useState(timeTarget * 60)
  const [status,    setStatus]    = useState('') 
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768)

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

  useEffect(() => {
    const name = profile.full_name.split(' ')[0]
    const introText = `Hello ${name}, I'm ${INTERVIEWER_NAME}. Let's start your ${interviewType} session.`
    setStatus(introText)
    if (mode === 'voice') {
      setSpeaking(true); speak(introText, () => { setSpeaking(false); loadQuestion([]) })
    } else { loadQuestion([]) }
  }, [])

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

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={onGoHome}>← {isMobile ? '' : 'Abort'}</button>
          {!isMobile && <div style={s.logo}>DI</div>}
          <span style={s.navTitle}>{isMobile ? 'Simulation' : 'DevOps Interview'}</span>
        </div>
        <div style={s.navRight}>
          {sessionType === 'time' ? <div style={s.timer}>⏱ {fmtTime(timeLeft)}</div> : <div style={s.qCounter}>Q {qIndex + 1}/{totalQ}</div>}
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button style={s.endBtn} onClick={handleEndSession}>END</button>
        </div>
      </nav>

      <div style={s.container}>
        <div style={{ ...s.layout, gridTemplateColumns: isMobile ? '1fr' : '1fr 320px' }}>
          
          {/* MAIN FLOW */}
          <div style={s.mainCol}>
            
            {/* INTERVIEWER CARD */}
            <div style={s.interviewerCard}>
              <div style={{ ...s.avatar, ...(speaking ? s.avatarSpeaking : {}) }}>{INTERVIEWER_NAME[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={s.interviewerName}>{INTERVIEWER_NAME}</div>
                <div style={s.interviewerStatus}>{status || 'Alex is waiting...'}</div>
              </div>
            </div>

            {/* SCENARIO CARD */}
            <div style={s.card}>
              <div style={s.cardLabel}>TECHNICAL SCENARIO {qIndex + 1}</div>
              <div className="markdown-body" style={s.questionText}>
                {loading && !question ? <div style={s.loader}><div className="spinner"></div></div> : <ReactMarkdown>{question}</ReactMarkdown>}
              </div>
            </div>

            {/* RESPONSE CARD */}
            {!feedback && !loading && question && (
              <div style={s.card}>
                {inputMode === 'text' ? (
                  <textarea style={s.textarea} placeholder="Write your response..." value={answer} onChange={e => setAnswer(e.target.value)} rows={isMobile ? 6 : 10} />
                ) : (
                  <div style={s.editorBox}>
                    <Editor value={answer} onValueChange={c => setAnswer(c)} highlight={c => highlight(c, languages.yaml)} padding={15} style={s.editor} />
                  </div>
                )}
                <button style={{ ...s.submitBtn, opacity: answer.trim() ? 1 : 0.4 }} disabled={!answer.trim()} onClick={submitAnswer}>SUBMIT RESPONSE →</button>
              </div>
            )}

            {/* ASSESSMENT CARD */}
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

          {/* PROGRESS SIDEBAR */}
          {!isMobile && (
            <div style={s.sideCol}>
              <div style={s.card}>
                <div style={s.cardTitle}>Live Progress</div>
                <div style={s.historyList}>
                  {history.map((h, i) => (
                    <div key={i} style={s.historyItem}>
                      <span style={s.hNum}>Q{i+1}</span>
                      <span style={{ ...s.hScore, color: scoreColor(h.score) }}>{h.score}/10</span>
                    </div>
                  ))}
                  {history.length === 0 && <div style={s.empty}>No scenarios completed.</div>}
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
  nav:          { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft:      { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn:      { padding: '6px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer' },
  logo:         { width: 34, height: 34, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 },
  navTitle:     { fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' },
  navRight:     { display: 'flex', alignItems: 'center', gap: 10 },
  themeToggle:  { background: 'var(--surface2)', border: '1px solid var(--border)', width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  qCounter:     { fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-l)', padding: '4px 8px', borderRadius: 6 },
  timer:        { fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 800, color: 'var(--text2)' },
  endBtn:       { padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--red)', fontSize: 11, fontWeight: 900, cursor: 'pointer' },
  
  container:    { padding: '1.5rem 1rem', maxWidth: 1300, margin: '0 auto' },
  layout:       { display: 'grid', gap: '1.5rem' },
  mainCol:      { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sideCol:      { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  
  interviewerCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow)' },
  avatar:       { width: 44, height: 44, background: 'linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, border: '2px solid var(--surface)' },
  avatarSpeaking: { boxShadow: '0 0 0 4px var(--primary-glow)', transform: 'scale(1.05)' },
  interviewerName: { fontSize: 15, fontWeight: 800 },
  interviewerStatus: { fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginTop: 2 },
  
  card:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  cardLabel:    { fontSize: 10, fontWeight: 900, color: 'var(--primary)', marginBottom: 15, textTransform: 'uppercase', letterSpacing: '0.1em' },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle:    { fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' },
  
  questionText: { fontSize: 'clamp(15px, 4.5vw, 17px)', lineHeight: 1.7, color: 'var(--text)', fontWeight: 500 },
  textarea:     { width: '100%', padding: '1.25rem', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 14, fontSize: 16, outline: 'none', color: 'var(--text)', transition: 'border-color 0.2s' },
  editorBox:    { background: 'var(--bg)', borderRadius: 14, border: '1.5px solid var(--border)', overflow: 'hidden', minHeight: 300 },
  editor:       { fontFamily: '"JetBrains Mono", monospace', fontSize: 14 },
  
  submitBtn:    { width: '100%', marginTop: 15, padding: '18px', background: 'var(--primary)', color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 900, boxShadow: '0 8px 20px var(--primary-glow)' },
  scoreBadge:   { padding: '6px 14px', borderRadius: 10, fontSize: 15, fontWeight: 900, fontFamily: 'JetBrains Mono' },
  feedbackText: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 },
  nextBtn:      { width: '100%', marginTop: 20, padding: '16px', background: 'var(--text)', color: 'var(--bg)', borderRadius: 12, fontSize: 14, fontWeight: 800 },
  
  historyList:  { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 },
  historyItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' },
  hNum:         { fontSize: 11, fontWeight: 900, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 7px', borderRadius: 5 },
  hScore:       { fontSize: 13, fontWeight: 800 },
  
  loader:       { display: 'flex', justifyContent: 'center', padding: '2rem' },
  empty:        { textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: '1rem' }
}
