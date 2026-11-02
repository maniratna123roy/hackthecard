# HackTheCard — Backend Architecture & Engineering Specification

This document provides a comprehensive, deep-dive specification of the **HackTheCard** backend service. It covers the architectural design, algorithmic formulas, networking and resilience mechanisms, caching topology, classification heuristics, and API interface contracts.

---

## 1. Architectural Overview

The backend is built with **Node.js, Express, and TypeScript** using ES Modules (`NodeNext`). It operates in two deployment modes with zero code changes:

1. **Persistent Node Service** (`backend/src/server.ts`): Long-running Express instance on Node 20+, deployed to platforms like Render, Railway, Fly.io, or Docker. Keeps an in-memory cache warm continuously.
2. **Serverless Function** (`api/index.ts`): Ephemeral invocation via Vercel Serverless Functions, where requests are routed to the Express application via Vercel's rewrite engine.

```
                          ┌──────────────────────────┐
                          │   Client / Frontend      │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                      ┌───────────────────────────────────┐
                      │    Express Router (/api)          │
                      │  - CORS (ALLOWED_ORIGIN)          │
                      │  - Rate Limiter (30 req/min/IP)   │
                      │  - Username Regex Validator       │
                      └─────────────────┬─────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 [ Cache Hit ? ]                 [ Cache Miss ]
                 Return 200 JSON                       │
                 (meta.cached: true)                   ▼
                                            ┌─────────────────────┐
                                            │ card.ts (buildCard) │
                                            └──────────┬──────────┘
                                                       │
         ┌─────────────────────┬───────────────────────┼────────────────────────┐
         ▼                     ▼                       ▼                        ▼
 ┌───────────────┐     ┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
 │ User Profile  │     │ 100 Repos     │     │ Public Events    │     │ Contributions    │
 │ GET /users/:u │     │ GET /repos    │     │ GET /events      │     │ jogruber.de API  │
 └───────┬───────┘     └───────┬───────┘     └─────────┬────────┘     └────────┬─────────┘
         │                     │                       │                       │
         │                     ▼                       ▼                       ▼
         │             ┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
         │             │  ranking.ts   │     │   activity.ts    │     │  calcStreaks()   │
         │             │ Multi-factor  │     │ 30-Day Window    │     │ Active & Longest │
         │             │ Scoring & Top │     │ Event Aggregator │     │ Streak Metrics   │
         │             └───────┬───────┘     └──────────────────┘     └──────────────────┘
         │                     │
         │                     ▼
         │             ┌───────────────┐
         │             │ languages.ts  │
         │             │ Parallel Map  │
         │             │ Fetch & Share │
         │             └───────┬───────┘
         │                     │
         ▼                     ▼
  ┌───────────────────────────────────────────────────┐
  │         classification.ts (classify())            │
  │     Deterministic Archetype Identification        │
  └───────────────────────────┬───────────────────────┘
                              │
                              ▼
  ┌───────────────────────────────────────────────────┐
  │       Serial Generator (serialFor(login, id))     │
  └───────────────────────────┬───────────────────────┘
                              │
                              ▼
  ┌───────────────────────────────────────────────────┐
  │       Save to In-Memory TTL Cache (10 mins)       │
  │               Return 200 JSON                     │
  └───────────────────────────────────────────────────┘
```

---

## 2. Directory & Module Responsibilities

| Path | Primary Responsibility |
| :--- | :--- |
| `backend/src/server.ts` | Entry point for standalone Node.js server. Binds Express to `config.PORT`. |
| `backend/src/app.ts` | Express application instance, middleware registration, route handlers, error handling. |
| `backend/src/config.ts` | Immutable system configuration parameters, weights, scoring constants, and thresholds. |
| `backend/src/github.ts` | Low-level GitHub REST API HTTP client with timeouts, token handling, and error mapping. |
| `backend/src/cache.ts` | Lightweight in-memory TTL cache with capacity bounding to prevent memory leaks. |
| `backend/src/ranking.ts` | Multi-factor non-linear scoring algorithm to select the developer's most representative repositories. |
| `backend/src/languages.ts` | Parallel language byte fetcher across top repos and normalized percentage aggregator. |
| `backend/src/activity.ts` | Rolling 30-day activity window analyzer and event feed parser. |
| `backend/src/errors.ts` | Standardized `HttpError` class with status codes for centralized error routing. |
| `backend/src/services/card.ts` | High-level orchestrator that resolves all data sources, computes classifications, and builds `CardData`. |
| `backend/src/services/githubService.ts` | Self-contained profile fetcher and classifier utility used for integration testing. |

