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

## Why HackTheCard?

Traditional developer portfolios and GitHub stat cards are often dry, tabular, and spreadsheet-like. They reduce years of software craftsmanship down to raw counts of commits and PRs without context.

**HackTheCard** reimagines developer identity as a **physical-grade digital collectible**. It extracts the real substance of your public GitHub work—architectural scope, language balance, maintenance recency, and project quality—and synthesizes it into an illustrated trading card across 12 hand-crafted vector worlds.

---

## The Engineering Approach

### 1. Multi-Factor Repository Ranking (Why not just sort by stars?)
Sorting repositories purely by stars favors ancient, unmaintained repositories or single virally shared gists over current, production-grade systems. HackTheCard implements a multi-factor deterministic scoring algorithm evaluating 5 distinct dimensions:

$$\text{Final Score} = 100 \times \left[ 0.30 \cdot S_{\text{stars}} + 0.30 \cdot S_{\text{recency}} + 0.10 \cdot S_{\text{forks}} + 0.15 \cdot S_{\text{substance}} + 0.15 \cdot S_{\text{presentation}} \right]$$

- **Logarithmic Star Scaling ($30\%$)**: Uses $\frac{\log_{10}(1 + \text{stars})}{\log_{10}(1 + \max(1, \text{maxStars}))}$. Compresses power-law distributions so a 10,000-star repo doesn't permanently dwarf a developer's other high-quality work. Evaluated relative to the developer's *personal maximum* so juniors and seniors are scored meaningfully on their own scale.
- **Exponential Recency Decay ($30\%$)**: Uses $\exp(-\text{days} / 180)$ with a 180-day time constant $\tau$ (effective half-life $t_{1/2} \approx 125 \text{ days}$). Active code is prioritized over abandoned codebases.
- **Code Substance Ceiling ($15\%$)**: Uses $\min(\text{size\_kb} / 500, 1.0)$. Filters out empty scratch repos and single-file gists, while capping at $500 \text{ KB}$ to prevent repos bloated with binary assets from dominating.
- **Presentation & Documentation ($15\%$)**: Grants points for thoughtful descriptions ($+0.5$) and live homepage/demo URLs ($+0.5$).
- **Archived Penalty ($\times 0.5$) & Fork Exclusion**: Read-only archived repositories receive an immediate 50% score penalty, and forks are excluded so credit is only assigned to original creations.

### 2. Deterministic Archetype Classification (Why not an LLM?)
Rather than sending profile data to an LLM—which adds 1–3 seconds of latency, ongoing API cost, and non-deterministic title shifts between page reloads—HackTheCard uses a **pure, rule-based classification cascade**.

