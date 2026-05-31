export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ result: 'ERROR: GROQ_API_KEY is not set.' })

  const { type, topics, level, history, question, answer, interviewType, difficulty } = req.body

  let systemPrompt = ''
  let userPrompt = ''

  if (type === 'question') {
    systemPrompt = `You are Alex, a Senior DevOps Architect and Interviewer. You are conducting a high-stakes technical interview.
    
    Candidate Seniority: ${level.tag || level.label}
    Target Track: ${interviewType}
    Difficulty: ${difficulty}
    Primary Topics: ${topics || 'Full DevOps Lifecycle'}

    INTERVIEW TRACK RULES:
    - technical: Focus on internal mechanics, trade-offs, and deep tool logic (AWS, K8s, Terraform, etc).
    - coding: Ask the candidate to write manifests (K8s YAML, TF), Dockerfiles, or Python/Bash scripts. Provide a complex scenario or skeleton.
    - behavioral: Focus on Incident Management, Blameless Culture, STAR method, and SRE principles.
    - surprise: Pull from ANY domain (Technical, Coding, OR Leadership) unexpectedly. Be unpredictable and difficult.
    - mixed: A balanced blend of all tracks.

    DIFFICULTY CALIBRATION:
    - easy: Fundamentals, basic CLI, core concepts.
    - medium: Multi-service architecture, performance optimization, standard troubleshooting.
    - hard: Petabyte-scale challenges, security hardening, high-availability tradeoffs, and deep internal code logic.

    Do not repeat these previous questions: ${history}.
    Keep the tone professional yet immersive.`

    userPrompt = `Generate the next technical scenario. If track is 'coding' or 'surprise', prioritize code-based challenges.`
  } else {
    systemPrompt = `You are a Technical Evaluator. Rigorously evaluate the candidate's answer for a ${level.label} role (${difficulty} difficulty).
    Question: ${question}
    Answer: ${answer}

    Evaluation Format:
    - Score (X/10)
    - What was done well
    - What was missed (be specific)
    - 📈 POINTS TO IMPROVE: (List as bullet points starting with '-')`
    
    userPrompt = `Perform a deep technical evaluation.`
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    const data = await response.json()
    if (data.error) return res.status(500).json({ result: `Error: ${data.error.message}` })
    const text = data.choices?.[0]?.message?.content || 'No response.'
    res.status(200).json({ result: text })
  } catch (err) {
    res.status(500).json({ result: `Server error: ${err.message}` })
  }
}