---

## 3. Configuration & Tuning Parameters (`config.ts`)

All behavioral constants are isolated in `config.ts` to prevent magic numbers:

```typescript
export interface Config {
  PORT: number;               // Default: process.env.PORT || 3001
  GITHUB_API: string;         // "https://api.github.com"
  CACHE_TTL_MS: number;       // 600,000 ms (10 minutes)
  TOP_REPOS: number;          // 5 (number of showcased repositories on card)
  LANG_SAMPLE: number;        // 10 (top-ranked repos inspected for language stats)
  ACTIVITY_DAYS: number;      // 30 (rolling window for commit & event analysis)
  FEED_SIZE: number;          // 5 (number of recent activity feed entries)
  RECENCY_DECAY_DAYS: number; // 180 (exponential decay half-life factor)
  SUBSTANCE_KB_CAP: number;   // 500 (repo size in KB representing 100% substance)
  ARCHIVED_PENALTY: number;   // 0.5 (50% score penalty for archived repositories)
  WEIGHTS: {
    stars: number;            // 0.30 (30% weight)
    recency: number;          // 0.30 (30% weight)
    substance: number;        // 0.15 (15% weight)
    presentation: number;     // 0.15 (15% weight)
    forks: number;            // 0.10 (10% weight)
  };
  IGNORED_LANGUAGES: Set<string>; // ["Jupyter Notebook"] (excluded from byte totals)
}
```

---

## 4. GitHub API Client & Resiliency (`github.ts`)

The `gh<T>(path: string)` function wraps the native `fetch` API with strict production guards:

### 1. Headers & Protocol Versioning
Every request transmits:
- `Accept: application/vnd.github+json`
- `User-Agent: builder-card`
- `X-GitHub-Api-Version: 2022-11-28` (locks GitHub API contract)
- `Authorization: Bearer <token>` (if `process.env.GITHUB_TOKEN` is present)

### 2. Upstream Timeout
```typescript
signal: AbortSignal.timeout(8000) // 8-second hard ceiling
```
If GitHub hangs or throttles without terminating the TCP socket, the request aborts after 8 seconds and maps to an `HTTP 504 Gateway Timeout`.

### 3. Upstream Status Code Mapping
- `404` $\to$ `HttpError(404, "GitHub user not found")`
- `429` or `403` with header `x-ratelimit-remaining === "0"` $\to$ `HttpError(429, "GitHub rate limit reached, try again later")`
- `403` $\to$ `HttpError(502, "GitHub refused the request")`
- Any other `!res.ok` $\to$ `HttpError(502, "GitHub error ${res.status}")`

---

## 5. Caching System (`cache.ts`)

A zero-dependency in-memory Map handles rapid queries:

### Data Structure
```typescript
interface CacheEntry<T> {
  value: T;
  expires: number; // Date.now() + ttlMs
}
const store = new Map<string, CacheEntry<unknown>>();
```

### Eviction & Protection Rules
1. **Passive Expiration on Read (`get`)**: If `Date.now() > entry.expires`, the item is deleted and `null` is returned.
2. **Hard Capacity Bounding (`set`)**:
   ```typescript
   if (store.size >= 500) {
     const firstKey = store.keys().next().value;
     if (firstKey !== undefined) store.delete(firstKey);
   }
   ```
   If the cache reaches 500 keys, the oldest key inserted (FIFO order via JavaScript Map iteration order) is evicted. This guarantees memory never exceeds a few megabytes on shared servers.
3. **HTTP Caching**: All successful responses append `Cache-Control: public, max-age=300` (5 minutes browser cache).

---

## 6. Repository Ranking Algorithm (`ranking.ts`)

Simply sorting repositories by stars produces poor results for prolific developers whose most popular repo might be an unmaintained toy project from 2014. HackTheCard implements a multi-factor logarithmic and exponential scoring formula.

