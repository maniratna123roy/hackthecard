# HackTheCard

> **Your GitHub, printed as a collectible.**  
> Turn any public GitHub profile into an illustrated, high-resolution collectible card across twelve hand-crafted worlds.

---

## Highlights

- **12 Illustrated Worlds**: Hand-coded SVG vector artwork across distinct themes (Cyberpunk, Monolith, Solar, Deep Sea, Hyperdrive, Parchment, Neon Noir, Sakura, 8-Bit, Blueprint, Aurora, Glitch).
- **Real Public GitHub Intelligence**: Analyzes public repositories, commit patterns, language distributions, streaks, and repository stars/forks.
- **Deterministic Classification**: Assigns meaningful developer archetypes (e.g. *The Full-Stack Architect*, *AI Innovator*, *Systems Engineer*, *Cloud Native Builder*) based on factual code analysis—never randomness.
- **3D Interactive Card**: Realistic 3D flip card interaction with Front, Back, and Pocket Edition views.
- **High-Resolution PNG Export**: Export front, back, or pocket card at 3× resolution directly to PNG.
- **Clean Architecture**: Decoupled `frontend/` (Vite, React 19, Tailwind CSS v4) and `backend/` (Express API with rate limit handling).

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   └── card.ts           # Card generation orchestrator, archetype classifier, streaks
│   │   ├── activity.ts           # 30-day activity window & event aggregation
│   │   ├── app.ts                # Express app, middleware, routes (/api/card/:username, /api/health)
│   │   ├── cache.ts              # In-memory FIFO bounded TTL cache (500 entries)
│   │   ├── config.ts             # Scoring weights & algorithmic parameters
│   │   ├── errors.ts             # Custom HttpError class
│   │   ├── github.ts             # Resilient GitHub API client with rate limit handling
│   │   ├── languages.ts          # Parallel repo language fetch & byte-share aggregation
│   │   ├── ranking.ts            # Multi-factor repository scoring & sorting algorithm
│   │   └── server.ts             # Entry point with dotenv/config & startup rate limit check
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/                   # Favicons & static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── card/             # CollectibleCard, ThemeArt, CardLoader
│   │   │   └── landing/          # Hero, SiteHeader, Manifesto, PrivacyModal
│   │   ├── lib/
│   │   │   ├── api.ts            # Backend API client with offline fallback
│   │   │   ├── card-details.ts   # Deterministic signature & activity helpers
│   │   │   ├── github.ts         # Types, palettes, fallback client fetch
│   │   │   ├── themes.ts         # 12 thematic color & art configurations
│   │   │   └── utils.ts
│   │   ├── App.tsx               # Main application component
│   │   ├── main.tsx              # React DOM mounting
│   │   └── styles.css            # Tailwind CSS v4 & brutalist theme system
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── BACKEND.md                    # Comprehensive backend architecture & interview guide
├── AGENTS.md                     # Agent development guidelines
├── package.json                  # Root workspace scripts
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended, tested with v24)
- npm

### Installation

From the project root:

```bash
# Install frontend and backend dependencies
npm run install:all
```

### Running in Development

Run both or either service:

```bash
# Start frontend (Vite on http://localhost:5173)
npm run dev:frontend

# Start backend (Express on http://localhost:3001)
npm run dev:backend
```

> **Note**: The frontend includes an automatic fallback mechanism. If the backend is not running, it can query public GitHub endpoints directly from the browser.

### Production Build

```bash
npm run build
```

---

## Optional Environment Variables

In `backend/.env`:

```env
PORT=3001
GITHUB_TOKEN=your_personal_access_token # Increases GitHub rate limit from 60 to 5000 req/hr
```
