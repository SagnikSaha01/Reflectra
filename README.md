<img width="1025" height="268" alt="image" src="https://github.com/user-attachments/assets/d726efe8-212b-4bf6-9e4c-1cfe08f18961" />

# Reflectra - Digital Wellness Tracker

**Transform your browsing data into self-awareness**

Reflectra is a Chrome extension that tracks your online behavior and helps you understand your digital well-being through AI-powered insights and reflective analytics.

---

## 🎯 Project Overview

Reflectra moves beyond traditional productivity tracking to focus on **digital wellness**. Instead of judging you for "wasted time," it helps you:

- Understand your browsing *intent* (Learning, Relaxation, Focus, etc.)
- Reflect on your digital behavior patterns
- Ask conversational questions like "What did I learn today?"
- Build awareness without productivity pressure

---

## 🏗️ Architecture

```
┌─────────────────────┐
│  Chrome Extension   │  Tracks tabs, URLs, time spent
│  (manifest v3)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Backend API       │  Stores data, categorizes sessions
│   (Node/Express)    │  Generates insights with AI
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Dashboard         │  Visualizes wellness metrics
│   (React + Vite)    │  Reflection chat interface
└─────────────────────┘
```

---

## 📂 Project Structure

```
Reflectra/
├── chrome-extension/      # Chrome extension (manifest v3)
│   ├── manifest.json      # Extension configuration
│   ├── background.js      # Service worker for tab tracking
│   ├── content.js         # Content script (future: engagement tracking)
│   ├── popup.html         # Extension popup UI
│   └── popup.js           # Popup logic
│
├── backend/               # Node.js API server
│   ├── server.js          # Express server setup
│   ├── db/
│   │   ├── database.js    # Supabase database connection
│   │   └── supabase-migrations/  # SQL migration files
│   ├── routes/
│   │   ├── sessions.js    # Session CRUD operations
│   │   ├── stats.js       # Statistics and analytics
│   │   ├── reflection.js  # AI reflection endpoints
│   │   └── categories.js  # Category management
│   ├── services/
│   │   ├── categorization.js  # LLM-based session categorization
│   │   ├── reflection.js      # RAG-powered reflection AI
│   │   └── wellness.js        # Wellness score calculation
│   ├── .env               # Environment variables
│   └── package.json
│
├── dashboard/             # React web dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Main analytics view
│   │   │   ├── Reflection.jsx  # AI reflection chat
│   │   │   └── History.jsx     # Session history
│   │   ├── components/
│   │   │   └── Layout.jsx      # App layout/navigation
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── docs/
    ├── SETUP.md           # Setup instructions
    └── SUPABASE_SETUP.md  # Supabase database setup guide
```

---

## ✨ Features

### ✅ MVP Features (Included)

1. **Chrome Extension Tab Tracking**
   - Automatic tracking of active tab changes
   - URL, title, timestamp, duration capture
   - Local storage backup + API sync

2. **AI-Powered Categorization**
   - LLM classifies browsing intent into wellness categories:
     - Focused Work, Learning, Research
     - Social Connection, Relaxation
     - Mindless Scroll, Communication

3. **Wellness Dashboard**
   - Daily wellness score (0-100)
   - Time distribution by category (pie chart)
   - Session history with category tags

4. **Reflection Chat (RAG)**
   - Ask: "What did I learn today?"
   - Ask: "Summarize my browsing patterns"
   - AI generates insights from your actual data

5. **Supabase Cloud Database**
   - Stores sessions, categories, wellness scores
   - Reflection history
   - Cloud-hosted PostgreSQL

### 🔮 Future Enhancements

- Weekly email summaries
- Engagement metrics (scroll depth, idle time)
- Browser notification nudges
- Export data to CSV/JSON
- Multi-browser support

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Chrome browser
- Supabase account (free tier available)
- OpenAI API key (or Anthropic Claude API key)
- Pinecone account (serverless index for vector search)

### Installation

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions and [docs/PINECONE_SETUP.md](docs/PINECONE_SETUP.md) to connect the Pinecone vector database.

**Quick Start:**

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Set up Supabase database
# - Create a Supabase project at https://supabase.com
# - Run the migration SQL from backend/db/supabase-migrations/001_initial_schema.sql
# - Get your credentials from Supabase dashboard

# 3. Configure environment variables
# Edit backend/.env and add:
# - SUPABASE_URL
# - SUPABASE_KEY
# - OPENAI_API_KEY

# 4. Start backend server
npm run dev

# 5. Install dashboard dependencies
cd ../dashboard
npm install

# 6. Start dashboard
npm run dev

# 7. Load Chrome extension
# - Open chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select the chrome-extension/ folder
```

---

## 🧪 Tech Stack

| Layer | Technology | Why? |
|-------|-----------|------|
| Extension | Chrome Manifest V3 | Required for modern Chrome extensions |
| Backend | Node.js + Express | Fast, simple API server |
| Database | Supabase (PostgreSQL) | Cloud-hosted, real-time, free tier |
| AI | OpenAI GPT-4o-mini | Categorization + RAG reflection |
| Frontend | React + Vite | Fast dev experience, modern UI |
| Charts | Recharts | Beautiful, customizable charts |

---

## 📊 Database Schema

**sessions** - Individual browsing sessions
```sql
id, url, title, duration, timestamp, category_id
```

**categories** - Wellness categories
```sql
id, name, description, color, wellness_type
```

**wellness_scores** - Daily wellness metrics
```sql
id, date, score, focus_time, learning_time, rest_time, social_time, mindless_time
```

**reflections** - AI-generated reflections
```sql
id, query, response, context, timestamp
```

---

## 🤖 AI Components

### 1. Categorization AI
Uses OpenAI GPT-4o-mini to classify browsing intent based on URL + page title.

**Example:**
```
Input: "github.com/user/repo" + "Feature implementation PR"
Output: "Focused Work"
```

### 2. Reflection AI (RAG)
Retrieves relevant session data and generates conversational insights.

**Example:**
```
User: "What did I learn today?"
AI: "Today you spent 45 minutes on React documentation,
     20 minutes reading about Docker containers, and
     15 minutes exploring TypeScript best practices..."
```

---

## 🎨 Design Philosophy

**Wellness, not Productivity**

Reflectra is designed to:
- ✅ Build self-awareness
- ✅ Encourage balanced digital habits
- ✅ Support reflection without judgment
- ❌ NOT shame you for "unproductive" time
- ❌ NOT gamify productivity metrics

**Privacy-First**

- All data stored in your own Supabase account
- No third-party analytics
- You control your data

---

## 📝 License

MIT License - Feel free to use, modify, and distribute.

---

## 🙏 Acknowledgments

Built for the DukeAI Hackathon 2025.

Inspired by the need for more mindful digital experiences.

---

## 🐛 Known Issues / Limitations

- Chrome extension only (no Firefox/Safari yet)
- Categorization requires OpenAI API (costs ~$0.001 per session)
- No mobile support
- Wellness score algorithm is opinionated (customizable in future)

---

## 📧 Contact

Questions? Suggestions? Open an issue or reach out!

**Made with 🧠 for digital well-being**