### Phase 1: Pool Filtering
1. **Drop Forks**: Repositories where `repo.fork === true` are excluded so the developer's original creations take precedence.
2. **Drop Profile README**: Repositories named identically to the owner's username (case-insensitive) are excluded (`r.name.toLowerCase() !== r.owner.login.toLowerCase()`).
3. **Fallback Guard**: If the developer only owns forks, the pool relaxes back to all repositories so small or contribution-heavy accounts still produce a complete card.

### Phase 2: Relative Normalization
Star and fork counts span orders of magnitude (from 1 to 150,000+). Using linear scales would drown out active, substantial projects. The algorithm applies logarithmic normalization relative to the user's personal maximum:

$$\text{Stars Score} = \frac{\log_{10}(1 + \text{repo.stargazers\_count})}{\log_{10}(1 + \max(1, \text{maxStars}))}$$

$$\text{Forks Score} = \frac{\log_{10}(1 + \text{repo.forks\_count})}{\log_{10}(1 + \max(1, \text{maxForks}))}$$

*Note: Clamping denominators to $\ge 1$ ensures $\log_{10}(1) = 0$ never causes division by zero.*

### Phase 3: Recency Half-Life Decay
Recency decays exponentially based on days elapsed since `pushed_at`:

$$\text{days} = \max\left(0, \frac{\text{Date.now()} - \text{pushed\_at}}{86,400,000}\right)$$

$$\text{Recency Score} = \exp\left(-\frac{\text{days}}{180}\right)$$

- Pushed today $\to 1.0$
- Pushed 6 months ago $\to 0.368$
- Pushed 1 year ago $\to 0.135$

### Phase 4: Substance & Presentation
- **Substance (Code Volume)**:
  $$\text{Substance Score} = \min\left(\frac{\text{size\_kb}}{500}, 1.0\right)$$
  Filters empty repositories or one-line gists. Capped at 500 KB so massive binary bloat does not gain unfair advantage.
- **Presentation (Documentation Completeness)**:
  - Has Description: $+0.50$
  - Has Homepage / Live Demo URL: $+0.25$
  - Has Topics / Tags: $+0.25$

### Phase 5: Final Score Composite
$$\text{Raw Score} = 100 \times \left[ 0.30 \cdot \text{Stars} + 0.30 \cdot \text{Recency} + 0.10 \cdot \text{Forks} + 0.15 \cdot \text{Substance} + 0.15 \cdot \text{Presentation} \right]$$

If the repository is archived:
$$\text{Final Score} = \text{Raw Score} \times 0.50$$

### Phase 6: Deterministic Tie-Breaking
Repositories are sorted by:
1. Rounded score to 1 decimal place: `Math.round(b.score * 10) - Math.round(a.score * 10)`
2. Secondary tie-breaker: `pushed_at` timestamp descending (most recent first).

---

## 7. Language Aggregation Engine (`languages.ts`)

GitHub's main repository list only returns the single primary language name. HackTheCard fetches actual language byte distributions:

1. **Parallel Fetch via `Promise.allSettled`**:
   The backend inspects the top `config.LANG_SAMPLE` (10) ranked repositories simultaneously:
   ```typescript
   GET /repos/{owner}/{repo}/languages
   ```
   `allSettled` guarantees that if one repository fails (e.g. deleted or private permissions), the remaining repositories proceed uninterrupted.
2. **Byte Filtering**:
   Languages in `config.IGNORED_LANGUAGES` (`Jupyter Notebook`) are stripped out because Jupyter Notebook files are massive JSON arrays containing base64 data that artificially skew byte percentages by 80-90%.
3. **Top 4 + "Other" Aggregation**:
   - Totals are summed across all sampled repositories.
   - The top 4 languages are selected.
   - Any remaining languages (5th and beyond) are consolidated into an `"Other"` category.
   - Percentages are normalized against total bytes and rounded to 1 decimal place:
     $$\text{Percent} = \frac{\text{bytes}}{\sum \text{bytes}} \times 100$$

---

## 8. Activity Window Analysis (`activity.ts`)

The backend queries the user's public event log:
```typescript
GET /users/{login}/events/public?per_page=100
```

### Metrics Computed over a 30-Day Window:
- **Commits**: Computed by reading `e.payload.size` or `e.payload.commits.length` from `PushEvent`s.
- **Pull Requests**: Count of `PullRequestEvent` where `payload.action === "opened"`.
- **New Repos**: Count of `CreateEvent` where `payload.ref_type === "repository"`.
- **Repositories Touched**: Size of a unique `Set<string>` containing repository names across all events.

