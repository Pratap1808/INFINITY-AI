# ∞ INFINITY AI

A premium, futuristic, mobile-friendly AI assistant web app — chat, voice,
image understanding, OCR, web search, news, weather, multiple AI personas,
and a secure two-factor **Owner Mode** for full app control.

Built with a **Node.js + Express backend** (Gemini stays server-side only)
and a **vanilla HTML/CSS/JS frontend** — no framework, no build step, fast
to deploy, easy to customize.

---

## ✨ What's included

- Cinematic splash screen: "INFINITY AI" types in letter-by-letter, then a
  liquid/metallic logo reveal emerges from the dot of the final "I".
- Realistic animated starfield + drifting nebula glass background.
- Glassmorphism chat UI with a floating input bar that lifts above the
  mobile keyboard automatically (uses `visualViewport`).
- Gemini-powered chat with 7 built-in personas: **Assistant, Study, Coding,
  Writer, Translator, Research, Creative**.
- Voice input (Web Speech API) + text-to-speech with selectable voice and
  language — fully client-side, no extra API keys needed.
- Image understanding (send a photo to Gemini vision from the chat) and an
  **Image AI** generation tool.
- **Video AI** tool (script/storyboard generation — see note below).
- **OCR** via Tesseract.js, 100% in-browser.
- Web Search, News, and Weather tools (bring your own free API keys).
- File upload support (text-like files are read and summarized inline).
- Per-device long-term **memory**, chat **history**, **settings**, and a
  **profile** panel — all wired to a real backend.
- **Owner Mode**: password + WebAuthn device biometric (fingerprint/Face
  ID/Windows Hello) two-factor login. Once verified, the owner can change
  the app name, theme, default AI mode, and system prompt for every user —
  but the AI still refuses unsafe, illegal, privacy-invasive, or impossible
  requests, even from the owner.

> **Honesty note on scope:** "Video AI" here generates a detailed shot-by-shot
> script/storyboard with Gemini — it does not render actual video files (no
> free video-generation API exists to wire up safely). Swap in a provider of
> your choice (e.g. Runway, Luma) in `backend/routes/` if you need real
> video generation.

---

## 📁 Folder structure

```
infinity-ai/
├── backend/
│   ├── server.js                 # Express app entry point
│   ├── package.json
│   ├── .env.example              # copy to .env and fill in
│   ├── middleware/
│   │   └── auth.js               # guest + owner JWT verification
│   ├── routes/
│   │   ├── chat.js               # Gemini chat (text + vision)
│   │   ├── owner.js              # password + WebAuthn + config control
│   │   ├── config.js             # public read of owner-set defaults
│   │   ├── memory.js             # per-device long-term memory
│   │   ├── weather.js
│   │   ├── news.js
│   │   ├── search.js
│   │   ├── image.js              # Gemini image generation
│   │   └── upload.js             # file upload handling
│   ├── utils/
│   │   ├── modes.js              # AI persona system prompts
│   │   ├── safety.js             # refuses unsafe/illegal requests
│   │   ├── memoryStore.js
│   │   ├── configStore.js
│   │   └── hashPassword.js       # CLI helper to hash the owner password
│   └── data/                     # JSON "database" (gitignored)
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── splash.js             # opening animation
│   │   ├── starfield.js          # canvas star/nebula background
│   │   ├── voice.js              # speech recognition + speech synthesis
│   │   ├── owner.js              # Owner Mode client flow
│   │   └── app.js                # main app logic
│   └── assets/
│       └── logo.png              # your Infinity logo (nebula/neon design)
├── render.yaml                   # one-click Render deploy blueprint
├── .gitignore
└── README.md
```

---

## 🚀 Local setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

- `GEMINI_API_KEY` — required. Get one free at https://aistudio.google.com/app/apikey
- `OPENWEATHER_API_KEY`, `NEWS_API_KEY`, `BRAVE_SEARCH_API_KEY` — optional,
  each tool self-disables with a clear message if its key is missing.
