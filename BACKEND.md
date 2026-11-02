# HackTheCard — Backend Engineering & Interview Master Guide

> **Project Purpose:** HackTheCard ingests public GitHub data for any developer and synthesizes it into a high-fidelity, collectible identity card. It turns raw commit histories, repository statistics, language byte splits, and contribution streaks into deterministic developer archetypes and ranked showcase cards.

---

## Table of Contents
1. [The 30-Second Elevator Pitch (For Interviewers)](#1-the-30-second-elevator-pitch)
2. [System Architecture & Request Lifecycle](#2-system-architecture--request-lifecycle)
3. [Deep-Dive: The Repository Ranking Algorithm (`ranking.ts`)](#3-deep-dive-the-repository-ranking-algorithm)
4. [Deep-Dive: Deterministic Developer Archetype Classification (`card.ts`)](#4-deep-dive-developer-archetype-classification)
5. [Deep-Dive: High-Resilience GitHub Client (`github.ts`)](#5-deep-dive-high-resilience-github-client)
6. [Deep-Dive: In-Memory Caching System (`cache.ts`)](#6-deep-dive-in-memory-caching-system)
7. [Deep-Dive: Language Aggregation Engine (`languages.ts`)](#7-deep-dive-language-aggregation-engine)
8. [Deep-Dive: Activity Summarizer & Streak Calculation (`activity.ts`)](#8-deep-dive-activity-summarizer--streak-calculation)
9. [Defensive Security, Rate Limiting & Error Management (`app.ts`)](#9-defensive-security-rate-limiting--error-management)
10. [Edge Cases & How They Are Handled](#10-edge-cases--how-they-are-handled)
11. [Time & Space Complexity Analysis (Big-O)](#11-time--space-complexity-analysis-big-o)
12. [Top 10 Interview Questions & Model Answers](#12-top-10-interview-questions--model-answers)

---

## 1. The 30-Second Elevator Pitch

> *"HackTheCard is a full-stack TypeScript application that transforms public GitHub profiles into collectible developer identity cards. On the backend, I designed an Express service that can run either as a persistent Node server or as an ephemeral Vercel Serverless Function.*
>
> *The core technical challenges were: First, designing a multi-factor ranking algorithm using logarithmic star scaling and exponential recency decay to surface a developer's best work rather than just their most starred ancient repo. Second, building a deterministic archetype classifier based on language shares and topics. Third, ensuring high resilience against GitHub API rate limits using an in-memory TTL cache, bounded capacity evictions, and `Promise.allSettled` parallelization so a single downstream failure never crashes the user's card."*

---

## 2. System Architecture & Request Lifecycle

```
[ Client Request ] ──> GET /api/card/:username
                            │
                            ▼
              ┌───────────────────────────┐
              │  Express App (app.ts)     │
              │  • Proxy Trust Enabled    │
              │  • CORS Origin Check      │
              │  • Rate Limiter (30/min)  │
              │  • Regex Input Sanitizer  │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │   In-Memory Cache Check   │
              └─────────────┬─────────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
       [ Cache Hit ]                 [ Cache Miss ]
   Return 200 JSON (<10ms)                 │
   `meta.cached: true`                     ▼
                               ┌───────────────────────────┐
                               │ Concurrent Fetch (card.ts)│
                               │ • User Profile            │
                               │ • 100 Repositories        │
                               │ • Public Events           │
                               │ • Contribution Calendar   │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │ Processing Pipeline       │
                               │ 1. Filter & Rank Repos    │
                               │ 2. Parallel Language Fetch│
                               │ 3. 30-Day Activity Window │
                               │ 4. Deterministic Archetype│
                               │ 5. Consecutive Streaks    │
                               │ 6. Serial ID Generation   │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │ Save to Cache (10m TTL)   │
                               │ Append Cache-Control (5m) │
                               │ Return 200 OK JSON        │
                               └───────────────────────────┘
```

### Dual-Mode Serving Strategy
- **Persistent Node Server (`server.ts`)**: Used on platforms like Render, Railway, or Docker. Boots an Express app on `PORT 3001`. The memory state persists continuously across requests, maximizing cache hit ratios.
- **Serverless Function (`api/index.ts`)**: Deployed to Vercel. Vercel routes `/api/(.*)` directly into the exported Express handler. If the lambda experience a cold start, it recovers gracefully because all functions are stateless.

---

## 3. Deep-Dive: The Repository Ranking Algorithm (`ranking.ts`)

### Why Not Just Sort By Stars?
Sorting solely by star count fails in the real world:
1. **The Stale Project Problem**: A developer might have earned 1,000 stars on an unmaintained utility 8 years ago, while actively building cutting-edge AI or systems software today with fewer stars.
2. **The Fork Problem**: Forking a 200,000-star repo (like `freeCodeCamp` or `linux`) would make the user look like the creator.
3. **The Profile README Problem**: GitHub creates a repository named after the username to render profile READMEs; this is documentation, not a software project.

### Step 1: Pool Sanitization
```typescript
let pool = repos.filter(
  (r) => !r.fork && (!r.owner?.login || r.name.toLowerCase() !== r.owner.login.toLowerCase())
);
// Fallback: If an account ONLY has forks, don't crash — allow forks so they still get a card
if (pool.length === 0) pool = repos;
```

### Step 2: Non-Linear Mathematical Scoring
Each repository is evaluated across 5 weighted dimensions on a 0–100 scale:

$$\text{Final Score} = 100 \times \left[ 0.30 \cdot S_{\text{stars}} + 0.30 \cdot S_{\text{recency}} + 0.10 \cdot S_{\text{forks}} + 0.15 \cdot S_{\text{substance}} + 0.15 \cdot S_{\text{presentation}} \right]$$

#### 1. Logarithmic Star Normalization ($30\%$ weight)
$$S_{\text{stars}} = \frac{\log_{10}(1 + \text{repo.stargazers\_count})}{\log_{10}(1 + \max(1, \text{maxStars}))}$$
- **Why Logarithmic?** Star counts follow a power-law distribution. A repo with 10,000 stars is not 10,000 times more relevant than a repo with 10 stars. Logarithmic scaling compresses extreme outliers.
- **Why relative to `maxStars`?** It normalizes the score to the *individual developer's scale*. For a student whose top repo has 20 stars, a 15-star repo will score appropriately high.
- **Why `1 + count`?** $\log_{10}(1) = 0$. This prevents $\log_{10}(0) = -\infty$ and ensures zero stars yields a clean 0 score.

#### 2. Exponential Recency Decay ($30\%$ weight)
$$\text{days} = \max\left(0, \frac{\text{Date.now()} - \text{pushed\_at}}{86,400,000}\right)$$
$$S_{\text{recency}} = \exp\left(-\frac{\text{days}}{180}\right)$$
- Uses exponential decay with time constant $\tau = 180 \text{ days}$ (6 months). At $\text{days} = 180$, the score drops to $1/e \approx 36.8\%$ (equivalent to an effective half-life of $t_{1/2} = \tau \ln(2) \approx 125 \text{ days}$).
- Active today: $\exp(0) = 1.0$ ($100\%$ score).
- Active ~4 months ago ($\approx 125 \text{ days}$): $\exp(-125/180) \approx 0.50$ (half-life point, $50\%$ score).
- Active 6 months ago ($180 \text{ days}$): $\exp(-1) \approx 0.368$ ($1/e \approx 37\%$ score).
- Active 1 year ago ($360 \text{ days}$): $\exp(-2) \approx 0.135$ ($14\%$ score).
- Actively maintained projects are strongly prioritized over abandoned artifacts.

#### 3. Logarithmic Fork Normalization ($10\%$ weight)
$$S_{\text{forks}} = \frac{\log_{10}(1 + \text{repo.forks\_count})}{\log_{10}(1 + \max(1, \text{maxForks}))}$$
- Rewards code adoption by other engineers while keeping weight modest ($10\%$).

#### 4. Code Substance Cap ($15\%$ weight)
$$S_{\text{substance}} = \min\left(\frac{\text{repo.size\_kb}}{500}, 1.0\right)$$
- Filters out empty repos, single-file gists, or placeholder configs.
- Capped at $500 \text{ KB}$ so massive repos with giant binary blobs don't unfairly dominate.

#### 5. Presentation Quality ($15\%$ weight)
```typescript
const presentation =
  (repo.description ? 0.5 : 0) +
  (repo.homepage ? 0.25 : 0) +
  (repo.topics && repo.topics.length ? 0.25 : 0);
```
- Rewards professional software engineering practices: descriptive summary ($50\%$), live URL/demo ($25\%$), and discoverability tags ($25\%$).

#### 6. The Archived Penalty
```typescript
if (repo.archived) score *= 0.5; // 50% penalty
```
- Repositories explicitly marked read-only/archived by their creator receive an automatic $50\%$ penalty.

### Step 3: Deterministic Sorting & Tie-Breaking
```typescript
pool.sort((a, b) =>
  Math.round(b.score * 10) - Math.round(a.score * 10) ||
  pushedAt(b) - pushedAt(a)
);
```
Scores are compared rounded to 1 decimal place. Any tie is deterministically broken by the most recent `pushed_at` timestamp.

---

## 4. Deep-Dive: Developer Archetype Classification (`card.ts`)

Rather than using unpredictable generative AI or random badge generation, developer titles are determined through **deterministic heuristic rules** grounded in language share percentages and repository metadata.

### Language Buckets
- **Frontend**: JavaScript, TypeScript, HTML, CSS, SCSS, Vue, Svelte, Astro, Dart
- **Backend**: Go, Java, C#, PHP, Ruby, Python, Kotlin, Elixir, Scala
- **Systems**: C, C++, Rust, Zig, Assembly, Nim
- **Cloud/Infra**: HCL, Dockerfile, Shell, Nix, Smarty

### Keyword Regexes
- `AI_WORDS`: `\b(ai|ml|llm|gpt|neural|machine[- ]learning|deep[- ]learning|transformer|pytorch|tensorflow|diffusion|rag)\b`
- `ALGO_WORDS`: `\b(leetcode|algorithm|algorithms|competitive|codeforces|data[- ]structures|dsa)\b`
- `CLOUD_WORDS`: `\b(kubernetes|k8s|docker|terraform|aws|gcp|azure|serverless|devops|helm)\b`

### The Decision Cascade (Priority Ordered)

```typescript
function classify(repos: RawRepo[], totalStars: number, forkedCount: number)
```

1. **Empty Repositories Guard**:
   - If user has 0 original repos but `forkedCount > 0` $\to$ **"Open Source Contributor"**
   - If 0 repos total $\to$ **"Developer in Progress"**
2. **AI Innovator**: $\ge 2$ repos and $\ge 20\%$ of repos match `AI_WORDS`.
3. **Algorithmic Thinker**: $\ge 2$ repos match `ALGO_WORDS` in name/description.
4. **Cloud Native Builder**: $\ge 15\%$ cloud tooling languages OR $\ge 3$ repos tagged with cloud infra keywords.
5. **Systems Engineer**: $\ge 40\%$ of repos use low-level systems languages (C, C++, Rust, Zig, etc.).
6. **The Full-Stack Architect**: Balanced polyglot profile with $\ge 25\%$ frontend AND $\ge 25\%$ backend languages.
7. **Frontend Craftsman**: $\ge 50\%$ frontend language dominance.
8. **Backend Engineer**: $\ge 50\%$ backend language dominance.
9. **Open Source Explorer**: Has earned $\ge 500$ cumulative stars across public projects.
10. **Open Source Contributor**: Forked projects outnumber original creations.
11. **The Problem Solver**: Balanced generalist fallback with a diverse repository spread.

---

## 5. Deep-Dive: High-Resilience GitHub Client (`github.ts`)

```typescript
export async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "builder-card",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let res: Response;
  try {
    res = await fetch(config.GITHUB_API + path, {
      headers,
      signal: AbortSignal.timeout(8000), // 8-second hard timeout
    });
  } catch (_err) {
    throw new HttpError(504, "GitHub did not respond in time");
  }

  if (res.status === 404) throw new HttpError(404, "GitHub user not found");
  if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
    throw new HttpError(429, "GitHub rate limit reached, try again later");
  }
  if (res.status === 403) throw new HttpError(502, "GitHub refused the request");
  if (!res.ok) throw new HttpError(502, `GitHub error ${res.status}`);

  return res.json() as Promise<T>;
}
```

### Key Engineering Decisions:
1. **API Version Locking**: Pins `X-GitHub-Api-Version: 2022-11-28` to guard against breaking changes from GitHub's REST API.
2. **`AbortSignal.timeout(8000)`**: Network calls will not hang the Node.js event loop indefinitely. If GitHub stalls, it cleanly cancels the socket and throws `504 Gateway Timeout`.
3. **Rate Limit Detection**: GitHub communicates throttling either via status `429` OR status `403` with header `x-ratelimit-remaining: 0`. Both cases are unified into a user-friendly `429` status.
4. **Token Agnostic**: Works without authentication in development (60 requests/hr per IP) and seamlessly switches to token authentication (5,000 requests/hr) when `GITHUB_TOKEN` is injected.

---

## 6. Deep-Dive: In-Memory Caching System (`cache.ts`)

```typescript
interface CacheEntry<T> {
  value: T;
  expires: number;
}
const store = new Map<string, CacheEntry<unknown>>();
```

### Why a Custom Map Instead of Redis or an External Cache?
- **Zero Infrastructure Overhead**: No Redis container or external network hop required for a read-heavy identity card application.
- **Latency**: In-memory retrieval takes $< 0.1 \text{ ms}$ (pure memory pointer dereference).
- **Graceful Eviction**:
  ```typescript
  export function set<T>(key: string, value: T, ttlMs: number): void {
    if (store.size >= 500) {
      const firstKey = store.keys().next().value;
      if (firstKey !== undefined) store.delete(firstKey);
    }
    store.set(key, { value, expires: Date.now() + ttlMs });
  }
  ```
  JavaScript Maps iterate in insertion order. When the cache hits 500 entries, evicting `store.keys().next().value` performs a **$O(1)$ FIFO eviction**, bounding RAM usage to under ~10 MB.
- **Lazy Expiration**: On `get(key)`, if `Date.now() > entry.expires`, it deletes the stale key and returns `null`.

---

## 7. Deep-Dive: Language Aggregation Engine (`languages.ts`)

### Parallel Language Byte Fetching
```typescript
export async function fetchLanguageMaps(repos: RawRepo[]): Promise<Record<string, number>[]> {
  const settled = await Promise.allSettled(
    repos.map((r) => gh<Record<string, number>>(`/repos/${r.owner.login}/${r.name}/languages`))
  );
  return settled
    .filter((s): s is PromiseFulfilledResult<Record<string, number>> => s.status === "fulfilled")
    .map((s) => s.value);
}
```

### Why `Promise.allSettled` Over `Promise.all`?
If a developer has 10 repos and 1 of them was deleted, moved, or turned private mid-operation:
- `Promise.all` would reject immediately, failing the entire card request.
- `Promise.allSettled` allows 9 successful responses to be aggregated while silently dropping the single failure.

### Normalization and Noise Filtering
1. **The Jupyter Notebook Problem**: Repositories containing Jupyter Notebooks report millions of bytes of JSON and embedded base64 plots, skewing language stats by 80–90%. `config.IGNORED_LANGUAGES.has("Jupyter Notebook")` drops this noise.
2. **Top 4 + "Other" Consolidation**: Languages ranked 5th and below are summed into an `"Other"` category to prevent UI clutter.
3. **Percentage Rounding**: Rounded to 1 decimal place (`Math.round(percent * 10) / 10`).

---

## 8. Deep-Dive: Activity Summarizer & Streak Calculation

### Rolling 30-Day Activity Window (`activity.ts`)
- Queries GitHub's `/events/public`.
- Filters events within `cutoff = now - 30 * 86400000`.
- **Commit Extraction**: Push events on GitHub don't store commits linearly. The parser checks `payload.size ?? payload.commits?.length ?? 1`.
- **Pull Requests**: Increments only when `payload.action === "opened"` (ignoring close/edit noise).

### Streak Calculation (`calcStreaks`)
```typescript
function calcStreaks(days: { date: string; count: number }[], today = new Date().toISOString().slice(0, 10)) {
  const sorted = days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, run = 0;
  for (const d of sorted) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i]!.count > 0) current++;
    else if (i === sorted.length - 1 && sorted[i]!.date === today) continue; // Today's grace period!
    else break;
  }
  return { current, longest };
}
```

#### The "Today Grace Period" Pattern:
If an engineer committed every day for 20 days, and checks their card at 9:00 AM today (before writing their first commit of the day), their streak should **not** show 0.
Line 111 inspects `i === sorted.length - 1 && date === today`. If today has 0 commits, it treats today as a grace period and continues counting the active streak from yesterday.

### Deterministic Serial Number Generation
```typescript
function serialFor(login: string, id: number): string {
  return String(id % 100000).padStart(5, "0") + "-" + login.slice(0, 3).toUpperCase();
}
```
Uses the user's permanent numerical GitHub user ID modulo 100,000, padded to 5 digits, suffixed with the first 3 characters of their username capitalized.
- Example: GitHub ID `583231` for user `octocat` $\to$ `83231-OCT`.

---

## 9. Defensive Security, Rate Limiting & Error Management (`app.ts`)

```typescript
export const app: Express = express();
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

app.use("/api", rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down" },
}));
```

### Security Measures:
1. **Reverse Proxy Trust**: `app.set("trust proxy", 1)` instructs Express to read `X-Forwarded-For` from the immediate reverse proxy (Vercel/Cloudflare). Without this, the rate limiter would see the reverse proxy's IP and throttle all users globally.
2. **Strict Regex Whitelisting**:
   ```typescript
   const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
   ```
   Enforces GitHub's official rules: 1–39 alphanumeric characters, hyphens allowed only between alphanumeric characters (no leading, trailing, or double hyphens). Prevents SSRF or command injection attempts.
3. **Information Leakage Prevention**:
   ```typescript
   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
     const status = typeof err.status === "number" ? err.status : 500;
     if (status === 500) console.error(err); // Server-side log only
     res.status(status).json({
       error: status === 500 ? "Internal server error" : err.message,
     });
   });
   ```
   Internal stack traces or system paths are never returned to clients on 500 errors.

---

## 10. Edge Cases & How They Are Handled

| Edge Case Scenario | Potential Failure | HackTheCard Handling Strategy |
| :--- | :--- | :--- |
| **User has 0 public repositories** | Division by zero in ranking / empty cards | Gracefully falls back to archetype `"Developer in Progress"`, empty repo array, and clean zero-state stats. |
| **User has only forked repositories** | Fork filter removes all repos | When `pool.length === 0`, pool relaxes to include forks. Archetype classifies as `"Open Source Contributor"`. |
| **User with 100+ repos (e.g. Torvalds)** | Payload bloat, slow language processing | Caps repository intake at latest 100 sorted by push date; only samples languages for top 10 ranked repos. |
| **GitHub API Rate Limit Hit** | Crash or unhandled 403 error | Catches 429 and 403 with `x-ratelimit-remaining === "0"`; maps to clean HTTP 429 `"GitHub rate limit reached"`. |
| **Upstream Network Lag / Hang** | Worker thread blocked indefinitely | `AbortSignal.timeout(8000)` aborts request after 8 seconds and maps to HTTP 504. |
| **External Contributions Scraper Down** | Card generation completely blocked | Contribution fetch wrapped in `.catch(() => null)`. Card still renders repos and languages without calendar. |
| **Repository with no detected language** | `null` crashes language map | Language field defaults to `null` or `"Open Source"`; filtered gracefully in byte aggregation. |

---

## 11. Time & Space Complexity Analysis (Big-O)

### Time Complexity: $O(N \log N + M)$
- **Fetch Step**: $O(1)$ network bounded by 8s timeout.
- **Filtering & Ranking**: For $N$ repositories (capped at 100):
  - Scoring: $O(N)$ linear scan.
  - Sorting: $O(N \log N)$ quicksort/timsort where $N \le 100$, taking $< 1 \text{ ms}$.
- **Language Fetching**: Fetches top $K=10$ repos in parallel: $O(K)$.
- **Language Aggregation**: For $M$ language entries across 10 repos ($M \le 100$): $O(M \log M)$ to sort top languages.
- **Streak Calculation**: For 365 days of contributions ($D = 365$): $O(D)$ linear pass.
- **Total Runtime**: Sub-millisecond compute time ($< 3 \text{ ms}$) plus network latency.

### Space Complexity: $O(1)$ Auxiliary Memory
- Data structures are strictly bounded:
  - Repositories: Max 100 objects.
  - Languages: Max 10 maps.
  - Cache: Bounded at 500 keys ($\sim 10 \text{ MB}$ max heap memory).

---

## 12. Top 10 Interview Questions & Model Answers

### Q1: "Walk me through the backend architecture of this application."
**Answer:**  
*"The backend is built with Express and TypeScript in a cleanly partitioned architecture. It exposes a single resource-oriented REST endpoint `/api/card/:username`. It can deploy either as a long-running Node service or as a Vercel Serverless Function.*  
*When a request arrives, it passes through security middleware—including a reverse-proxy aware rate limiter and strict username regex validation. It checks an in-memory TTL cache. On a cache miss, an orchestrator service dispatches concurrent requests to GitHub's REST API and contribution providers using `Promise.all`. The returned raw data flows through pure, deterministic pipeline stages: multi-factor repository ranking, parallel language byte aggregation, a 30-day activity window analyzer, and an archetype classification heuristic before being cached and returned."*

---

### Q2: "How did you design the repository ranking algorithm? Why not sort by stars?"
**Answer:**  
*"Sorting purely by stars produces poor results for developers whose most popular project is an ancient, unmaintained repository or an external fork. I designed a multi-factor formula evaluating 5 dimensions: stars, forks, recency, code substance, and presentation.*  
*To handle extreme variance in stars and forks, I used logarithmic scaling relative to the user's personal maximum: $\log_{10}(1 + \text{stars}) / \log_{10}(1 + \text{maxStars})$. For recency, I implemented exponential decay with a 180-day time constant $\tau$: $\exp(-\text{days}/180)$ (yielding an effective half-life of $\sim 125$ days and $1/e \approx 37\%$ score at 6 months), ensuring actively maintained software ranks higher. I also applied a 50% penalty to archived repositories and excluded forks and profile READMEs."*

---

### Q3: "Why did you use `Promise.allSettled` instead of `Promise.all` when fetching languages?"
**Answer:**  
*"I use `Promise.all` for the primary fetch because the card cannot exist without user and repository data. However, for language maps across the top 10 repositories, I use `Promise.allSettled`. If one repository out of 10 was deleted or has restricted permissions, `Promise.all` would fail fast and reject the entire card generation. `Promise.allSettled` allows the 9 successful responses to be aggregated while gracefully dropping the single failure."*

---

### Q4: "How does your caching strategy work, and why not use Redis?"
**Answer:**  
*"For this project, an external Redis cache would add unnecessary infrastructure complexity, network latency, and operational cost. I implemented an in-memory cache using JavaScript's native `Map` with a 10-minute TTL.*  
*To prevent memory leaks on high-volume traffic, I enforced a capacity ceiling of 500 entries. Because JavaScript Maps iterate in insertion order, evicting `store.keys().next().value` gives us an $O(1)$ FIFO eviction policy. Additionally, all responses return `Cache-Control: public, max-age=300`, leveraging browser and CDN caching to reduce load on the backend."*

---

### Q5: "How do you handle GitHub API rate limits?"
**Answer:**  
*"GitHub limits unauthenticated requests to 60/hr per IP and authenticated requests to 5,000/hr. My client handles this on four levels: First, support for a `GITHUB_TOKEN` environment variable in production. Second, aggressive in-memory caching so repeated lookups for the same user hit memory in $< 10 \text{ ms}$. Third, an IP-based rate limiter (30 requests/min) on the Express route to prevent single-client abuse. Fourth, intercepting status 429 and status 403 with `x-ratelimit-remaining: 0` to return a standardized HTTP 429 error message."*

---

### Q6: "How did you handle the streak calculation edge case for 'today'?"
**Answer:**  
*"In GitHub activity calendars, if a developer has a 50-day streak and loads their card in the morning before making their daily commit, today's commit count is 0. A naive backwards loop would see 0 and immediately reset their current streak to 0.*  
*I solved this by introducing a 'today grace period': when scanning backward from today, if the final day is today and its count is 0, the loop skips it and evaluates yesterday. If yesterday has commits, the streak continues uninterrupted."*

---

### Q7: "Why is your archetype classification deterministic rather than using an LLM?"
**Answer:**  
*"Using an LLM for classification introduces three major issues: high API latency (1–3 seconds), non-deterministic output where the same developer gets different titles on refresh, and high operational cost.*  
*Instead, I built a deterministic decision cascade based on empirical developer metrics: language percentage shares, verified topic tags, and keyword pattern matching across repository descriptions. It executes in microseconds, is 100% reproducible, and is easily unit-tested."*

---

### Q8: "What happens if a user inputs an invalid username or attempts injection?"
**Answer:**  
*"Before any network call is dispatched, the username is validated against `/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i`. This matches GitHub's exact specification: 1–39 alphanumeric characters, no leading or trailing hyphens, and no double hyphens. Any invalid input immediately throws an `HttpError(400, 'Invalid GitHub username')` without wasting API quota or risking path injection."*

---

### Q9: "Why is `app.set('trust proxy', 1)` necessary?"
**Answer:**  
*"In modern cloud deployments (like Vercel, Render, or behind AWS ALB), traffic passes through a reverse proxy. By default, Express treats the immediate TCP connection as the client, which is the proxy's internal IP address. Without `trust proxy`, the rate limiter would treat all incoming global users as coming from the single proxy IP, throttling legitimate users. Enabling `trust proxy` allows Express to inspect the `X-Forwarded-For` header and rate-limit individual client IPs correctly."*

---

### Q10: "How do you ensure testability across these services?"
**Answer:**  
*"I decoupled business logic from network I/O. The ranking engine (`ranking.ts`), language aggregator (`languages.ts`), activity summarizer (`activity.ts`), and streak calculator are pure functions that accept plain objects and return deterministic values without side effects.*  
*This allowed me to write comprehensive unit tests with Vitest covering edge cases: zero repos, all forks, archived repos, Jupyter Notebook filtering, and tie-breaking without needing to mock network requests."*
