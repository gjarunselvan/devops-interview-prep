export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ result: 'ERROR: GROQ_API_KEY is not set.' })

  const { type, topic, level, question, answer, history, count } = req.body

  let prompt = ''

  if (type === 'question') {
    prompt = `You are a senior DevOps interviewer conducting a technical interview.

Topic: ${topic}
Candidate experience: ${level}
Question number: ${count} of 5
${history}

Generate ONE clear, specific technical interview question appropriate for this experience level and topic.
- For 0-1 years: basic concepts and definitions
- For 1-3 years: practical usage and common scenarios
- For 3-5 years: architecture decisions, troubleshooting, best practices
- For 5-8 years: system design, optimization, leadership scenarios
- For 8+ years: architecture at scale, org strategy, complex trade-offs

Return ONLY the question. No preamble, no numbering, no extra text.`
  }

  if (type === 'evaluate') {
    prompt = `You are a senior DevOps interviewer evaluating a candidate's answer.

Topic: ${topic}
Candidate experience: ${level}

Question: ${question}

Candidate's Answer: ${answer}

Evaluate the answer and respond in this exact format:

SCORE: X/10

✅ WHAT YOU GOT RIGHT
- List the correct points

❌ WHAT YOU MISSED
- List important points that were missing or wrong

💡 IDEAL ANSWER SUMMARY
A concise 3-5 sentence summary of what a great answer looks like.

📚 STUDY TIP
One specific resource or topic to study to improve on this.

Be honest, constructive and specific. Score based on the expected level (${level}).`
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
        max_tokens: 1000,
        messages: [
          { role: 'system', content: 'You are an expert DevOps interviewer with 15+ years of experience.' },
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