### Natural Language Event Describers:
Each event is formatted into clean, concise copy:
- `PushEvent`: `"Pushed 3 commits to owner/repo"`
- `PullRequestEvent`: `"Opened a pull request in owner/repo"`
- `IssuesEvent`: `"Opened an issue in owner/repo"`
- `CreateEvent`: `"Created repository owner/repo"`
- `WatchEvent`: `"Starred owner/repo"`

---

## 9. Developer Archetype Classification (`card.ts`)

The classification engine analyzes the developer's repository topics, names, descriptions, and language distribution. Classification is **100% deterministic**—never random.

### Lexical & Language Dictionaries:
- **Frontend**: JavaScript, TypeScript, HTML, CSS, SCSS, Vue, Svelte, Astro, Dart
- **Backend**: Go, Java, C#, PHP, Ruby, Python, Kotlin, Elixir, Scala
- **Systems**: C, C++, Rust, Zig, Assembly, Nim
- **Cloud/Infra**: HCL, Dockerfile, Shell, Nix, Smarty
- **AI Keywords**: `ai`, `ml`, `llm`, `gpt`, `neural`, `machine-learning`, `deep-learning`, `transformer`, `pytorch`, `tensorflow`, `diffusion`, `rag`
- **Algorithm Keywords**: `leetcode`, `algorithm`, `competitive`, `codeforces`, `data-structures`, `dsa`
- **Cloud Keywords**: `kubernetes`, `k8s`, `docker`, `terraform`, `aws`, `gcp`, `azure`, `serverless`, `devops`, `helm`

### Evaluation Cascade (First Match Wins):

```
                       [ Evaluate Repository Pool ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
         [ Empty Pool ? ]                        [ Has Repositories ]
         ├── If forks > 0:                               │
         │   "Open Source Contributor"                   ▼
         └── Else:                               [ AI Match ? ]
             "Developer in Progress"             (≥2 AI repos & ≥20% share)
                                                 │ ──> YES: "AI Innovator"
                                                 ▼
                                         [ Algorithm Match ? ]
                                         (≥2 algorithm repos)
                                         │ ──> YES: "Algorithmic Thinker"
                                         ▼
                                         [ Cloud Native Match ? ]
                                         (≥15% cloud langs or ≥3 infra repos)
                                         │ ──> YES: "Cloud Native Builder"
                                         ▼
                                         [ Systems Match ? ]
                                         (≥40% systems langs)
                                         │ ──> YES: "Systems Engineer"
                                         ▼
                                         [ Full-Stack Match ? ]
                                         (≥25% frontend AND ≥25% backend)
                                         │ ──> YES: "The Full-Stack Architect"
                                         ▼
                                         [ Frontend Match ? ]
                                         (≥50% frontend langs)
                                         │ ──> YES: "Frontend Craftsman"
                                         ▼
                                         [ Backend Match ? ]
                                         (≥50% backend langs)
                                         │ ──> YES: "Backend Engineer"
                                         ▼
                                         [ High Star Count ? ]
                                         (≥500 stars across repos)
                                         │ ──> YES: "Open Source Explorer"
                                         ▼
                                         [ Fork-Heavy ? ]
                                         (forks > original repos)
                                         │ ──> YES: "Open Source Contributor"
                                         ▼
                                         [ Default Fallback ]
                                         "The Problem Solver"
```

---

## 10. Card Metadata & Streak Analysis

### Serial Number Generation
A deterministic identifier printed on the collectible card:
```typescript
function serialFor(login: string, id: number): string {
  return String(id % 100000).padStart(5, "0") + "-" + login.slice(0, 3).toUpperCase();
}
```
- Example: GitHub ID `12345` for user `octocat` $\to$ `12345-OCT`

### Streak Calculation (`calcStreaks`)
Calculated from the 365-day contribution calendar (`github-contributions-api.jogruber.de`):
1. **Longest Streak**: Iterates chronologically through days. Increments `run` if `count > 0`, resets to 0 otherwise. Records `max(longest, run)`.
2. **Current Active Streak**: Iterates backwards from today.
   - If today has 0 contributions, today is skipped as a grace period (the developer may still commit before midnight).
   - Counts uninterrupted daily contributions until a day with 0 commits is reached.

