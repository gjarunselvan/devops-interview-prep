export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ result: 'ERROR: GROQ_API_KEY is not set.' })

  const { profile, recentSessions, studyTimePref } = req.body

  const prompt = `You are a DevOps Mentor. Create a personalized study roadmap for a candidate.

Candidate Profile:
- Level: ${profile.experienceLevel || 'Not specified'}
- Recommended Skills: ${profile.suggested_skills?.join(', ') || 'General DevOps'}
- Time Availability: ${studyTimePref} hours per week

Recent Performance/Weak Points:
${recentSessions?.map(s => `- Avg Score: ${s.avg_score}/10, Points to improve: ${s.improve_points?.join(', ')}`).join('\n') || 'No recent sessions.'}

Create a structured study plan for 1 week.

Respond in EXACTLY this JSON format:
{
  "focus": "Overall focus of the week",
  "days": [
    { "day": "Monday", "tasks": ["Task 1", "Task 2"], "resourceHint": "Topic to search for" },
    ...
  ]
}`

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
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: 'You are a DevOps mentor that outputs structured JSON.'
          },
          { role: 'user', content: prompt }
        ]
      })
    })

    const data = await response.json()
    if (data.error) return res.status(500).json({ result: `Error: ${data.error.message}` })
    const text = data.choices?.[0]?.message?.content || '{}'
    res.status(200).json({ result: JSON.parse(text) })
  } catch (err) {
    res.status(500).json({ result: `Server error: ${err.message}` })
  }
}
