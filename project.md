# HackTheCard — Complete Codebase Architecture & Reference

> **Project Mission**: Transform public GitHub profiles into high-fidelity, collectible developer cards inspired by physical trading cards across 12 hand-illustrated vector worlds, backed by a robust Node.js + Express API.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Backend Codebase (Builder Card Build Guide)](#3-backend-codebase)
   - [3.1 `backend/src/config.ts`](#31-backendsrcconfigts)
   - [3.2 `backend/src/errors.ts`](#32-backendsrcerrorsts)
   - [3.3 `backend/src/cache.ts`](#33-backendsrccachets)
   - [3.4 `backend/src/github.ts`](#34-backendsrcgithubts)
   - [3.5 Core Logic 1: `backend/src/ranking.ts`](#35-core-logic-1-backendsrcrankingts)
   - [3.6 Core Logic 2: `backend/src/languages.ts`](#36-core-logic-2-backendsrclanguagests)
   - [3.7 Core Logic 3: `backend/src/activity.ts`](#37-core-logic-3-backendsrcactivityts)
   - [3.8 Service Orchestrator: `backend/src/services/card.ts`](#38-service-orchestrator-backendsrcservicescardts)
   - [3.9 Express Application: `backend/src/app.ts`](#39-express-application-backendsrcappts)
   - [3.10 Local Server Entry: `backend/src/server.ts`](#310-local-server-entry-backendsrcserverts)
   - [3.11 Backend Test Suite: `backend/test/*.test.ts`](#311-backend-test-suite)
4. [Frontend Codebase](#4-frontend-codebase)
   - [4.1 `frontend/src/main.tsx`](#41-frontendsrcmaintsx)
   - [4.2 `frontend/src/App.tsx`](#42-frontendsrcapptsx)
   - [4.3 `frontend/src/components/card/CollectibleCard.tsx`](#43-frontendsrccomponentscardcollectiblecardtsx)
   - [4.4 `frontend/src/components/card/ThemeArt.tsx`](#44-frontendsrccomponentscardthemearttsx)
   - [4.5 `frontend/src/components/card/CardLoader.tsx`](#45-frontendsrccomponentscardcardloadertsx)
   - [4.6 `frontend/src/components/landing/Hero.tsx`](#46-frontendsrccomponentslandingherotsx)
   - [4.7 `frontend/src/lib/themes.ts`](#47-frontendsrclibthemests)
   - [4.8 `frontend/src/lib/card-details.ts`](#48-frontendsrclibcard-detailsts)
   - [4.9 `frontend/src/lib/api.ts`](#49-frontendsrclibapits)
   - [4.10 `frontend/src/lib/github.ts`](#410-frontendsrclibgithubts)
   - [4.11 `frontend/src/styles.css`](#411-frontendsrcstylescss)
   - [4.12 `frontend/vite.config.ts`](#412-frontendsrviteconfigts)
5. [Interview Prep & Core Logic Defense](#5-interview-prep--core-logic-defense)
6. [Root Monorepo Configuration](#6-root-monorepo-configuration)

---

## 1. Architecture Overview

The system is decoupled into two clean domains:
- **`backend/`**: A Node.js + Express API following the **Builder Card Backend Build Guide**. It fetches public GitHub data with token authentication (5,000 req/hr), enforces timeouts with `AbortSignal.timeout(8000)`, calculates weighted repository rankings, computes language byte distributions across top repos, summarizes 30-day public events, caches responses in memory for 10 minutes, and rate-limits clients to 30 requests per minute.
- **`frontend/`**: An interface built with React 19, TypeScript, Tailwind CSS v4, and Vite. It renders a flippable 3D card across 12 hand-coded vector worlds with zero external bitmap dependencies, supports high-resolution 3× PNG exports, and talks directly to `GET /api/card/:username` with an automatic fallback to client-side fetching if the backend is offline.

### Request Flow
```
Browser (Frontend)
   │  GET /api/card/:username
   ▼
Express Route (app.ts) ──► Regex Validate Username ──► Cache Hit (10m TTL)? Return cached JSON
   │
   ▼ Cache Miss
GitHub Client (github.ts)
   ├──► /users/:username               (profile data; throws 404 if missing)
   ├──► /users/:username/repos         (all repos, sort=pushed) } parallel
   └──► /users/:username/events/public (public events feed)     }
   │
   ├──► Core Logic 1: ranking.ts   ──► Scores repos 0-100; selects top 5
   ├──► Core Logic 2: languages.ts ──► Fetches /repos/*/languages for top 10 repos; calculates percentages
   └──► Core Logic 3: activity.ts  ──► Summarizes 30-day commits, PRs, repos created & touched + feed
   │
   ▼
Cache Result (10 min TTL) ──► Return Card JSON ({ profile, topRepos, languages, activity, meta })
```

---

## 2. Directory Structure

```
├── backend/
│   ├── src/
│   │   ├── config.ts              # Tunable numbers, constants, weights
│   │   ├── errors.ts              # HttpError class with status code support
│   │   ├── cache.ts               # In-memory TTL cache with 500-key memory cap
│   │   ├── github.ts              # Fetch wrapper: token, timeout (8s), error mapping
│   │   ├── ranking.ts             # CORE LOGIC 1: weighted repo ranking (0-100 score)
│   │   ├── languages.ts           # CORE LOGIC 2: multi-repo language byte aggregation
│   │   ├── activity.ts            # CORE LOGIC 3: 30-day event summary & feed
│   │   ├── app.ts                 # Express app: CORS, rate limiting, routes, errors
│   │   ├── server.ts              # Local dev server entry (app.listen)
│   │   └── services/
│   │       ├── card.ts            # Orchestrates everything into the Card JSON
│   │       └── githubService.ts   # Classification & streak intelligence
│   ├── test/
│   │   ├── ranking.test.ts        # Core ranking tests (forks dropped, recency, stars)
│   │   ├── languages.test.ts      # Core languages tests (byte percentages, empty input)
│   │   └── activity.test.ts       # Core activity tests (window filtering, push commits)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── frontend/
│   ├── public/                    # Favicon & robot assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── card/              # CollectibleCard, ThemeArt, CardLoader
│   │   │   └── landing/           # Hero, SiteHeader, Manifesto
│   │   ├── lib/
│   │   │   ├── api.ts             # Wires frontend to GET /api/card/:username
│   │   │   ├── card-details.ts    # Deterministic signature & activity helpers
│   │   │   ├── github.ts          # Types, palettes, fallback client fetch
│   │   │   ├── themes.ts          # 12 thematic color & art configurations
│   │   │   └── utils.ts
│   │   ├── test/                  # Component & unit tests
│   │   ├── App.tsx                # Main application component
│   │   ├── main.tsx               # React DOM mounting
│   │   └── styles.css             # Tailwind CSS v4 & brutalist theme system
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
│
├── package.json                   # Root monorepo workspace scripts
├── README.md
├── AGENTS.md
└── project.md
```

---

## 3. Backend Codebase (Builder Card Build Guide)

### 3.1 `backend/src/config.ts`
- **Why it is there**: Consolidates all tunable constants and scoring weights in one single place, allowing you to explain: *"The weights are constants I can tune."*
- **How it works**:
  - `PORT`: Configured from `process.env.PORT || 3001`.
  - `GITHUB_API`: `"https://api.github.com"`.
  - `CACHE_TTL_MS`: `10 * 60 * 1000` (10 minutes).
  - `TOP_REPOS`: 5 repos shown on the card.
  - `LANG_SAMPLE`: Top 10 repos queried for languages.
  - `ACTIVITY_DAYS`: 30-day window.
  - `RECENCY_DECAY_DAYS`: 180 (exponential decay half-life).
  - `SUBSTANCE_KB_CAP`: 500 KB (filters empty repositories).
  - `ARCHIVED_PENALTY`: 0.5 (halves score of abandoned/archived repos).
  - `WEIGHTS`: `{ stars: 0.30, recency: 0.30, forks: 0.10, substance: 0.15, presentation: 0.15 }`.
  - `IGNORED_LANGUAGES`: `new Set(['Jupyter Notebook'])` because raw JSON cells skew byte totals.
- **Importance**: Decouples mathematical constants from business logic.

### 3.2 `backend/src/errors.ts`
- **Why it is there**: Provides custom HTTP error handling with HTTP status codes.
- **How it works**: Defines `class HttpError extends Error` with a `.status` property (e.g. 400, 404, 429, 502, 504).
- **Importance**: Allows any downstream helper or fetch call to trigger explicit status codes caught by Express.

### 3.3 `backend/src/cache.ts`
- **Why it is there**: High-performance in-memory TTL caching with a memory cap.
- **How it works**:
  - Maintains an in-memory `Map<string, CacheEntry>`.
  - `get(key)`: Returns `null` if key is missing or expired (`Date.now() > entry.expires`).
  - `set(key, value, ttlMs)`: Evicts the oldest entry if `store.size >= 500` to prevent memory leaks in production.
- **Importance**: Protects GitHub rate limits by caching user profiles for 10 minutes.

### 3.4 `backend/src/github.ts`
- **Why it is there**: Central fetch gateway through which every GitHub API call flows.
- **How it works**:
  - Attaches `User-Agent: builder-card` and `X-GitHub-Api-Version: 2022-11-28`.
  - Injects `Bearer ${process.env.GITHUB_TOKEN}` when present, elevating rate limits to 5,000 req/hr.
  - Enforces an 8-second timeout using `AbortSignal.timeout(8000)`.
  - Maps status codes:
    - 404 -> `HttpError(404, 'GitHub user not found')`
    - 429 or 403 with `x-ratelimit-remaining === '0'` -> `HttpError(429, 'GitHub rate limit reached, try again later')`
    - 403 (unauthorized/forbidden) -> `HttpError(502, 'GitHub refused the request')`
    - Timeout -> `HttpError(504, 'GitHub did not respond in time')`
- **Importance**: Distinguishes between user errors, rate limiting, and network failures.

### 3.5 Core Logic 1: `backend/src/ranking.ts`
- **Why it is there**: Ranks a developer's repositories to feature their most impactful, fresh, and complete work.
- **How it works**:
  - **Normalization**: Each signal is normalized to `0..1`, multiplied by its weight, and scaled to a `0..100` score.
  - **Signals**:
    - **Stars (30%)**: `log10(1 + stars) / log10(1 + maxStars)` — Log scale rewards the first few stars while dampening massive outliers.
    - **Recency (30%)**: `exp(-daysSincePush / 180)` — Exponential decay prioritizes work built recently.
    - **Forks (10%)**: `log10(1 + forks) / log10(1 + maxForks)` — Indicates others building on top of the code.
    - **Substance (15%)**: `min(repo.size / 500, 1)` — Filters out empty placeholder repos.
    - **Presentation (15%)**: `0.5 * description + 0.25 * homepage + 0.25 * topics` — Rewards clean documentation.
    - **Archived Penalty**: Multiplies total score by `0.5` if `repo.archived` is true.
  - **Filtering**: Drops forks and profile-README repos (`name !== login`). If only forks exist, falls back gracefully.
- **Importance**: The primary algorithmic scoring engine evaluated in technical discussions.

### 3.6 Core Logic 2: `backend/src/languages.ts`
- **Why it is there**: Computes real language percentages based on actual bytes of code across the developer's top repositories.
- **How it works**:
  - Two decoupled functions:
    1. `fetchLanguageMaps(repos)`: Makes parallel network requests with `Promise.allSettled`. If one repo fails, the card still renders safely.
    2. `aggregateLanguages(maps, { top = 4, ignore })`: Pure function that sums byte counts, ignores noisy formats (like Jupyter Notebooks), calculates exact percentages, groups smaller languages into `"Other"`, and rounds to 1 decimal place.
- **Importance**: Reflects true programming language breakdown rather than simple repository counts.

### 3.7 Core Logic 3: `backend/src/activity.ts`
- **Why it is there**: Summarizes public developer activity over the last 30 days.
- **How it works**:
  - Filters events by `Date.now() - 30 * 86400000`.
  - Calculates: total `commits`, `pullRequests`, `newRepos`, and distinct `reposTouched` count.
  - Generates a human-readable activity feed via `describe(event)` (e.g., *"Pushed 3 commits to owner/repo"*, *"Opened a pull request in owner/repo"*).
- **Importance**: Highlights current momentum and open-source engagement.

### 3.8 Service Orchestrator: `backend/src/services/card.ts`
- **Why it is there**: Orchestrates the entire pipeline and builds the exact JSON response contract.
- **How it works**:
  - Fetches the user profile first (fast 404 for nonexistent users).
  - Fetches repositories, public events, and contribution calendar in parallel.
  - Passes repos through `rankRepos` and top 10 repos through `fetchLanguageMaps`.
  - Assembles the JSON response matching:
    ```json
    {
      "profile": { "login", "name", "avatarUrl", "bio", "location", "followers", "following", "publicRepos", "profileUrl", "createdAt" },
      "topRepos": [ ... ],
      "languages": [ ... ],
      "activity": { "windowDays": 30, "commits", "pullRequests", "newRepos", "reposTouched", "latest": [ ... ] },
      "meta": { "generatedAt", "cached": false }
    }
    ```
- **Importance**: The single source of truth for the API response payload.

### 3.9 Express Application: `backend/src/app.ts`
- **Why it is there**: Configures Express, CORS, security rate limiting, routing, and error handling.
- **How it works**:
  - `app.set('trust proxy', 1)`: Extracts real client IP when behind reverse proxies.
  - `express-rate-limit`: Enforces a maximum of 30 requests per minute per IP.
  - `USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i`: Validates usernames before any outbound requests, preventing SSRF and URL injection.
  - `GET /api/health`: Uptime probe returning `{ ok: true }`.
  - `GET /api/card/:username`: Core card endpoint with 10-minute caching and `Cache-Control: public, max-age=300`.
  - Central Error Handler: Maps `HttpError` status codes, hiding stack traces on 500 errors.
- **Importance**: The HTTP boundary protecting the service and handling incoming traffic.

### 3.10 Local Server Entry: `backend/src/server.ts`
- **Why it is there**: Minimal local entry point executing `app.listen(PORT)`.
- **How it works**: Imports `app` from `./app.js` and starts listening on the configured port.
- **Importance**: Separates the HTTP listener from the Express application for clean testing.

### 3.11 Backend Test Suite
- **`backend/test/ranking.test.ts`**: Verifies that forks are excluded, newer repos outrank older repos with identical stars, and zero-star repos produce valid numeric scores.
- **`backend/test/languages.test.ts`**: Verifies percentage calculations from raw bytes and handles empty input gracefully.
- **`backend/test/activity.test.ts`**: Verifies that only events within the 30-day window are counted and commit totals are accurate.

---

## 4. Frontend Codebase

### 4.1 `frontend/src/main.tsx`
Mounts the React 19 application, wraps it in `QueryClientProvider`, and imports the brutalist CSS styling.

### 4.2 `frontend/src/App.tsx`
Coordinates the user interface:
- Manages active user input, selected theme (1 of 12), and card 3D flip state.
- Features `useCardScale()` with a `ResizeObserver` for fluid responsive sizing.
- High-res 3× PNG export using `html-to-image` (`toPng`).
- Inking animation timer (2.8s) so the loader plays smoothly even on instant network responses.

### 4.3 `frontend/src/components/card/CollectibleCard.tsx`
Renders the trading card:
- **`CardFront`**: Vector theme backdrop, avatar, serial number, primary metrics, and top repo showcase.
- **`CardBack`**: 52-week contribution heatmap, language bars, activity highlights, and the algorithmic signature mark.
- **`PocketCard`**: Compact trading card variant.
- Uses inline styling from `theme` tokens so export matches on-screen colors identically.

### 4.4 `frontend/src/components/card/ThemeArt.tsx`
Hand-coded SVG vector artwork across 12 worlds: Cyberpunk, Monolith, Solar, Deep Sea, Hyperdrive, Parchment, Neon Noir, Sakura, 8-Bit, Blueprint, Aurora, Glitch. Sharp at any zoom level with zero image assets.

### 4.5 `frontend/src/components/card/CardLoader.tsx`
Tactile card-shuffling loader with step progress indicators (*"Fetching profile"*, *"Reading repositories"*, *"Counting commits"*, *"Inking the artwork"*).

### 4.6 `frontend/src/components/landing/Hero.tsx`
Site header, sample profile buttons (`torvalds`, `gaearon`, `sindresorhus`), and the HackTheCard Manifesto.

### 4.7 `frontend/src/lib/themes.ts`
Color tokens, frame styles, and typography palettes for all 12 collectible worlds.

### 4.8 `frontend/src/lib/card-details.ts`
- `signatureCells(login)`: Deterministic 5×5 symmetric matrix computed via FNV-1a hash and xorshift PRNG.
- `activityHighlights(days)`: Extracts active day count and peak contribution day from verified calendar data.

### 4.9 `frontend/src/lib/api.ts`
Calls the backend endpoint:
```typescript
fetch(`/api/card/${encodeURIComponent(username)}`)
```
Maps the JSON response into card fields, with an automatic fallback to client-side fetching if the backend is offline.

### 4.10 `frontend/src/styles.css`
Tailwind CSS v4 variables, OKLCH color spaces, and custom brutalist styling utilities (`.stage`, `.brutal-btn`, `.card-3d`, `.card-inner`).

---

## 5. Interview Prep & Core Logic Defense

| Question | Recommended Answer |
| :--- | :--- |
| **Why a backend at all?** | GitHub allows 60 requests/hour without a token. A token in browser code would be exposed to the public. Running server-side protects the secret token, provides 5,000 requests/hour, and allows in-memory caching. |
| **Why do you rank repos this way?** | Combines impact (stars, forks on a log scale), freshness (exponential decay with 180-day half-life), and completeness (description, demo link, substance cap). Forks are excluded unless no original repos exist. All weights live in `config.ts`. |
| **How is language percentage computed?** | Queries `/repos/*/languages` across the top 10 ranked repos, sums the raw bytes per language, and divides by total bytes. Jupyter Notebooks are excluded because bulky JSON data skews byte counts. |
| **What if GitHub is slow or down?** | An 8-second timeout is enforced via `AbortSignal.timeout(8000)`, mapped to 504. Language and events calls fail softly via `Promise.allSettled` and catch blocks, allowing the card to render even if secondary calls fail. |
| **How do you handle rate limits?** | Server-side authentication token, 10-minute in-memory caching per username, only ~12 API calls per card generation, and an Express IP rate-limiter of 30 requests per minute. |
| **Why in-memory cache? Limits?** | Simple and zero-dependency for standard deployment. Resets on restart. In high-traffic production, replace with Redis or Upstash. |
| **How do you validate input?** | Validates against GitHub's official username regex before making any outbound API call, blocking invalid requests and preventing URL path injection. |
| **Known limitations?** | Inspects up to the latest 100 repositories; public data only; events cover approximately the last 90 days; bytes measure code volume rather than developer proficiency. |

---

## 6. Root Monorepo Configuration

- **`package.json`**:
  - `npm run dev`: Runs frontend dev server.
  - `npm run dev:backend`: Starts the backend in watch mode using `tsx`.
  - `npm run dev:frontend`: Starts Vite on port 5173.
  - `npm run build`: Compiles backend (`tsc`) and frontend (`vite build`).
  - `npm test`: Executes both test suites (21 total tests passing).
- **`README.md`**: Project overview, architectural diagrams, quickstart instructions, and environment variable documentation.
- **`AGENTS.md`**: Guidelines and architectural invariants for ongoing pairing and maintenance.
