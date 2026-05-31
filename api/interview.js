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
    systemPrompt = `You are a Senior DevOps Interviewer named Alex. You are conducting a ${interviewType} interview at a ${difficulty} difficulty level for a candidate with ${level} seniority. 
    Focus on these topics: ${topics}.
    
    Current Interview Type: ${interviewType}
    - Technical: Focus on deep tool knowledge, architecture, and troubleshooting.
    - Behavioral: Focus on SRE culture, incident management, and STAR method.
    - Coding: Focus on writing manifests (K8s, Terraform), Dockerfiles, or automation scripts (Python/Bash). Provide a "SKELETON" or "PROBLEM DESCRIPTION" and ask the candidate to complete it.
    - Mixed: A blend of the above.
    
    Difficulty Calibration (${difficulty}):
    - Easy: Fundamental concepts, simple commands, basic logic.
    - Medium: Multi-service architecture, optimization, complex troubleshooting.
    - Hard: High-scale system design, security hardening, complex automation, and deep internal mechanics.
    
    Seniority Calibration (${level}):
    - Academic/Junior: Learning capacity and core understanding.
    - Principal/Architect/Fellow: Strategy, trade-offs, security, and organizational impact.

    Maintain a professional, conversational tone. Do not repeat questions from history: ${history}`

    userPrompt = `Generate the next interview scenario. If this is a 'Coding' or 'Mixed' session and appropriate, provide a technical problem requiring a code/manifest response.`
  } else {
    systemPrompt = `You are an expert technical evaluator. Evaluate the candidate's response to the following interview question.
    Seniority: ${level}
    Difficulty: ${difficulty}
    Question: ${question}
    Answer: ${answer}

    Provide a score (X/10), what they did well, what they missed, and specific technical points to improve.`
    
    userPrompt = `Evaluate this answer rigorously based on ${level} seniority and ${difficulty} difficulty.`
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
