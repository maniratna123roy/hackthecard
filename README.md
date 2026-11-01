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
│   │   ├── routes/
│   │   │   ├── developer.ts      # GET /api/developer/:username
│   │   │   └── health.ts         # GET /api/health
│   │   ├── services/
│   │   │   ├── githubService.ts  # GitHub REST & contribution parsing
│   │   │   └── githubService.test.ts
│   │   └── server.ts             # Express server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── frontend/
│   ├── public/                   # Favicon & robot assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── card/             # CollectibleCard, ThemeArt, CardLoader
│   │   │   └── landing/          # Hero, SiteHeader, Manifesto
│   │   ├── lib/
│   │   │   ├── api.ts            # Backend API client with offline fallback
│   │   │   ├── card-details.ts   # Deterministic signature & activity helpers
│   │   │   ├── github.ts         # Types, palettes, fallback client fetch
│   │   │   ├── themes.ts         # 12 thematic color & art configurations
│   │   │   └── utils.ts
│   │   ├── test/                 # Component and unit tests
│   │   ├── App.tsx               # Main application component
│   │   ├── main.tsx              # React DOM mounting
│   │   └── styles.css            # Tailwind CSS v4 & brutalist theme system
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
│
├── project.md                    # Detailed documentation of every file and code unit
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

### Running Tests

```bash
npm test
```

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
