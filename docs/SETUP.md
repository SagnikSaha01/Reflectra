# MindTime Setup Guide

Complete setup instructions to get MindTime running on your machine.

---

## Prerequisites

### Required Software
- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Google Chrome** browser
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

### Optional
- **Anthropic API Key** (alternative to OpenAI)
- **Git** (for version control)

---

## Step 1: Clone the Repository

```bash
cd ~/Desktop/DukeAI2025
git clone <repository-url>
cd Reflectra
```

Or if you already have the project folder, just navigate to it:

```bash
cd c:/Users/saha_/Desktop/DukeAI2025/Reflectra
```

---

## Step 2: Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment Variables

```bash
# Copy the example .env file
cp .env.example .env

# Open .env in your text editor
# On Windows:
notepad .env

# On Mac/Linux:
nano .env
```

**Edit the .env file:**

```env
PORT=3000
DATABASE_PATH=./data/mindtime.db
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

> **Important:** Replace `sk-your-actual-api-key-here` with your real OpenAI API key!

### Start the Backend Server

```bash
# Development mode (auto-restarts on changes)
npm run dev

# Or production mode
npm start
```

You should see:
```
🧠 MindTime backend running on http://localhost:3000
```

**Test the backend:**

Open http://localhost:3000/health in your browser. You should see:

```json
{"status":"healthy","timestamp":"2025-..."}
```

---

## Step 3: Dashboard Setup

Open a **new terminal** (keep the backend running).

### Install Dependencies

```bash
cd dashboard
npm install
```

### Start the Dashboard

```bash
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:3001/
```

**Open the dashboard:**

Visit http://localhost:3001 in your browser.

---

## Step 4: Chrome Extension Setup

### Load the Extension

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Navigate to your project folder and select the `chrome-extension` folder
6. Click **"Select Folder"**

The MindTime extension should now appear in your extensions list!

### Pin the Extension

1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find "MindTime - Digital Wellness Tracker"
3. Click the pin icon to keep it visible

### Test the Extension

1. Click the MindTime icon in your toolbar
2. You should see a popup with your daily stats (will show 0 initially)
3. Browse a few websites and wait ~30 seconds
4. Check the popup again - you should see session data

---

## Step 5: Verify Everything Works

### Test Flow

1. **Browse some websites** (e.g., GitHub, YouTube, news sites)
2. **Wait 15-30 seconds** between page changes
3. **Open the dashboard** (http://localhost:3001)
4. You should see:
   - Sessions appearing in the History page
   - Categories showing "Uncategorized" initially

### Trigger Categorization

After accumulating a few sessions:

```bash
# In a new terminal
curl -X POST http://localhost:3000/api/sessions/categorize
```

Or wait 15 minutes for automatic categorization.

### Test Reflection Chat

1. Go to the **Reflection** tab in the dashboard
2. Ask: "What did I browse today?"
3. You should get an AI-generated response based on your sessions

---

## Troubleshooting

### Backend won't start

**Error:** `Cannot find module 'express'`
- **Solution:** Run `npm install` in the `backend` folder

**Error:** `OPENAI_API_KEY is not defined`
- **Solution:** Make sure your `.env` file exists and has a valid API key

### Dashboard won't start

**Error:** `Failed to resolve import`
- **Solution:** Run `npm install` in the `dashboard` folder

### Extension not tracking

**Check the console:**
1. Right-click the extension icon → **Inspect popup**
2. Look for errors in the console

**Check background service worker:**
1. Go to `chrome://extensions/`
2. Click **"Inspect views: service worker"** under MindTime
3. Look for errors or session logs

**Common issue:** Extension disabled
- Make sure the extension is enabled in `chrome://extensions/`

### Categorization not working

**Error:** `Failed to categorize`
- Check your OpenAI API key is valid
- Check you have credits in your OpenAI account
- Look at backend logs for detailed errors

### Database errors

**Error:** `SQLITE_ERROR: no such table`
- The database auto-initializes on first run
- Check that `backend/data/` folder exists
- Delete `backend/data/mindtime.db` and restart the backend

---

## Development Tips

### Hot Reload

- **Backend:** Uses `nodemon` - changes auto-reload
- **Dashboard:** Uses Vite - changes reflect instantly
- **Extension:** Requires manual reload:
  1. Go to `chrome://extensions/`
  2. Click the refresh icon on MindTime extension

### Viewing Logs

**Backend logs:**
```bash
# The terminal where you ran `npm run dev`
```

**Extension logs:**
```
chrome://extensions/ → Inspect views → service worker
```

**Dashboard logs:**
```
Browser DevTools (F12) → Console
```

### Database Inspection

Install a SQLite browser:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- Open `backend/data/mindtime.db`

---

## Production Deployment (Optional)

### Backend

```bash
cd backend
npm start
```

Deploy to:
- Heroku
- Railway
- DigitalOcean
- Your own VPS

### Dashboard

```bash
cd dashboard
npm run build
```

Deploy `dist/` folder to:
- Vercel
- Netlify
- GitHub Pages

### Extension

Package for Chrome Web Store:
1. Update `manifest.json` with production API URL
2. Zip the `chrome-extension` folder
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Backend server port |
| `DATABASE_PATH` | ./data/mindtime.db | SQLite database location |
| `OPENAI_API_KEY` | (required) | OpenAI API key for AI features |
| `OPENAI_MODEL` | gpt-4o-mini | Model to use for categorization |
| `BATCH_CATEGORIZE_INTERVAL` | 15 | Minutes between auto-categorization |
| `FOCUS_WEIGHT` | 0.3 | Weight for focus time in wellness score |
| `LEARNING_WEIGHT` | 0.25 | Weight for learning time |
| `REST_WEIGHT` | 0.25 | Weight for rest time |
| `SOCIAL_WEIGHT` | 0.2 | Weight for social time |

---

## Next Steps

1. ✅ Start browsing and collecting data
2. ✅ Explore the dashboard visualizations
3. ✅ Try asking reflection questions
4. ✅ Customize wellness categories
5. ✅ Adjust wellness score weights in `.env`

---

## Getting Help

- Check the main [README.md](../README.md)
- Review code comments
- Open an issue on GitHub

**Happy tracking! 🧠**