It analyzes language byte shares across codebases and verified keywords in repository names, descriptions, and topics:
- **The Full-Stack Architect**: Balanced polyglot profile with $\ge 25\%$ frontend languages and $\ge 25\%$ backend languages.
- **AI Innovator**: $\ge 20\%$ of repositories explicitly focused on machine learning, neural architectures, LLMs, or diffusion models.
- **Systems Engineer**: $\ge 40\%$ of code written in low-level systems languages (Rust, C, C++, Zig, Assembly).
- **Cloud Native Builder**: High density of infrastructure tools (Docker, Kubernetes, Terraform, HCL, Shell) and cloud service topics.
- **Algorithmic Thinker**: Focused profile centered on DSA, competitive programming, and algorithmic challenges.
- **Frontend Craftsman**: $\ge 50\%$ concentration in web and client-side interfaces.
- **Backend Engineer**: $\ge 50\%$ concentration in server-side ecosystems (Go, Java, Python, C#, Kotlin, Ruby).
- **Open Source Explorer**: $\ge 500$ aggregate stars earned across public software.
- **Open Source Contributor**: High fork-to-original repository ratio showing active upstream participation.
- **The Problem Solver**: Well-rounded generalist profile with diverse technologies.

### 3. The 13-Call Bounded Fan-Out
To balance deep profile intelligence with strict rate-limit management:
1. **Initial Parallel Fetch (3 calls)**: Requests user identity, up to 100 recent repos, and the contribution calendar concurrently via `Promise.all`.
2. **Deterministic Sort & Cut**: Ranks all repositories and selects the top $K=10$.
3. **Language Detail Fan-Out (10 calls)**: Requests byte-level language distributions for only the top 10 ranked repositories in parallel.
4. **Total Call Ceiling**: Strictly bounded at $1 + 2 + 10 = 13$ requests. This prevents rate-limit exhaustion (e.g. querying 100 repos would wipe out an anonymous IP's entire hourly quota in one second).

### 4. Failure Isolation with `Promise.allSettled`
While the initial metadata fetch uses `Promise.all` (the card cannot exist without user and repository data), the 10 language detail requests use `Promise.allSettled`. If an individual repository has restricted permissions, was deleted mid-request, or fails upstream, `Promise.allSettled` silently drops the single failure and aggregates the other 9 repositories, preventing a total card generation crash.

### 5. Resilient In-Memory FIFO Cache
The backend implements an in-memory cache utilizing JavaScript's native `Map`:
- **$O(1)$ Eviction**: Preserves insertion order. When the store reaches the 500-entry capacity limit, it evicts `store.keys().next().value`.
- **10-Minute TTL**: Protects upstream GitHub quota while serving repeat requests in $< 10 \text{ ms}$.
- **Memory Footprint**: Strictly bounded to $< 10 \text{ MB}$ heap usage, eliminating the operational complexity and network latency of an external Redis cluster for this workload.

### 6. Client-Side Offline Fallback Mode
If the Express backend is offline, unconfigured, or throttled, the frontend automatically falls back to an in-browser fetch and ranking engine in `frontend/src/lib/github.ts`. The user experience degrades gracefully rather than displaying a broken screen.

### 7. Hand-Crafted Vector Art & 3× PNG Export
- **12 Thematic Worlds**: Each theme (Cyberpunk, Monolith, Solar, Deep Sea, Hyperdrive, Parchment, Neon Noir, Sakura, 8-Bit, Blueprint, Aurora, Glitch) features custom, hand-coded SVG vector graphics.
- **Pixel-Perfect Rendering**: Inline styles and CSS color variables ensure that SVG elements render identically in DOM previews and inside HTML5 Canvas exports.
- **High-DPI Export**: Generates 3× resolution PNG downloads with custom metadata, collectible serial numbers, and scannable visual signatures.

---

## System Architecture & Data Flow

```
[ User Browser ]
       │
       ▼
[ Rate Limiter ] ──> HTTP 429 if > 30 req/min
       │
       ▼
[ Username Validation ] ──> Regex check: /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
       │
       ▼
[ In-Memory FIFO Cache ] ──(Hit: < 10ms)──> Return Cached Card Data
       │ (Miss)
       ▼
[ GitHub REST API & Calendar Provider ]
  ├── GET /users/:username
  ├── GET /users/:username/repos (up to 100)
  └── GET github-contributions-api (streak & calendar)
       │
       ▼
[ Pipeline Stages ]
  ├── 1. Multi-factor Repository Scoring & Ranking (Top 10 selected)
  ├── 2. Parallel Language Fetch via Promise.allSettled (10 calls max)
  ├── 3. Byte-Level Language Aggregation & Percentage Normalization
  ├── 4. 30-Day Activity Window Analysis (Commits, PRs, Issues)
  ├── 5. Deterministic Archetype Classification & Serial Generation
  └── 6. Calendar Streak Analysis (with 'Today' Grace Period)
       │
       ▼
[ Cache Write (10-min TTL, 500-entry FIFO limit) ]
       │
       ▼
[ Client 3D Card Render ] ──> Interactive Flip (Front / Back / Pocket)
       │
       ▼
[ High-Res 3× PNG Export ]
```

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
