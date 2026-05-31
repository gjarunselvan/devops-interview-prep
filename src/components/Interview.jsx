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

function speak(text, onEnd) {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92; utt.pitch = 1.05; utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v => v.name === 'Google US English') || voices.find(v => v.lang === 'en-US' && !v.name.includes('Female')) || voices.find(v => v.lang === 'en-US') || voices[0]
  if (preferred) utt.voice = preferred
  utt.onend = onEnd || null
  window.speechSynthesis.speak(utt)
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

  const recognitionRef = useRef(null)
  const timerRef       = useRef(null)
  const historyRef     = useRef([])

  useEffect(() => { historyRef.current = history }, [history])

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
    const introText = interviewType === 'surprise'
      ? `Hello ${name}, I'm ${INTERVIEWER_NAME}. This is a surprise simulation. I'll pull from any technical or leadership domain at high difficulty. Let's see what you've got.`
      : `Hello ${name}, I'm ${INTERVIEWER_NAME}. Let's conduct your ${interviewType} screen at a ${level.tag} level.`

    if (mode === 'voice') {
      setSpeaking(true)
      speak(introText, () => {
        setSpeaking(false); setIntro(false); loadQuestion([])
      })
    } else {
      setIntro(false); loadQuestion([])
    }
    setStatus(introText)
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
      setQuestion(data.result)
      setStatus('')
      setLoading(false)
      if (mode === 'voice') {
        setSpeaking(true)
        speak(data.result, () => setSpeaking(false))
      }
    } catch {
      setStatus('Error.')
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
      setLoading(false)
    } catch {
      setStatus('Error.')
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
    if (!SR) return
    stopSpeaking()
    const rec = new SR(); rec.lang = 'en-US'
    rec.onresult = e => { setAnswer(e.results[0][0].transcript); setListening(false) }
    rec.onerror = () => setListening(false); rec.onend = () => setListening(false)
    recognitionRef.current = rec; rec.start(); setListening(true)
  }

  function stopListening() { recognitionRef.current?.stop(); setListening(false) }

  const currentScore = feedback ? (feedback.match(/(\d+)\s*\/\s*10/)?.[1] || '?') : null

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={onGoHome}>← Abort</button>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>DevOps Interview</span>
        </div>
        <div style={s.navRight}>
          <button style={s.navLinkBtn} onClick={onGoHome}>🏠 Dashboard</button>
          <button style={s.themeToggle} onClick={() => onPersonalize(theme === 'light' ? 'dark' : 'light', bgColor)}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {sessionType === 'time' ? <div style={s.timer}>⏱ {fmtTime(timeLeft)}</div> : <div style={s.qCounter}>Q {qIndex + 1} / {totalQ}</div>}
          <button style={s.endBtn} onClick={handleEndSession}>End Session</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={s.layout}>
          <div style={s.main}>
            <div style={s.interviewerCard}>
              <div style={s.interviewerLeft}>
                <div style={{ ...s.interviewerAvatar, ...(speaking ? s.avatarSpeaking : {}) }}>{INTERVIEWER_NAME[0]}</div>
                <div>
                  <div style={s.interviewerName}>{INTERVIEWER_NAME}</div>
                  <div style={s.interviewerRole}>AI Interviewer · Senior DevOps</div>
                </div>
              </div>
            </div>

            <div style={s.questionCard}>
              <div style={s.questionLabel}>Question {qIndex + 1}</div>
              <div className="markdown-body" style={s.questionText}>
                {intro || (loading && !question) ? 'Preparing next question...' : <ReactMarkdown>{question}</ReactMarkdown>}
              </div>
            </div>

            {!feedback && !intro && question && (
              <div style={s.answerCard}>
                {inputMode === 'text' ? (
                  <textarea style={s.textarea} placeholder="Type your response..." value={answer} onChange={e => setAnswer(e.target.value)} rows={6} />
                ) : inputMode === 'editor' ? (
                  <div style={s.editorBox}>
                    <Editor
                      value={answer} onValueChange={c => setAnswer(c)}
                      highlight={c => highlight(c, languages.yaml)}
                      padding={20} style={s.editor}
                    />
                  </div>
                ) : (
                  <div>
                    <div style={s.voiceBox}>{answer || (listening ? 'Listening...' : 'Press start to speak')}</div>
                    <button style={{ ...s.micBtn, background: listening ? 'var(--red)' : 'var(--primary)' }} onClick={listening ? stopListening : startListening}>
                      {listening ? 'Stop' : '🎤 Start Speaking'}
                    </button>
                  </div>
                )}
                <button style={{ ...s.submitBtn, opacity: !answer.trim() || loading ? 0.45 : 1 }} disabled={!answer.trim() || loading} onClick={submitAnswer}>
                  {loading ? 'Evaluating...' : 'Submit Answer'}
                </button>
              </div>
            )}

            {feedback && (
              <div style={s.feedbackCard}>
                <div style={s.feedbackHeader}>
                  <div style={s.feedbackTitle}>Feedback</div>
                  <div style={{ ...s.scoreBadge, background: scoreColor(parseInt(currentScore)) + '18', color: scoreColor(parseInt(currentScore)) }}>{currentScore}/10</div>
                </div>
                <div className="markdown-body" style={s.feedbackText}>
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>
                <button style={s.nextBtn} onClick={nextQuestion}>{sessionType === 'questions' && qIndex + 1 >= totalQ ? 'View Report' : 'Next Question →'}</button>
              </div>
            )}
          </div>

          <div style={s.sidebar}>
            <div style={s.sideCard}>
              <div style={s.sideTitle}>Session Progress</div>
              {history.map((h, i) => (
                <div key={i} style={s.historyItem}>
                  <span style={s.historyQ}>Q{i+1}</span>
                  <span style={{ ...s.historyScore, color: scoreColor(h.score) }}>{h.score}/10</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page:             { minHeight: '100vh', background: 'var(--bg)' },
  nav:              { background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft:          { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn:          { padding: '5px 10px', background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginRight: 10, cursor: 'pointer' },
  logo:             { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 },
  navTitle:         { fontWeight: 700, fontSize: 15, color: 'var(--text)' },
  navRight:         { display: 'flex', alignItems: 'center', gap: 12 },
  navLinkBtn:       { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', color: 'var(--text2)' },
  themeToggle:      { background: 'var(--surface2)', border: '1px solid var(--border)', width: 34, height: 34, borderRadius: 8, fontSize: 16, cursor: 'pointer' },
  timer:            { fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  qCounter:         { fontFamily: 'JetBrains Mono,monospace', fontSize: 13, color: 'var(--primary)', fontWeight: 600 },
  endBtn:           { padding: '6px 14px', border: '1.5px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: 'var(--muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  content:          { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' },
  layout:           { display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' },
  main:             { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  interviewerCard:  { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow)' },
  interviewerLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  interviewerAvatar:{ width: 46, height: 46, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 },
  avatarSpeaking:   { boxShadow: '0 0 0 4px rgba(37,99,235,0.2)' },
  interviewerName:  { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  interviewerRole:  { fontSize: 12, color: 'var(--muted)' },
  questionCard:     { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  questionLabel:    { fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase' },
  questionText:     { fontSize: 17, lineHeight: 1.7, color: 'var(--text)', fontWeight: 500 },
  answerCard:       { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  textarea:         { width: '100%', padding: '14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, outline: 'none', background: 'var(--surface2)', color: 'var(--text)' },
  editorBox:        { background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', minHeight: 200 },
  editor:           { fontFamily: '"JetBrains Mono", monospace', fontSize: 13 },
  voiceBox:         { minHeight: 100, background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--text)' },
  micBtn:           { padding: '10px 20px', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600 },
  submitBtn:        { width: '100%', marginTop: 14, padding: '13px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600 },
  feedbackCard:     { background: 'var(--surface)', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  feedbackHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  feedbackTitle:    { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  scoreBadge:       { padding: '5px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700 },
  feedbackText:     { fontSize: 14, lineHeight: 1.8, color: 'var(--text2)' },
  nextBtn:          { width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600 },
  sidebar:          { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  sideCard:         { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' },
  sideTitle:        { fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', color: 'var(--text)' },
  historyItem:      { display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 8 },
  historyQ:         { fontSize: 11, fontWeight: 700, color: 'var(--primary)' },
  historyScore:     { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
}
