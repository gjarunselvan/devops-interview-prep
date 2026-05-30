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
  utt.rate = 0.92
  utt.pitch = 1.05
  utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred =
    voices.find(v => v.name === 'Google US English') ||
    voices.find(v => v.lang === 'en-US' && !v.name.includes('Female')) ||
    voices.find(v => v.lang === 'en-US') ||
    voices[0]
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
  if (score >= 4) return 'var(--yellow)'
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
  const [status,    setStatus]    = useState('') // status message shown to user
  const [intro,     setIntro]     = useState(true)

  const recognitionRef = useRef(null)
  const timerRef       = useRef(null)
  const historyRef     = useRef([])

  // keep historyRef in sync
  useEffect(() => { historyRef.current = history }, [history])

  // load voices
  useEffect(() => { window.speechSynthesis.getVoices() }, [])

  // timer for time-based sessions
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

  // start interview with intro
  useEffect(() => {
    const introText = `Hello ${profile.full_name.split(' ')[0]}, I'm ${INTERVIEWER_NAME}, your interviewer today. We'll be covering ${topicList}. I'll ask you ${sessionType === 'questions' ? `${totalQ} questions` : `questions for ${timeTarget} minutes`}. Let's get started.`
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
    setStatus('Preparing your next question...')
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
      setStatus('Error loading question. Please try again.')
      setLoading(false)
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    stopSpeaking()
    setLoading(true)
    setStatus('Evaluating your answer...')
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
        const short = `Your score is ${score} out of 10. ${score >= 7 ? 'Good answer.' : 'There are some areas to improve.'} ${randomFrom(TRANSITIONS)}`
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
      speak(`That's a wrap! Great effort today. Let's review your session report.`)
    }
    onComplete(historyRef.current)
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    stopSpeaking()
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = e => {
      setAnswer(e.results[0][0].transcript)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
    if (mode === 'voice') {
      speak(randomFrom(ENCOURAGEMENTS))
    }
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const currentScore = feedback ? (feedback.match(/(\d+)\s*\/\s*10/)?.[1] || '?') : null
  const avgSoFar = history.length > 0
    ? (history.reduce((a, b) => a + b.score, 0) / history.length).toFixed(1)
    : null

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <div style={s.logo}>DI</div>
          <span style={s.navTitle}>DevOps Interview</span>
          <span style={s.navDivider}>|</span>
          <span style={s.navSub}>{topicList} · {level.tag}</span>
        </div>
        <div style={s.navRight}>
          {sessionType === 'time' && (
            <div style={{ ...s.timer, color: timeLeft < 60 ? 'var(--red)' : 'var(--text2)' }}>
              ⏱ {fmtTime(timeLeft)}
            </div>
          )}
          {sessionType === 'questions' && (
            <div style={s.qCounter}>Q {qIndex + 1} / {totalQ}</div>
          )}
          {avgSoFar && <div style={s.avgScore}>Avg: {avgSoFar}/10</div>}
          <span style={{ ...s.modeBadge, background: mode === 'voice' ? '#fef3c7' : '#eff6ff', color: mode === 'voice' ? '#92400e' : 'var(--primary)' }}>
            {mode === 'voice' ? '🎙️ Voice' : '⌨️ Text'}
          </span>
          <button style={s.endBtn} onClick={handleEndSession}>End Session</button>
        </div>
      </nav>

      {/* Progress bar */}
      {sessionType === 'questions' && (
        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width: `${(qIndex / totalQ) * 100}%` }} />
        </div>
      )}

      <div style={s.content}>
        <div style={s.layout}>

          {/* Main interview area */}
          <div style={s.main}>

            {/* Interviewer card */}
            <div style={s.interviewerCard}>
              <div style={s.interviewerLeft}>
                <div style={{ ...s.interviewerAvatar, ...(speaking ? s.avatarSpeaking : {}) }}>
                  {INTERVIEWER_NAME[0]}
                </div>
                <div>
                  <div style={s.interviewerName}>{INTERVIEWER_NAME}</div>
                  <div style={s.interviewerRole}>Senior DevOps Engineer · AI Interviewer</div>
                </div>
              </div>
              {speaking && (
                <div style={s.speakingIndicator}>
                  {[0,1,2,3].map(i => <span key={i} style={{ ...s.bar, animationDelay: `${i*0.1}s` }} />)}
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Speaking...</span>
                </div>
              )}
              {mode === 'voice' && !speaking && question && !feedback && (
                <button style={s.replayBtn} onClick={() => { setSpeaking(true); speak(question, () => setSpeaking(false)) }}>
                  🔊 Replay
                </button>
              )}
            </div>

            {/* Question */}
            <div style={s.questionCard}>
              <div style={s.questionLabel}>
                Question {qIndex + 1}
                {sessionType === 'questions' && <span style={s.questionOf}> of {totalQ}</span>}
              </div>
              {intro || (loading && !question) ? (
                <div style={s.loadingRow}>
                  {[0,1,2].map(i => <span key={i} style={{ ...s.dot, animationDelay: `${i*0.2}s` }} />)}
                  <span style={s.loadingText}>{status || 'Preparing question...'}</span>
                </div>
              ) : (
                <p style={s.questionText}>{question}</p>
              )}
            </div>

            {/* Answer area */}
            {!feedback && !intro && question && (
              <div style={s.answerCard}>
                <div style={s.answerLabel}>Your Answer</div>

                {mode === 'text' ? (
                  <textarea
                    style={s.textarea}
                    placeholder="Type your answer here... Be as detailed as you can."
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    rows={6}
                  />
                ) : (
                  <div>
                    <div style={s.voiceBox}>
                      {listening && (
                        <div style={s.listeningPulse}>
                          <div style={s.pulseRing} />
                          <div style={s.pulseDot} />
                        </div>
                      )}
                      {answer
                        ? <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)' }}>{answer}</p>
                        : <p style={{ color: 'var(--muted)', fontSize: 14 }}>{listening ? 'Listening... speak now' : 'Press the mic button and start speaking'}</p>
                      }
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button
                        style={{ ...s.micBtn, background: listening ? 'var(--red)' : 'var(--primary)', flex: 1 }}
                        onClick={listening ? stopListening : startListening}
                      >
                        {listening ? '⏹ Stop Recording' : '🎤 Start Speaking'}
                      </button>
                      {answer && <button style={s.clearBtn} onClick={() => setAnswer('')}>Clear</button>}
                    </div>
                  </div>
                )}

                <button
                  style={{ ...s.submitBtn, opacity: (!answer.trim() || loading) ? 0.45 : 1 }}
                  disabled={!answer.trim() || loading}
                  onClick={submitAnswer}
                >
                  {loading ? 'Evaluating your answer...' : 'Submit Answer'}
                </button>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div style={s.feedbackCard}>
                <div style={s.feedbackHeader}>
                  <div style={s.feedbackTitle}>Feedback</div>
                  <div style={{ ...s.scoreBadge, background: scoreColor(parseInt(currentScore)) + '18', color: scoreColor(parseInt(currentScore)), border: `1.5px solid ${scoreColor(parseInt(currentScore))}` }}>
                    {currentScore}/10
                  </div>
                </div>
                <pre style={s.feedbackText}>{feedback}</pre>
                <button style={s.nextBtn} onClick={nextQuestion}>
                  {sessionType === 'questions' && qIndex + 1 >= totalQ ? '📊 View Session Report' : 'Next Question →'}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar — score history */}
          <div style={s.sidebar}>
            <div style={s.sideCard}>
              <div style={s.sideTitle}>Session Progress</div>
              {history.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '1rem 0' }}>Scores will appear here</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map((h, i) => (
                    <div key={i} style={s.historyItem}>
                      <div style={s.historyLeft}>
                        <span style={s.historyQ}>Q{i + 1}</span>
                        <span style={s.historyTopic}>{h.topic.split(',')[0]}</span>
                      </div>
                      <span style={{ ...s.historyScore, color: scoreColor(h.score) }}>{h.score}/10</span>
                    </div>
                  ))}
                  {avgSoFar && (
                    <div style={s.avgRow}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Average</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(parseFloat(avgSoFar)) }}>{avgSoFar}/10</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={s.sideCard}>
              <div style={s.sideTitle}>Session Info</div>
              <div style={s.infoRow}><span>Topics</span><span style={s.infoVal}>{topicList}</span></div>
              <div style={s.infoRow}><span>Level</span><span style={s.infoVal}>{level.tag}</span></div>
              <div style={s.infoRow}><span>Mode</span><span style={s.infoVal}>{mode === 'voice' ? '🎙️ Voice' : '⌨️ Text'}</span></div>
              {sessionType === 'questions' && <div style={s.infoRow}><span>Questions</span><span style={s.infoVal}>{totalQ}</span></div>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes barAnim { 0%,100%{height:6px} 50%{height:18px} }
        @keyframes ripple { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.5);opacity:0} }
      `}</style>
    </div>
  )
}

const s = {
  page:             { minHeight: '100vh', background: 'var(--bg)' },
  nav:              { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft:          { display: 'flex', alignItems: 'center', gap: 10 },
  logo:             { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 },
  navTitle:         { fontWeight: 700, fontSize: 15, color: 'var(--text)' },
  navDivider:       { color: 'var(--border2)', fontSize: 16 },
  navSub:           { fontSize: 13, color: 'var(--muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  navRight:         { display: 'flex', alignItems: 'center', gap: 12 },
  timer:            { fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 700 },
  qCounter:         { fontFamily: 'JetBrains Mono,monospace', fontSize: 13, color: 'var(--primary)', fontWeight: 600 },
  avgScore:         { fontSize: 13, color: 'var(--muted)', fontFamily: 'JetBrains Mono,monospace' },
  modeBadge:        { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6 },
  endBtn:           { padding: '6px 14px', border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' },
  progressTrack:    { height: 3, background: 'var(--border)', position: 'sticky', top: 60, zIndex: 99 },
  progressFill:     { height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' },
  content:          { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' },
  layout:           { display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' },
  main:             { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  interviewerCard:  { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow)' },
  interviewerLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  interviewerAvatar:{ width: 46, height: 46, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, transition: 'box-shadow 0.3s' },
  avatarSpeaking:   { boxShadow: '0 0 0 4px rgba(37,99,235,0.2), 0 0 0 8px rgba(37,99,235,0.1)' },
  interviewerName:  { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  interviewerRole:  { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  speakingIndicator:{ display: 'flex', alignItems: 'center', gap: 3 },
  bar:              { display: 'inline-block', width: 3, height: 6, background: 'var(--primary)', borderRadius: 2, animation: 'barAnim 0.8s ease-in-out infinite' },
  replayBtn:        { padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' },
  questionCard:     { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  questionLabel:    { fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono,monospace' },
  questionOf:       { color: 'var(--muted)' },
  questionText:     { fontSize: 17, lineHeight: 1.75, color: 'var(--text)', fontWeight: 500 },
  loadingRow:       { display: 'flex', alignItems: 'center', gap: 8 },
  dot:              { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.2s ease-in-out infinite' },
  loadingText:      { fontSize: 14, color: 'var(--muted)' },
  answerCard:       { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  answerLabel:      { fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' },
  textarea:         { width: '100%', padding: '14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, color: 'var(--text)', outline: 'none', resize: 'vertical', lineHeight: 1.7, background: 'var(--surface2)', fontFamily: 'Inter,sans-serif' },
  voiceBox:         { minHeight: 120, background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  listeningPulse:   { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  pulseRing:        { position: 'absolute', width: 60, height: 60, borderRadius: '50%', border: '2px solid var(--primary)', animation: 'ripple 1.5s ease-out infinite' },
  pulseDot:         { width: 16, height: 16, borderRadius: '50%', background: 'var(--primary)', opacity: 0.5 },
  micBtn:           { padding: '12px', border: 'none', borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  clearBtn:         { padding: '12px 18px', border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' },
  submitBtn:        { width: '100%', marginTop: 14, padding: '13px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' },
  feedbackCard:     { background: '#fff', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' },
  feedbackHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  feedbackTitle:    { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  scoreBadge:       { padding: '5px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' },
  feedbackText:     { fontSize: 14, lineHeight: 1.85, color: 'var(--text2)', whiteSpace: 'pre-wrap', fontFamily: 'Inter,sans-serif', marginBottom: 16 },
  nextBtn:          { width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  sidebar:          { display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: 80 },
  sideCard:         { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' },
  sideTitle:        { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' },
  historyItem:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface2)', borderRadius: 8 },
  historyLeft:      { display: 'flex', alignItems: 'center', gap: 8 },
  historyQ:         { fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: 'var(--primary)', background: 'var(--primary-l)', padding: '2px 6px', borderRadius: 4 },
  historyTopic:     { fontSize: 12, color: 'var(--muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  historyScore:     { fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' },
  avgRow:           { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 },
  infoRow:          { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', padding: '5px 0', borderBottom: '1px solid var(--border)' },
  infoVal:          { fontWeight: 500, color: 'var(--text2)', maxWidth: 140, textAlign: 'right', fontSize: 12 },
}
