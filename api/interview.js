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
    prompt = `You are Alex, a senior DevOps engineer conducting a technical job interview.

Topics pool: ${topics}
Candidate experience level: ${level}
Question number: ${count}
Previously asked questions: ${history || 'none'}

Generate ONE clear technical interview question. Rotate across different topics from the pool.

Calibrate difficulty to experience level:
- 0-1 years: fundamentals, definitions, basic commands
- 1-3 years: practical usage, common workflows, basic troubleshooting
- 3-5 years: architecture, best practices, real-world troubleshooting
- 5-8 years: system design, optimization, trade-offs, team/org scenarios
- 8+ years: org strategy, large-scale architecture, complex engineering decisions

Return ONLY the question text. No greeting, no numbering, no preamble.`
  }

  if (type === 'evaluate') {
    prompt = `You are Alex, a senior DevOps engineer evaluating a candidate's interview answer.

Topics: ${topics}
Candidate level: ${level}
Question asked: ${question}
Candidate's answer: ${answer}

Evaluate and respond in EXACTLY this format (use these exact emoji headers):

SCORE: X/10

✅ WHAT YOU GOT RIGHT
- List correct and strong points

❌ WHAT YOU MISSED
- List missing or incorrect points

💡 IDEAL ANSWER SUMMARY
Write 3-5 sentences summarizing what a strong answer looks like.

📈 POINTS TO IMPROVE
- Specific topic or concept to study
- Specific topic or concept to study

Be honest, constructive, and specific. Calibrate scoring to the expected level: ${level}.
If the answer is blank or irrelevant, score it 0 and explain what was expected.`
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
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are Alex, an experienced senior DevOps engineer and interviewer with 15+ years of hands-on experience across cloud infrastructure, containers, CI/CD, and platform engineering. You are professional, fair, and constructive.'
          },
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