---

## 11. Security, Rate Limiting & Error Management (`app.ts`)

1. **Proxy Trust**:
   ```typescript
   app.set("trust proxy", 1);
   ```
   Ensures rate limiting reads the true client IP behind Vercel, Cloudflare, or AWS ALB reverse proxies instead of the proxy server's internal IP.
2. **IP Rate Limiting**:
   ```typescript
   app.use("/api", rateLimit({
     windowMs: 60_000,
     limit: 30,
     standardHeaders: true,
     legacyHeaders: false,
     message: { error: "Too many requests, slow down" },
   }));
   ```
   Guarantees that a single client cannot exhaust the server's GitHub API quota.
3. **Input Validation Regex**:
   ```typescript
   const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
   ```
   Conforms strictly to GitHub account username constraints (alphanumeric and single hyphens, 1-39 chars, no consecutive hyphens, no leading/trailing hyphen). Prevents path traversal and URL injection.
4. **Information Leakage Prevention**:
   ```typescript
   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
     const status = typeof err.status === "number" ? err.status : 500;
     if (status === 500) console.error(err);
     res.status(status).json({
       error: status === 500 ? "Internal server error" : err.message,
     });
   });
   ```
   Internal stack traces, database states, and token details are logged server-side only and never sent over the wire to clients.

---

## 12. API Reference Contract

### 1. Health Probe
```http
GET /api/health
```
**Response (200 OK):**
```json
{ "ok": true }
```

---

### 2. Card Generation
```http
GET /api/card/:username
GET /api/developer/:username
```

#### Success Response (`200 OK`)
```json
{
  "profile": {
    "login": "octocat",
    "name": "The Octocat",
    "avatarUrl": "https://avatars.githubusercontent.com/u/583231",
    "bio": "Building the future of software.",
    "location": "San Francisco",
    "followers": 15000,
    "following": 9,
    "publicRepos": 8,
    "profileUrl": "https://github.com/octocat",
    "createdAt": "2011-01-25T18:44:36Z"
  },
  "topRepos": [
    {
      "name": "Spoon-Knife",
      "url": "https://github.com/octocat/Spoon-Knife",
      "description": "This repo's big brother is a fork.",
      "homepage": "https://octocat.github.io/Spoon-Knife",
      "stars": 12800,
      "forks": 14000,
      "language": "HTML",
      "topics": ["git", "forking", "starter"],
      "pushedAt": "2024-02-10T11:22:33Z",
      "score": 92.4
    }
  ],
  "languages": [
    { "language": "TypeScript", "bytes": 142000, "percent": 54.2 },
    { "language": "HTML", "bytes": 68000, "percent": 25.9 },
    { "language": "CSS", "bytes": 32000, "percent": 12.2 },
    { "language": "Other", "bytes": 20000, "percent": 7.7 }
  ],
  "activity": {
    "windowDays": 30,
    "commits": 42,
    "pullRequests": 6,
    "newRepos": 1,
    "reposTouched": 4,
    "latest": [
      {
        "type": "PushEvent",
        "repo": "octocat/Spoon-Knife",
        "text": "Pushed 2 commits to octocat/Spoon-Knife",
        "createdAt": "2024-03-01T14:20:00Z"
      }
    ]
  },
  "classification": {
    "title": "The Full-Stack Architect",
    "reason": "Balanced mix: 38% frontend and 35% backend languages."
  },
  "serial": "83231-OCT",
  "streak": 14,
  "longestStreak": 48,
  "contributions": [
    { "date": "2024-01-01", "count": 5, "level": 2 }
  ],
  "contributionTotal": 842,
  "meta": {
    "generatedAt": "2024-03-02T12:00:00.000Z",
    "cached": false
  }
}
```

#### Error Responses
- `400 Bad Request`: `{"error": "Invalid GitHub username"}`
- `404 Not Found`: `{"error": "GitHub user not found"}`
- `429 Too Many Requests`: `{"error": "GitHub rate limit reached, try again later"}` or `{"error": "Too many requests, slow down"}`
- `504 Gateway Timeout`: `{"error": "GitHub did not respond in time"}`
- `500 Internal Server Error`: `{"error": "Internal server error"}`
