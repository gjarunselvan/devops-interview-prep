export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ result: 'ERROR: GROQ_API_KEY is not set.' })

  const { resumeText } = req.body
  if (!resumeText) return res.status(400).json({ result: 'ERROR: No resume text provided.' })

  const prompt = `You are a technical career coach and DevOps expert. 
Analyze the following resume text and identify the candidate's core skills, strengths, and most importantly, recommend a "Tech Stack" focus and specific courses/topics to learn.

Resume Text:
${resumeText}

Respond in EXACTLY this JSON format:
{
  "summary": "2-3 sentence overview of their experience",
  "skills": ["Skill 1", "Skill 2", ...],
  "recommendedTopics": ["topic_id1", "topic_id2", ...],
  "experienceLevel": "Junior/Mid/Senior/Architect",
  "suggestedCourses": ["Course or deep-dive topic 1", "Course or deep-dive topic 2", ...]
}

Use these IDs for recommendedTopics where applicable: aws, gcp, azure, kubernetes, docker, helm, argocd, terraform, ansible, linux, cicd, jenkins, git, monitoring, prometheus, elk, security, vault, mlops.`

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
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: 'You are a career assistant that outputs structured JSON.'
          },
          { role: 'user', content: prompt }
        ]
      })
    })

    const data = await response.json()
    if (data.error) return res.status(500).json({ result: `Groq API Error: ${data.error.message}` })
    const text = data.choices?.[0]?.message?.content || '{}'
    res.status(200).json({ result: JSON.parse(text) })
  } catch (err) {
    res.status(500).json({ result: `Server error: ${err.message}` })
  }
}
