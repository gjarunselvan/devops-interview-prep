import { useState, useEffect, useRef } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-clike'
import 'prismjs/themes/prism.css'

const INTERVIEWER_NAME = 'Alex'

function speak(text, onEnd) {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
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

export default function Interview({ config, profile, onComplete, onSaveSession }) {
  const { level, topicList, mode: initialMode, sessionType, totalQ, timeTarget, interviewType } = config

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
  const [inputMode, setInputMode] = useState(initialMode || 'text')

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
    const introText = `Hello ${profile.full_name.split(' ')[0]}, I'm ${INTERVIEWER_NAME}. Let's start.`
    if (inputMode === 'voice') {
      setSpeaking(true)
      speak(introText, () => { setSpeaking(false); loadQuestion([]) })
    } else {
      loadQuestion([])
    }
    setStatus(introText)
  }, [])

  async function loadQuestion(hist) {
    setLoading(true)
    setStatus('Thinking...')
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
      if (inputMode === 'voice') {
        setSpeaking(true)
        speak(data.result, () => setSpeaking(false))
      }
    } catch {
      setStatus('Network error.')
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
      setLoading(false)
    } catch {
      setStatus('Error.')
      setLoading(false)
    }
  }

  function handleEndSession() {
    clearInterval(timerRef.current); stopSpeaking(); onComplete(historyRef.current)
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navContent}>
          <div style={s.navLeft}>
            <div style={s.logo}>DI</div>
            <div style={s.hideMobile}>
              <div style={s.navTitle}>{interviewType.toUpperCase()}</div>
            </div>
          </div>
          <div style={s.navRight}>
            <div style={s.timerBox}>
              <span style={s.timerVal}>{fmtTime(timeTarget * 60 - timeLeft)}</span>
            </div>
            <button style={s.endBtn} onClick={handleEndSession}>END</button>
          </div>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.layout}>
          <div style={s.aiSection}>
            <div style={s.aiCard}>
              <div style={{ ...s.aiAvatar, boxShadow: speaking ? '0 0 20px var(--primary-glow)' : 'none' }}>
                <div style={s.aiInitial}>A</div>
              </div>
              <div style={s.statusBadge}>{status || (speaking ? 'Speaking...' : 'Listening')}</div>
            </div>
            <div style={s.questionCard}>
              <p style={s.qText}>{loading && !question ? '...' : question}</p>
            </div>
          </div>

          <div style={s.inputSection}>
            <div style={s.proCard}>
              <div style={s.modeToggle}>
                {['text', 'voice', 'editor'].map(m => (
                  <button key={m} 
                    style={{ ...s.modeBtn, background: inputMode === m ? 'var(--primary)' : 'var(--surface-2)', color: inputMode === m ? '#fff' : 'var(--muted)' }}
                    onClick={() => setInputMode(m)}>
                    {m[0].toUpperCase()}
                  </button>
                ))}
              </div>

              {inputMode === 'text' && <textarea style={s.textarea} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer..." rows={6} />}
              {inputMode === 'editor' && <div style={s.editorBox}><Editor value={answer} onValueChange={c => setAnswer(c)} highlight={c => highlight(c, languages.yaml)} padding={15} style={s.editor} /></div>}
              {inputMode === 'voice' && <div style={s.voiceInterface}><div style={s.voiceVisualizer}>{[1,2,3].map(i => <div key={i} style={{ ...s.vBar, height: listening ? 15 + Math.random()*30 : 4 }} />)}</div></div>}

              {feedback ? (
                <div style={s.feedbackArea}>
                  <button style={s.nextBtn} onClick={() => { setFeedback(null); setAnswer(''); setQIndex(i => i + 1); loadQuestion(history) }}>NEXT →</button>
                  <pre style={s.fbText}>{feedback}</pre>
                </div>
              ) : (
                <button style={{ ...s.submitBtn, opacity: !answer.trim() || loading ? 0.5 : 1 }} disabled={!answer.trim() || loading} onClick={submitAnswer}>
                  SUBMIT
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  nav: { height: 60, borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { maxWidth: 1200, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem' },
  navLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 },
  navTitle: { fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--primary)' },
  timerVal: { fontSize: 16, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' },
  endBtn: { marginLeft: '1rem', padding: '6px 12px', borderRadius: 6, background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 900 },
  
  main: { maxWidth: 1200, margin: '0 auto', padding: 'clamp(1rem, 5vw, 2rem)' },
  layout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' },
  
  aiSection: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  aiCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.5rem', border: '1px solid var(--border)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' },
  aiAvatar: { width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  aiInitial: { fontSize: 24, fontWeight: 900, color: 'var(--primary)' },
  statusBadge: { padding: '4px 10px', background: 'var(--surface-2)', borderRadius: 20, fontSize: 9, fontWeight: 800, color: 'var(--primary)' },
  questionCard: { background: 'linear-gradient(135deg, #2563eb, #1e4ed8)', borderRadius: 'var(--radius)', padding: '1.5rem', color: '#fff', boxShadow: 'var(--shadow-md)' },
  qText: { fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5 },
  
  inputSection: { display: 'flex', flexDirection: 'column' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' },
  modeToggle: { display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 8, gap: 4, alignSelf: 'flex-end', marginBottom: '1rem' },
  modeBtn: { width: 32, height: 32, borderRadius: 6, fontSize: 10, fontWeight: 800 },
  
  textarea: { width: '100%', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '1rem', fontSize: 15, color: 'var(--text)', outline: 'none', resize: 'none' },
  editorBox: { background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', minHeight: 200 },
  editor: { fontFamily: '"JetBrains Mono", monospace', fontSize: 13 },
  voiceInterface: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  voiceVisualizer: { display: 'flex', gap: 4 },
  vBar: { width: 3, background: 'var(--primary)', borderRadius: 2 },
  
  submitBtn: { marginTop: '1.5rem', padding: '12px', background: 'var(--primary)', color: '#fff', borderRadius: 8, fontWeight: 900, fontSize: 12 },
  feedbackArea: { marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  nextBtn: { width: '100%', background: 'var(--text)', color: '#fff', padding: '10px', borderRadius: 8, fontSize: 11, fontWeight: 900 },
  fbText: { fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-2)', background: 'var(--surface-2)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' },
  hideMobile: { display: 'block' }
}

if (typeof window !== 'undefined' && window.innerWidth <= 768) {
  s.hideMobile = { display: 'none' }
}
