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
    systemPrompt = `You are Alex, a Senior DevOps Architect and Interviewer. You are conducting a high-stakes ${interviewType} interview.
    
    Candidate Seniority: ${level?.tag || level?.label || 'Senior'}
    Target Track: ${interviewType}
    Difficulty: ${difficulty || 'medium'}
    Primary Topics: ${topics || 'Full DevOps Lifecycle'}

    STRICT TRACK RULES (YOU MUST FOLLOW THESE):
    - 'technical' (Mastery): DO NOT ASK FOR CODE OR MANIFESTS. Focus on architecture, internal tool mechanics, trade-offs, and high-level design. 
      Ask "How would you design...?" or "What is the underlying mechanic of...?" or "Compare approach A vs B."
    - 'coding' (Implementation): ALWAYS ASK FOR CODE. Focus on K8s YAML, Terraform, Dockerfiles, Python, or Bash. Provide a scenario and ask for the code solution.
    - 'behavioral' (Leadership): NO TECHNICAL QUESTIONS. Focus on soft skills, SRE culture, incident management, conflict resolution, and the STAR method.
    - 'surprise' (Extreme): Randomly pick between Technical, Coding, or Behavioral. Be unpredictable.
    - 'mixed': A natural rotation of the above tracks.

    DIFFICULTY CALIBRATION:
    - easy: Core concepts, basic definitions.
    - medium: Real-world scenarios, troubleshooting, optimization.
    - hard: Petabyte-scale, high-availability tradeoffs, deep internal logic, complex security hardening.

    Do not repeat these previous questions: ${history}.
    Keep the tone professional yet immersive.`

    userPrompt = `Generate the next interview scenario for the '${interviewType}' track. Remember: if track is 'technical', do NOT ask for code manifests.`
  } else {
    systemPrompt = `You are a Technical Evaluator. Rigorously evaluate the candidate's answer for a ${level?.label || 'Senior'} role (${difficulty || 'medium'} difficulty).
    Track: ${interviewType}
    Question: ${question}
    Answer: ${answer}

    Evaluation Format:
    - Score (X/10)
    - What was done well
    - What was missed (be specific)
    - 📈 POINTS TO IMPROVE: (List as bullet points starting with '-')`
    
    userPrompt = `Perform a deep technical evaluation of the answer.`
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
