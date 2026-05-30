export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ result: 'ERROR: GROQ_API_KEY is not set.' })

  const { type, topics, level, question, answer, history, count } = req.body

  let prompt = ''

  if (type === 'question') {
    prompt = `You are a senior DevOps interviewer conducting a technical interview.

Topics pool: ${topics}
Candidate experience: ${level}
Question number: ${count}
Previously asked questions: ${history || 'none'}

Generate ONE clear, specific, unique technical interview question from the topics pool.
Rotate across topics — don't repeat the same topic consecutively.

Experience calibration:
- 0-1 yrs: basic concepts, definitions, simple commands
- 1-3 yrs: practical usage, common scenarios, basic troubleshooting
- 3-5 yrs: architecture decisions, best practices, real troubleshooting
- 5-8 yrs: system design, optimization, trade-offs, leadership
- 8+ yrs: org-level strategy, architecture at scale, complex trade-offs

Return ONLY the question. No preamble, no numbering, no extra text.`
  }

  if (type === 'evaluate') {
    prompt = `You are a senior DevOps interviewer evaluating a candidate's answer.

Topics: ${topics}
Candidate experience: ${level}
Question: ${question}
Candidate's Answer: ${answer}

Evaluate and respond in EXACTLY this format:

SCORE: X/10

✅ WHAT YOU GOT RIGHT
- point 1
- point 2

❌ WHAT YOU MISSED
- point 1
- point 2

💡 IDEAL ANSWER SUMMARY
2-4 sentences of what a great answer looks like.

📈 POINTS TO IMPROVE
- specific topic or concept to study
- specific topic or concept to study

Be honest, specific and constructive. Score relative to expected level (${level}).`
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
        max_tokens: 1024,
        messages: [
          { role: 'system', content: 'You are an expert DevOps interviewer with 15+ years of hands-on experience across cloud, containers, CI/CD, and infrastructure.' },
          { role: 'user', content: prompt }
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