- `JWT_SECRET`, `OWNER_JWT_SECRET` — set to any long random strings.
- `OWNER_PASSWORD_HASH` — generate with:
  ```bash
  node utils/hashPassword.js "yourStrongOwnerPassword"
  ```
  then paste the printed hash into `.env`. The plain password is never stored.
- `RP_ID` / `ORIGIN` — for WebAuthn biometrics to work, `RP_ID` must match
  your domain's hostname (`localhost` for local dev) and `ORIGIN` must be
  the exact URL the frontend is served from (WebAuthn requires HTTPS in
  production — `localhost` is exempt for local testing).

Start the server:

```bash
npm start
```

The backend also serves the frontend as static files, so once it's
running, open **http://localhost:5000** — that's the whole app.

### 2. Logo

Your neon infinity logo is already wired in at `frontend/assets/logo.png`
and used across the splash screen, header, drawer, and welcome card. To
swap it later, just replace that file (keep the same filename) — no code
changes needed.

---

## ☁️ Deploying to Render (free tier)

1. Push this project to a GitHub repo.
2. In Render: **New → Blueprint**, point it at your repo — `render.yaml`
   configures everything automatically (or create a Web Service manually
   with root directory `backend`, build command `npm install`, start
   command `npm start`).
3. Fill in the environment variables Render prompts for (the ones marked
   `sync: false` in `render.yaml`): `GEMINI_API_KEY`, `OWNER_PASSWORD_HASH`,
   `RP_ID` (your Render subdomain, e.g. `infinity-ai.onrender.com`),
   `ORIGIN` (`https://infinity-ai.onrender.com`), `CLIENT_ORIGIN` (same),
   and any optional data-service keys.
4. Deploy. Render's free tier serves both API and frontend from one service.

> **Persistence note:** Render's free tier has an ephemeral filesystem, so
> the simple JSON-file memory/config store in `backend/data/` resets on
> redeploy or restart. For persistent memory across deploys, swap
> `memoryStore.js` / `configStore.js` for a real database (e.g. MongoDB
> Atlas free tier) — the function signatures are designed to make that a
> drop-in change.

---

## 🔐 Security notes

- Gemini and all other API keys live **only** in backend environment
  variables — never sent to or exposed in the frontend.
- Owner login is two-factor: a bcrypt-hashed password **and** a WebAuthn
  platform authenticator (fingerprint/Face ID/Windows Hello). Only the
  public key and credential ID are stored — raw biometric data never
  leaves the user's device, by design of the WebAuthn standard.
- Owner and guest sessions use short-lived, signed JWTs. The owner token
  is kept in `sessionStorage` (cleared when the browser session ends), not
  `localStorage`.
- `backend/utils/safety.js` blocks clearly unsafe/illegal/privacy-invasive
  requests before they reach the model — this applies even in Owner Mode,
  since Owner Mode controls app configuration, not safety boundaries.
- Basic rate limiting (60 req/min/IP) and `helmet` security headers are
  enabled by default.

---

## 📱 Turning this into an Android APK (no Android Studio needed)

The frontend now includes `manifest.json` + `service-worker.js`, so it's a
real installable PWA. Steps:

1. Push this project to GitHub.
2. Deploy the **backend** (which also serves the frontend) to Render — see
   the deployment section above. You'll get a live HTTPS URL like
   `https://infinity-ai.onrender.com`.
3. Go to **https://www.pwabuilder.com**, paste that live URL (not the
   GitHub link — PWABuilder needs the working website, not the source
   code), and let it scan. It will detect `manifest.json` and the service
   worker automatically.
4. Click **"Package for Android"** → download the signed APK/AAB, free,
   no Android Studio required.

> Note: `RP_ID` and `ORIGIN` in your backend `.env` must match your live
> Render URL exactly, or Owner Mode's biometric login won't work inside
> the packaged app.

---

## 🎨 Customizing the look

All design tokens (colors, fonts, radii) live at the top of
`frontend/css/style.css` as CSS custom properties, and the Owner can also
switch between three built-in themes (Nebula Violet / Aurora Cyan / Solar
Magenta) live from Owner Mode → Theme, with no redeploy needed.
