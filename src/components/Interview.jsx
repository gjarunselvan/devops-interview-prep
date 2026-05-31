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
    
    const getBestVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      return voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || 
             voices.find(v => v.lang.startsWith('en') && !v.name.includes('Female')) || 
             voices.find(v => v.lang.startsWith('en')) || 
             voices[0]
    }

    const voice = getBestVoice()
    if (voice) utt.voice = voice

    let completed = false
    const finish = () => { if (!completed) { completed = true; onEnd?.() } }

    utt.onend = finish
    utt.onerror = finish
    // Safety timeout for mobile browsers that hang
    setTimeout(finish, 10000) 

    window.speechSynthesis.speak(utt)
  } catch (e) {
    console.warn('Speech failed:', e)
    onEnd?.()
  }
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
  const [intro,     setIntro]     = useState(true)
  const [inputMode, setInputMode] = useState((interviewType === 'coding' || interviewType === 'surprise') ? 'editor' : (mode || 'text'))
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768)

  const recognitionRef = useRef(null)
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
    const name = profile.full_name.split(' ')[0]
    const introText = interviewType === 'surprise'
      ? `Hello ${name}, I'm ${INTERVIEWER_NAME}. This is a surprise simulation. Let's see what you've got.`
      : `Hello ${name}, I'm ${INTERVIEWER_NAME}. Let's conduct your ${interviewType} screen at a ${level.tag} level.`

    setIntro(false)
    setStatus(introText)

    if (mode === 'voice') {
      setSpeaking(true)
      speak(introText, () => {
        setSpeaking(false)
        loadQuestion([])
      })
    } else {
      loadQuestion([])
    }
  }, [])

  async function loadQuestion(hist) {
    setLoading(true)
    setStatus('Preparing next question...')
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
      if (data.result) {
        setQuestion(data.result)
        setStatus('')
        if (mode === 'voice') {
          setSpeaking(true)
          speak(data.result, () => setSpeaking(false))
        }
      } else {
        throw new Error('No question received')
      }
    } catch (err) {
      console.error(err)
      setStatus('Error loading question. Retrying...')
      setTimeout(() => loadQuestion(hist), 3000)
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    stopSpeaking()
    setLoading(true)
    setStatus('Evaluating...')
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
      const fb = data.result
      setFeedback(fb)
      setStatus('')

      const scoreMatch = fb.match(/(\d+)\s*\/\s*10/)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5
      const improveMatch = fb.match(/📈 POINTS TO IMPROVE\n([\s\S]*?)$/)
      const improvePoints = improveMatch
        ? improveMatch[1].trim().split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim())
        : []

      const entry = { question, answer, feedback: fb, score, improvePoints, topic: topicList }
      const newHistory = [...historyRef.current, entry]
      setHistory(newHistory)
      await onSaveSession(newHistory, false)

      if (mode === 'voice') {
        const short = `Score: ${score}/10. ${score >= 7 ? 'Well done.' : 'Room to grow.'} ${randomFrom(TRANSITIONS)}`
        setSpeaking(true)
        speak(short, () => setSpeaking(false))
      }
    } catch {
      setStatus('Evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  async function nextQuestion() {
    const newIndex = qIndex + 1
    if (sessionType === 'questions' && newIndex >= totalQ) {
      handleEndSession()
      return
    }
    setFeedback(null); setAnswer(''); setQIndex(newIndex)
    if (mode === 'voice') {
      const transition = randomFrom(TRANSITIONS)
      setSpeaking(true); speak(transition, () => { setSpeaking(false); loadQuestion(historyRef.current) })
    } else {
      loadQuestion(historyRef.current)
    }
  }

  function handleEndSession() {
    clearInterval(timerRef.current); stopSpeaking(); onComplete(historyRef.current)
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported in this browser.'); return }
    stopSpeaking()
    const rec = new SR(); rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false
    rec.onresult = e => { setAnswer(e.results[0][0].transcript); setListening(false) }
    rec.onerror = (err) => { console.error('SR Error:', err); setListening(false) }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec; rec.start(); setListening(true)
  }

  function stopListening() { recognitionRef.current?.stop(); setListening(false) }

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
          <button style={s.endBtn} onClick={handleEndSession}>{isMobile ? 'End' : 'End Session'}</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={{ ...s.layout, gridTemplateColumns: isMobile ? '1fr' : '1fr 300px' }}>
          <div style={s.main}>
            {/* Interviewer State */}
            <div style={s.interviewerCard}>
              <div style={s.interviewerLeft}>
                <div style={{ ...s.interviewerAvatar, ...(speaking ? s.avatarSpeaking : {}) }}>{INTERVIEWER_NAME[0]}</div>
                <div>
                  <div style={s.interviewerName}>{INTERVIEWER_NAME}</div>
                  <div style={s.interviewerRole}>{status || 'Alex is listening...'}</div>
                </div>
              </div>
              {speaking && <div style={s.speakingIndicator}><span></span><span></span><span></span></div>}
            </div>

            {/* Question Display */}
            <div style={s.questionCard}>
              <div style={s.questionLabel}>SCENARIO {qIndex + 1}</div>
              <div className="markdown-body" style={s.questionText}>
                {loading && !question ? (
                  <div style={s.loadingContainer}><div style={s.spinner}></div>Preparing scenario...</div>
                ) : (
                  <ReactMarkdown>{question}</ReactMarkdown>
                )}
              </div>
            </div>

            {/* Answer Input */}
            {!feedback && !loading && question && (
              <div style={s.answerCard}>
                {inputMode === 'text' ? (
                  <textarea style={s.textarea} placeholder="Describe your solution..." value={answer} onChange={e => setAnswer(e.target.value)} rows={isMobile ? 5 : 8} />
                ) : inputMode === 'editor' ? (
                  <div style={s.editorBox}>
                    <Editor
                      value={answer} onValueChange={c => setAnswer(c)}
                      highlight={c => highlight(c, languages.yaml)}
                      padding={isMobile ? 12 : 20} style={s.editor}
                    />
                  </div>
                ) : (
                  <div style={s.voiceContainer}>
                    <div style={{ ...s.voiceBox, borderColor: listening ? 'var(--primary)' : 'var(--border)' }}>
                      {listening ? (
                        <div style={s.listeningPulse}><span></span><span></span><span></span></div>
                      ) : null}
                      <p style={{ opacity: answer ? 1 : 0.5 }}>{answer || 'Waiting for your voice input...'}</p>
                    </div>
                    <button style={{ ...s.micBtn, background: listening ? 'var(--red)' : 'var(--primary)' }} onClick={listening ? stopListening : startListening}>
                      {listening ? '⏹ Stop' : '🎤 Click to Speak'}
                    </button>
                  </div>
                )}
                <button 
                  style={{ ...s.submitBtn, opacity: !answer.trim() || loading ? 0.4 : 1 }} 
                  disabled={!answer.trim() || loading} 
                  onClick={submitAnswer}
                >
                  {loading ? 'Evaluating...' : 'Submit to Alex →'}
                </button>
              </div>
            )}

            {/* Feedback Display */}
            {feedback && (
              <div style={s.feedbackCard} className="fade-in">
                <div style={s.feedbackHeader}>
                  <div style={s.feedbackTitle}>Assessment</div>
                  <div style={{ ...s.scoreBadge, background: scoreColor(parseInt(currentScore)) + '20', color: scoreColor(parseInt(currentScore)) }}>{currentScore}/10</div>
                </div>
                <div className="markdown-body" style={s.feedbackText}>
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>
                <button style={s.nextBtn} onClick={nextQuestion}>
                  {qIndex + 1 >= totalQ ? 'Finalize Report' : 'Next Scenario →'}
                </button>
              </div>
            )}
          </div>

          {/* Progress Sidebar (Desktop Only) */}
          {!isMobile && (
            <div style={s.sidebar}>
              <div style={s.sideCard}>
                <div style={s.sideTitle}>Session Log</div>
                <div style={s.historyList}>
                  {history.map((h, i) => (
                    <div key={i} style={s.historyItem}>
                      <span style={s.historyQ}>S{i+1}</span>
                      <div style={s.historyStatus}>Completed</div>
                      <span style={{ ...s.historyScore, color: scoreColor(h.score) }}>{h.score}/10</span>
                    </div>
                  ))}
                  {history.length === 0 && <div style={s.emptyHistory}>No completed steps.</div>}
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
  page:             { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  nav:              { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft:          { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn:          { padding: '6px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer' },
  logo:             { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 },
  navTitle:         { fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' },
  navRight:         { display: 'flex', alignItems: 'center', gap: 15 },
  themeToggle:      { background: 'var(--surface2)', border: '1px solid var(--border)', width: 34, height: 34, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  timer:            { fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 800, color: 'var(--primary)' },
  qCounter:         { fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-l)', padding: '4px 10px', borderRadius: 8 },
  endBtn:           { padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  
  content:          { maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' },
  layout:           { display: 'grid', gap: '1.5rem', alignItems: 'start' },
  main:             { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  
  interviewerCard:  { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' },
  interviewerLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  interviewerAvatar:{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, border: '2px solid var(--surface)' },
  avatarSpeaking:   { boxShadow: '0 0 0 4px var(--primary-glow)', transform: 'scale(1.05)', transition: 'all 0.3s ease' },
  interviewerName:  { fontSize: 15, fontWeight: 800 },
  interviewerRole:  { fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 500 },
  
  speakingIndicator: { display: 'flex', gap: 3, alignItems: 'center' },
  
  questionCard:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem', boxShadow: 'var(--shadow)' },
  questionLabel:    { fontSize: 10, fontWeight: 900, color: 'var(--primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' },
  questionText:     { fontSize: 'clamp(15px, 4vw, 17px)', lineHeight: 1.7, color: 'var(--text)', fontWeight: 500 },
  
  answerCard:       { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  textarea:         { width: '100%', padding: '16px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 16, outline: 'none', background: 'var(--surface2)', color: 'var(--text)', transition: 'border-color 0.2s' },
  editorBox:        { background: 'var(--bg)', borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden', minHeight: 250 },
  editor:           { fontFamily: '"JetBrains Mono", monospace', fontSize: 14 },
  
  voiceContainer:   { display: 'flex', flexDirection: 'column', gap: 15 },
  voiceBox:         { minHeight: 120, background: 'var(--surface2)', border: '2px dashed var(--border)', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 15, color: 'var(--text2)' },
  listeningPulse:   { display: 'flex', gap: 5, marginBottom: 15 },
  micBtn:           { padding: '14px 24px', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, boxShadow: '0 8px 16px var(--primary-glow)' },
  
  submitBtn:        { width: '100%', marginTop: 15, padding: '16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, boxShadow: '0 8px 16px var(--primary-glow)' },
  
  feedbackCard:     { background: 'var(--surface)', border: '2px solid var(--green)', borderRadius: 'var(--radius)', padding: '1.75rem', boxShadow: 'var(--shadow-lg)' },
  feedbackHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  feedbackTitle:    { fontSize: 16, fontWeight: 850, color: 'var(--text)' },
  scoreBadge:       { padding: '6px 16px', borderRadius: 10, fontSize: 15, fontWeight: 900, fontFamily: 'JetBrains Mono,monospace' },
  feedbackText:     { fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 },
  nextBtn:          { width: '100%', marginTop: 20, padding: '14px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800 },
  
  sidebar:          { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sideCard:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  sideTitle:        { fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 },
  historyList:      { display: 'flex', flexDirection: 'column', gap: 10 },
  historyItem:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' },
  historyQ:         { fontSize: 10, fontWeight: 900, color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 6px', borderRadius: 5 },
  historyStatus:    { fontSize: 11, fontWeight: 700, color: 'var(--muted)' },
  historyScore:     { fontSize: 13, fontWeight: 800, color: 'var(--text)' },
  emptyHistory:     { fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '1rem' },
  
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: 15, color: 'var(--muted)', fontWeight: 700 },
  spinner:          { width: 30, height: 30, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }
}
