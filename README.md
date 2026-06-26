# Karma AI Concierge

**Live weather intelligence → AI-powered resort recommendations**

A client-side demo of an end-to-end AI content pipeline for Karma Group. Fetches real weather data, builds a dynamic concierge prompt, and sends it to Google Gemini — no backend required.

## Pipeline

```
OpenWeather API  →  Prompt Builder  →  Gemini LLM  →  Display
     (Stage 1)         (Stage 2)         (Stage 3)      (Stage 4)
```

1. **Fetch weather** — Live conditions for Karma resort destinations (Bali, Goa, Vietnam, Phuket, Greece)
2. **Build prompt** — Structured concierge prompt with temperature, humidity, wind, and conditions
3. **Call LLM** — Sends prompt to Google Gemini (`gemini-2.0-flash` by default)
4. **Display** — Three panels show raw JSON, the prompt sent, and the AI response

## Getting Started

### 1. Get API keys

| Service | Sign up | Key location |
|---------|---------|--------------|
| [OpenWeather](https://openweathermap.org/api) | Free tier available | Account → API keys |
| [Google Gemini](https://aistudio.google.com/apikey) | Free tier available | Google AI Studio → Get API key |

### 2. Configure keys

Open `script.js` and replace the placeholders in the `CONFIG` object:

```javascript
const CONFIG = {
  OPENWEATHER_API_KEY: 'YOUR_OPENWEATHER_API_KEY',
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
  GEMINI_MODEL: 'gemini-2.0-flash',
  // ...
};
```

> **Note:** API keys in client-side code are visible to anyone who views the page source. This is acceptable for personal demos and GitHub Pages prototypes. For production, use a backend proxy to keep keys secret.

### 3. Run locally

No build step required.

```bash
# Option A — open directly
start index.html        # Windows
open index.html         # macOS

# Option B — local server (recommended)
python -m http.server 8080
# Visit http://localhost:8080
```

### 4. Use the app

1. Select a Karma resort destination
2. Weather loads automatically (or click **Refresh weather**)
3. Review **Raw Weather Data** and **Prompt Sent**
4. Click **Generate AI Recommendation** for AI concierge suggestions

## GitHub Pages Deployment

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to `Deploy from a branch`
4. Choose `main` branch and `/ (root)` folder
5. Save — your site will be live at `https://<username>.github.io/<repo>/`

Ensure API keys are configured in `script.js` before pushing, or add them after deployment.

## File Structure

```
karma-ai-concierge/
├── index.html      # Page structure and pipeline panels
├── style.css       # Luxury glassmorphism theme (black + gold)
├── script.js       # Weather fetch, prompt builder, Gemini integration
└── README.md       # This file
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Semantic structure |
| CSS3 | Glassmorphism, animations, responsive layout |
| Vanilla JavaScript | API calls, prompt building, DOM updates |
| OpenWeather API | Live weather data |
| Google Gemini API | LLM text generation |

No frameworks. No build tools. No backend.

## Design

| Token | Value |
|-------|-------|
| Background | `#050505` |
| Accent | `#D4AF37` (Luxury Gold) |
| Cards | Glassmorphism with 48px blur |
| Fonts | Cormorant Garamond + Inter |

## Switching Gemini Models

In `script.js`, change `CONFIG.GEMINI_MODEL`:

```javascript
GEMINI_MODEL: 'gemini-2.0-flash',
// GEMINI_MODEL: 'gemini-2.5-flash',
```

Browse available models at [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models).

## Error Handling

The app handles common failures gracefully:

- Missing or invalid API keys
- City not found (404)
- Rate limits (429)
- Network errors
- Empty AI responses

Errors appear in a dismissible banner and a detailed debug panel in the AI Response section.

---

**Karma AI Concierge** — End-to-end AI content pipeline demo for Karma Group
