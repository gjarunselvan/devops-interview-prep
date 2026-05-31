import { useState, useEffect, useRef } from 'react'

const INTERVIEWER_NAME = 'Alex'

const TRANSITIONS = [
  "Great, let's move on to the next one.",
  "Thanks for that answer. Here's your next question.",
  "Alright, moving forward.",
  "Good. Let's continue.",
  "Noted. Next question coming up.",
]

const ENCOURAGEMENTS = [
  "Take your time, there's no rush.",
  "Think it through, I'm listening.",
  "Whenever you're ready.",
]

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function speak(text, onEnd) {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
  utt.pitch = 1
  utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0]
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

export default function Interview({ config, profile, onComplete, onSaveSession }) {
  const { level, topicList, mode, sessionType, totalQ, timeTarget } = config

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
    const introText = `Hello ${profile.full_name.split(' ')[0]}, I'm ${INTERVIEWER_NAME}. We'll cover ${topicList} at a ${level.tag} level. Let's begin.`
    if (mode === 'voice') {
      setSpeaking(true)
      speak(introText, () => {
        setSpeaking(false)
        setIntro(false)
        loadQuestion([])
      })
    } else {
      setIntro(false)
      loadQuestion([])
    }
    setStatus(introText)
  }, [])

  async function loadQuestion(hist) {
    setLoading(true)
    setStatus('Crafting technical scenario...')
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'question',
          topics: topicList,
          level: `${level.label} (${level.tag})`,
          history: hist.map(h => h.question).join(' | ') || 'none',
          count: hist.length + 1,
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
      setStatus('Connection lost. Retrying...')
      setLoading(false)
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    stopSpeaking()
    setLoading(true)
    setStatus('Evaluating your response...')
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'evaluate',
          topics: topicList,
          level: `${level.label} (${level.tag})`,
          question,
          answer,
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
        const short = `Score: ${score}/10. ${score >= 7 ? 'Well said.' : 'Room for improvement.'} ${randomFrom(TRANSITIONS)}`
        setSpeaking(true)
        speak(short, () => setSpeaking(false))
      }
      setLoading(false)
    } catch {
      setStatus('Error evaluating answer.')
      setLoading(false)
    }
  }

  async function nextQuestion() {
    const newIndex = qIndex + 1
    if (sessionType === 'questions' && newIndex >= totalQ) {
      handleEndSession()
      return
    }
    setFeedback(null)
    setAnswer('')
    setQIndex(newIndex)
    if (mode === 'voice') {
      const transition = randomFrom(TRANSITIONS)
      setSpeaking(true)
      speak(transition, () => {
        setSpeaking(false)
        loadQuestion(historyRef.current)
      })
    } else {
      loadQuestion(historyRef.current)
    }
  }

  function handleEndSession() {
    clearInterval(timerRef.current)
    stopSpeaking()
    if (mode === 'voice') {
      speak(`Interview complete. Let's analyze your performance.`)
    }
    onComplete(historyRef.current)
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    stopSpeaking()
    const rec = new SR()
    rec.lang = 'en-US'
    rec.onresult = e => {
      setAnswer(e.results[0][0].transcript)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
    if (mode === 'voice') speak(randomFrom(ENCOURAGEMENTS))
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const currentScore = feedback ? (feedback.match(/(\d+)\s*\/\s*10/)?.[1] || '?') : null

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.container}>
          <div style={s.navContent}>
            <div style={s.navLeft}>
              <div style={s.logo}>DI</div>
              <span style={s.navStatus}>{status || (intro ? 'Initialising...' : 'Session in Progress')}</span>
            </div>
            <div style={s.navRight}>
              {sessionType === 'time' ? (
                <div style={{ ...s.timer, color: timeLeft < 60 ? 'var(--red)' : 'var(--text)' }}>⏱ {fmtTime(timeLeft)}</div>
              ) : (
                <div style={s.counter}>Q {qIndex + 1} / {totalQ}</div>
              )}
              <button style={s.endBtn} onClick={handleEndSession}>End Interview</button>
            </div>
          </div>
        </div>
      </nav>

      <main style={s.container}>
        <div style={s.layout}>
          <div style={s.mainCol}>
            <div style={s.interviewerCard}>
              <div style={s.interviewerInfo}>
                <div style={{ ...s.avatar, ...(speaking ? s.avatarSpeaking : {}) }}>{INTERVIEWER_NAME[0]}</div>
                <div>
                  <div style={s.interviewerName}>{INTERVIEWER_NAME}</div>
                  <div style={s.interviewerRole}>Senior DevOps Interviewer</div>
                </div>
              </div>
              {speaking && <div style={s.speaking}>● Speaking...</div>}
            </div>

            <div style={s.card}>
              <div style={s.cardLabel}>Question {qIndex + 1}</div>
              <h2 style={s.questionText}>{loading && !question ? '...' : question}</h2>
            </div>

            {!feedback && !intro && question && (
              <div style={s.card}>
                <div style={s.cardLabel}>Your Response</div>
                
                {/* Mode Selector */}
                <div style={s.modeSelector}>
                  {['text', 'voice', 'editor'].map(m => (
                    <button key={m} 
                      style={{ ...s.smallModeBtn, background: mode === m ? 'var(--primary-l)' : 'none', color: mode === m ? 'var(--primary)' : 'var(--muted)' }}
                      onClick={() => setMode(m)}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>

                {mode === 'text' && (
                  <textarea style={s.textarea} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Explain your approach..." rows={6} />
                )}

                {mode === 'voice' && (
                  <div style={s.voiceBox}>
                    <p style={answer ? s.voiceText : s.voicePlaceholder}>{answer || (listening ? 'Listening...' : 'Press mic to speak')}</p>
                    <button style={{ ...s.micBtn, background: listening ? 'var(--red)' : 'var(--primary)' }} onClick={listening ? stopListening : startListening}>
                      {listening ? 'Stop' : 'Speak'}
                    </button>
                  </div>
                )}

                {mode === 'editor' && (
                  <div style={s.editorWrapper}>
                    <Editor
                      value={answer}
                      onValueChange={code => setAnswer(code)}
                      highlight={code => highlight(code, languages.yaml)}
                      padding={20}
                      style={s.editor}
                      placeholder="# Write your YAML/IaC here..."
                    />
                  </div>
                )}

                <button style={{ ...s.submitBtn, opacity: !answer.trim() || loading ? 0.5 : 1 }} disabled={!answer.trim() || loading} onClick={submitAnswer}>
                  {loading ? 'Evaluating...' : 'Submit Response'}
                </button>
              </div>
            )}

            {feedback && (
              <div style={s.feedbackCard}>
                <div style={s.feedbackHeader}>
                  <h3 style={s.feedbackTitle}>Alex's Evaluation</h3>
                  <div style={{ ...s.scoreBadge, background: scoreColor(parseInt(currentScore)) + '15', color: scoreColor(parseInt(currentScore)) }}>{currentScore}/10</div>
                </div>
                <pre style={s.feedbackText}>{feedback}</pre>
                <button style={s.nextBtn} onClick={nextQuestion}>
                  {sessionType === 'questions' && qIndex + 1 >= totalQ ? 'Finish & View Report' : 'Next Question →'}
                </button>
              </div>
            )}
          </div>

          <div style={s.sideCol}>
            <div style={s.card}>
              <h3 style={s.sideTitle}>Session Progress</h3>
              <div style={s.history}>
                {history.map((h, i) => (
                  <div key={i} style={s.historyItem}>
                    <span style={s.historyQ}>Q{i+1}</span>
                    <span style={{ ...s.historyScore, color: scoreColor(h.score) }}>{h.score}/10</span>
                  </div>
                ))}
                {history.length === 0 && <p style={s.empty}>Waiting for first response...</p>}
              </div>
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
  nav: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0.75rem 0', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  logo: { background: 'var(--primary)', color: '#fff', padding: '6px 10px', borderRadius: 8, fontWeight: 800 },
  navStatus: { fontSize: 13, color: 'var(--muted)', fontWeight: 500 },
  navRight: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  timer: { fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15 },
  counter: { fontSize: 13, fontWeight: 700, color: 'var(--primary)' },
  endBtn: { background: 'none', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, fontSize: 12, color: 'var(--red)' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem', padding: '2rem 0' },
  mainCol: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  interviewerCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1rem 1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' },
  interviewerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  avatar: { width: 44, height: 44, background: 'var(--primary)', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 },
  avatarSpeaking: { boxShadow: '0 0 0 4px var(--primary-l)' },
  interviewerName: { fontWeight: 700, fontSize: 15 },
  interviewerRole: { fontSize: 12, color: 'var(--muted)' },
  speaking: { fontSize: 12, color: 'var(--primary)', fontWeight: 700 },
  card: { background: '#fff', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' },
  questionText: { fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.5 },
  textarea: { width: '100%', padding: '1rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', outline: 'none', fontSize: 15, lineHeight: 1.6 },
  submitBtn: { marginTop: '1rem', width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 },
  voiceBox: { display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'var(--surface-2)', borderRadius: 10 },
  voiceText: { fontSize: 15, textAlign: 'center' },
  voicePlaceholder: { color: 'var(--muted)', fontStyle: 'italic' },
  micBtn: { padding: '10px 30px', border: 'none', borderRadius: 20, color: '#fff', fontWeight: 700 },
  feedbackCard: { background: 'var(--green-l)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1.5px solid var(--green)' },
  feedbackHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  feedbackTitle: { fontSize: 16, fontWeight: 800, color: 'var(--text)' },
  scoreBadge: { padding: '4px 12px', borderRadius: 8, fontWeight: 800, fontSize: 18, fontFamily: 'JetBrains Mono' },
  feedbackText: { fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'var(--text-2)', fontFamily: 'inherit' },
  nextBtn: { marginTop: '1.5rem', width: '100%', padding: '12px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 },
  sideTitle: { fontSize: 14, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1rem' },
  history: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  historyItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 },
  historyQ: { fontSize: 12, fontWeight: 600 },
  historyScore: { fontWeight: 800, fontSize: 14, fontFamily: 'JetBrains Mono' },
  empty: { color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '1rem 0' }
}
