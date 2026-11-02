# Development Guidelines

- **Card Artwork & Themes**: Hand-coded SVG per theme in `frontend/src/components/card/ThemeArt.tsx` with palettes in `frontend/src/lib/themes.ts`. Card internals use inline styles from theme data so PNG export captures exact colors identically on screen and in high-resolution downloads.
- **GitHub Intelligence**: Fetched via the backend API (`backend/src/services/card.ts`) with a client-side fallback in `frontend/src/lib/github.ts`. Developer titles (e.g., The Full-Stack Architect, AI Innovator, Systems Engineer) use deterministic rules based on language shares and repository metadata—never randomness.
- **Card Signature & Details**: Deterministic personal code signature marks and activity highlights use pure browser-safe helpers in `frontend/src/lib/card-details.ts`. Marks are aesthetic decorative representations without inventing false achievements.
- **Project Structure**: Cleanly partitioned into `frontend/` (Vite, React 19, Tailwind CSS v4) and `backend/` (Express API server with optional `GITHUB_TOKEN` support).
