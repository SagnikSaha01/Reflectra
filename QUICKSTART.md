# MindTime - Quick Start Guide

Get MindTime up and running in 5 minutes!

---

## Prerequisites

- Node.js 18+ installed
- Chrome browser
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

---

## Installation Steps

### 1. Backend Setup (2 minutes)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

Start the backend:
```bash
npm run dev
```

You should see: `🧠 MindTime backend running on http://localhost:3000`

---

### 2. Dashboard Setup (1 minute)

Open a new terminal:

```bash
cd dashboard
npm install
npm run dev
```

Visit http://localhost:3001 in your browser.

---

### 3. Chrome Extension (2 minutes)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `chrome-extension` folder
5. Pin the extension to your toolbar (🧩 icon)

---

## Test It Out

1. Browse a few websites (GitHub, YouTube, news sites)
2. Wait 30 seconds
3. Open the MindTime popup (click the icon)
4. Check the dashboard at http://localhost:3001

---

## Trigger Categorization

Sessions start as "Uncategorized". To categorize them:

```bash
curl -X POST http://localhost:3000/api/sessions/categorize
```

Or wait 15 minutes for automatic categorization.

---

## Common Issues

**Backend won't start?**
- Make sure you ran `npm install` in the `backend` folder
- Check that your `.env` file has a valid OpenAI API key

**Dashboard showing errors?**
- Make sure the backend is running on port 3000
- Check browser console for error messages

**Extension not tracking?**
- Make sure it's enabled in `chrome://extensions/`
- Check that the backend is running

---

## Next Steps

- Browse normally and collect data
- Explore the Dashboard visualizations
- Try asking reflection questions
- Read the full [README.md](README.md) and [SETUP.md](docs/SETUP.md)

**Happy tracking! 🧠**
