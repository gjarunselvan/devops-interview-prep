import { useState, useEffect, useRef } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-clike'
import 'prismjs/themes/prism.css'

const INTERVIEWER_NAME = 'Alex'

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

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
  const [intro,     setIntro]     = useState(true)
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
    const introText = `Hello ${profile.full_name.split(' ')[0]}, I'm ${INTERVIEWER_NAME}. We'll conduct a ${interviewType} session focusing on ${topicList}.`
    if (inputMode === 'voice') {
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
    setStatus('Processing next technical prompt...')
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
          interviewType
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
      setStatus('Network interruption.')
      setLoading(false)
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    stopSpeaking()
    setLoading(true)
    setStatus('AI is analyzing your response...')
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
      setStatus('Error in evaluation.')
      setLoading(false)
    }
  }

  function handleEndSession() {
    clearInterval(timerRef.current)
    stopSpeaking()
    onComplete(historyRef.current)
  }

  return (
    <div style={s.page}>
      {/* Top Navigation */}
      <nav style={s.nav}>
        <div style={s.navContent}>
          <div style={s.navLeft}>
            <div style={s.logo}>DI</div>
            <div>
              <div style={s.navTitle}>{interviewType.toUpperCase()} SCREEN</div>
              <div style={s.navSub}>{topicList} · {level.tag}</div>
            </div>
          </div>
          <div style={s.navRight}>
            <div style={s.timerBox}>
              <span style={s.timerLabel}>ELAPSED</span>
              <span style={s.timerVal}>{fmtTime(timeTarget * 60 - timeLeft)}</span>
            </div>
            <button style={s.endBtn} onClick={handleEndSession}>END SESSION</button>
          </div>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.layout}>
          {/* Left: AI Interviewer */}
          <div style={s.aiSection}>
            <div style={s.aiCard}>
              <div style={{ ...s.aiAvatar, boxShadow: speaking ? '0 0 30px var(--primary-glow)' : 'none' }}>
                <div style={s.aiInitial}>A</div>
                {speaking && <div style={s.speakingRing} />}
              </div>
              <div style={s.aiInfo}>
                <h2 style={s.aiName}>{INTERVIEWER_NAME}</h2>
                <div style={s.aiRole}>Senior DevOps Architect</div>
              </div>
              <div style={s.statusBadge}>{status || (speaking ? 'Speaking...' : 'Listening')}</div>
            </div>

            <div style={s.questionCard}>
              <div style={s.qLabel}>QUESTION {qIndex + 1}</div>
              <p style={s.qText}>{loading && !question ? 'Calibrating next scenario...' : question}</p>
            </div>
          </div>

          {/* Right: User Input */}
          <div style={s.inputSection}>
            <div style={s.proCard}>
              <div style={s.inputHeader}>
                <h3 style={s.cardTitle}>Your Response</h3>
                <div style={s.modeToggle}>
                  {['text', 'voice', 'editor'].map(m => (
                    <button key={m} 
                      style={{ ...s.modeBtn, background: inputMode === m ? 'var(--primary)' : 'var(--surface-2)', color: inputMode === m ? '#fff' : 'var(--muted)' }}
                      onClick={() => setInputMode(m)}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {inputMode === 'text' && (
                <textarea style={s.textarea} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Articulate your approach..." rows={8} />
              )}

              {inputMode === 'editor' && (
                <div style={s.editorBox}>
                  <Editor
                    value={answer} onValueChange={c => setAnswer(c)}
                    highlight={c => highlight(c, languages.yaml)}
                    padding={20} style={s.editor}
                  />
                </div>
              )}

              {inputMode === 'voice' && (
                <div style={s.voiceInterface}>
                  <div style={s.voiceVisualizer}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ ...s.vBar, height: listening ? 20 + Math.random()*40 : 4 }} />)}
                  </div>
                  <p style={s.voiceHint}>{listening ? 'I am listening...' : 'Click the microphone to speak'}</p>
                </div>
              )}

              {feedback ? (
                <div style={s.feedbackArea}>
                  <div style={s.fbHeader}>
                    <span style={s.fbLabel}>EVALUATION COMPLETE</span>
                    <button style={s.nextBtn} onClick={() => { setFeedback(null); setAnswer(''); setQIndex(i => i + 1); loadQuestion(history) }}>NEXT QUESTION →</button>
                  </div>
                  <pre style={s.fbText}>{feedback}</pre>
                </div>
              ) : (
                <button style={{ ...s.submitBtn, opacity: !answer.trim() || loading ? 0.5 : 1 }} disabled={!answer.trim() || loading} onClick={submitAnswer}>
                  {loading ? 'ANALYZING...' : 'SUBMIT RESPONSE'}
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
  nav: { height: 80, borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { maxWidth: 1400, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' },
  navLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: { width: 36, height: 36, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 },
  navTitle: { fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--primary)' },
  navSub: { fontSize: 13, fontWeight: 600, color: 'var(--muted)' },
  timerBox: { textAlign: 'right' },
  timerLabel: { fontSize: 9, fontWeight: 900, color: 'var(--muted)', display: 'block' },
  timerVal: { fontSize: 18, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' },
  endBtn: { marginLeft: '2rem', padding: '10px 16px', borderRadius: 8, background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 900 },
  
  main: { maxWidth: 1400, margin: '0 auto', padding: '3rem 2rem' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem' },
  
  aiSection: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  aiCard: { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  aiAvatar: { width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '4px solid var(--surface-2)' },
  aiInitial: { fontSize: 40, fontWeight: 900, color: 'var(--primary)' },
  speakingRing: { position: 'absolute', width: '120%', height: '120%', border: '2px solid var(--primary)', borderRadius: '50%', opacity: 0.5, animation: 'float 2s infinite' },
  aiName: { fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 },
  aiRole: { fontSize: 13, color: 'var(--muted)', fontWeight: 600 },
  statusBadge: { marginTop: '1.5rem', padding: '6px 12px', background: 'var(--surface-2)', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--primary)' },
  
  questionCard: { background: 'linear-gradient(135deg, #2563eb, #1e4ed8)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', color: '#fff', boxShadow: '0 20px 40px var(--primary-glow)' },
  qLabel: { fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', marginBottom: '1rem', opacity: 0.8 },
  qText: { fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.5 },
  
  inputSection: { display: 'flex', flexDirection: 'column' },
  proCard: { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column' },
  inputHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  cardTitle: { fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)' },
  modeToggle: { display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 10, gap: 4 },
  modeBtn: { padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800 },
  
  textarea: { width: '100%', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.5rem', fontSize: 16, color: 'var(--text)', outline: 'none', resize: 'none', transition: 'all 0.2s' },
  editorBox: { background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', minHeight: 300 },
  editor: { fontFamily: '"JetBrains Mono", monospace', fontSize: 14 },
  voiceInterface: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' },
  voiceVisualizer: { display: 'flex', gap: 6, alignItems: 'center' },
  vBar: { width: 4, background: 'var(--primary)', borderRadius: 2, transition: 'height 0.1s ease' },
  voiceHint: { fontSize: 13, color: 'var(--muted)', fontWeight: 600 },
  
  submitBtn: { marginTop: '2rem', padding: '16px', background: 'var(--primary)', color: '#fff', borderRadius: 12, fontWeight: 900, fontSize: 14, letterSpacing: '0.1em' },
  feedbackArea: { marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' },
  fbHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  fbLabel: { fontSize: 10, fontWeight: 900, color: 'var(--green)', letterSpacing: '0.1em' },
  nextBtn: { background: 'var(--text)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 11, fontWeight: 900 },
  fbText: { fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'var(--text-2)', background: 'var(--surface-2)', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--border)' }
}
