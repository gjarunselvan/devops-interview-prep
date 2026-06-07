<div align="center">
  <img src="https://capsule-render.vercel.app/render?type=waving&color=auto&height=250&section=header&text=DevOps%20Interview%20Prep&fontSize=70&animation=fadeIn&fontAlignY=38" />

  <p><b>AI-Powered High-Stakes Simulation Platform for DevOps Architects & Engineers</b></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
    <img src="https://img.shields.io/badge/Groq-f3d53f?style=for-the-badge&logo=openai&logoColor=black" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </p>
</div>

---

## 🧠 What is this?

> **Elevate your DevOps career.** This platform provides an immersive, AI-driven environment to practice technical, coding, and behavioral interviews specifically tailored for the DevOps ecosystem.

| Feature | Description |
| :--- | :--- |
| 🎙️ **Live Simulation** | Real-time AI interviewer with voice support and dynamic feedback. |
| 🛠️ **Tech Tracks** | Focus on Architecture (Technical), Implementation (Coding), or Leadership (Behavioral). |
| 📊 **Deep Evaluation** | Detailed scoring (0-10) with specific improvement points and study recommendations. |
| 🗺️ **Roadmap Gen** | Automated, personalized 7-day study plans based on your performance. |
| 🔐 **Secure Auth** | Integrated Supabase authentication for profile tracking and history. |

---

## 🚀 How it Works

The platform utilizes **Llama 3.3 70B** via the **Groq LPU** for ultra-fast, intelligent interview scenarios.

```text
[ User Input ] ────► [ Vercel Edge Function ] ────► [ Groq AI (Llama 3.3) ]
      ▲                        │                           │
      │                        ▼                           ▼
[ Dashboard ] ◄──── [ Supabase Database ] ◄──── [ Structured Evaluation ]
```

---

## 📦 Project Structure

```bash
├── 📁 api/              # Serverless Functions (Backend Logic)
│   ├── analyze-resume.js
│   ├── interview.js     # AI Interview Engine
│   └── roadmap.js       # Study Plan Generator
├── 📁 public/           # Static Assets
├── 📁 src/              # React Frontend
│   ├── 📁 components/   # Modular UI Elements
│   ├── App.jsx          # Core Routing & State
│   └── supabase.js      # Database Client
├── .env.example         # Environment Template
└── vite.config.js       # Build Configuration
```

---

## 🛠️ Getting Started

### 1️⃣ Prerequisites
- **Node.js** (v18+)
- **Vercel CLI** (`npm i -g vercel`)
- **Groq API Key** ([Get it here](https://console.groq.com/))
- **Supabase Project** ([Create one here](https://supabase.com/))

### 2️⃣ Installation
```bash
# Clone the repo
git clone https://github.com/gjarunselvan/devops-interview-prep.git

# Enter the directory
cd devops-interview-prep

# Install dependencies
npm install
```

### 3️⃣ Configuration
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
GROQ_API_KEY=your_groq_api_key
```

### 4️⃣ Local Development
To enable both the frontend and the AI backend, use the Vercel CLI:
```bash
vercel dev
```
> ⚠️ **Note:** Standard `npm run dev` will not serve the `/api` routes!

---

## 📝 Troubleshooting

### 🔍 "Groq API Error: Invalid API Key"
If you encounter this error, it means your `GROQ_API_KEY` is invalid or has expired.
- **Solution:** Generate a new key at [console.groq.com/keys](https://console.groq.com/keys) and update your `.env`.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ❤️ by <b>Arun Selvan</b></p>
  <a href="https://linkedin.com/in/gjarunselvan"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" /></a>
  <a href="https://github.com/gjarunselvan"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" /></a>
</div>
