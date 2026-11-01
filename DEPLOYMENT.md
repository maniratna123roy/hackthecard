# HackTheCard — Deployment Guide

This guide details how to deploy the **HackTheCard** application (Frontend + Backend API) to production.

---

## 1. Prerequisites: Generate a GitHub Personal Access Token

GitHub limits unauthenticated API requests to **60 per hour per IP**. In production, multiple users sharing an IP or server will quickly hit this limit. A fine-grained GitHub token increases this to **5,000 requests per hour**.

1. Go to **GitHub** → **Settings** → **Developer Settings** → **Personal Access Tokens** → **Fine-grained tokens** (or Tokens classic).
2. Click **Generate new token**.
3. **Permissions**: No extra repository permissions are required because the app only reads **public data**.
4. Copy the token (starts with `github_pat_` or `ghp_`).
5. **Security Note**: Never commit `.env` or your token to GitHub. It should only be set in your host's environment settings.

---

## 2. Deployment Architecture Options

| Option | Frontend Host | Backend Host | In-Memory Cache Behavior | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Option A (Recommended)** | **Vercel** / **Netlify** | **Render** / **Railway** | **Persistent** (stays warm continuously) | Best performance & cache hits |
| **Option B (Serverless)** | **Vercel** | **Vercel Functions** | Ephemeral (resets on cold start) | Zero-server setup |
| **Option C (Docker / VPS)** | **Self-hosted / VPS** | **Self-hosted / VPS** | **Persistent** | Complete control / DigitalOcean |

---

## 3. Option A: Split Deployment (Vercel Frontend + Render/Railway Backend)

### Step 1: Deploy Backend on Render or Railway

#### On Render (render.com):
1. Sign up / Log in to [Render](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your repository: `maniratna123roy/pixel-perfect-match`.
4. Fill in the service settings:
   - **Name**: `hackthecard-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `PORT`: `3001` (or leave default assigned by Render)
   - `GITHUB_TOKEN`: `<your-github-token>`
   - `ALLOWED_ORIGIN`: `*` (or your frontend domain once deployed)
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://hackthecard-api.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your repository: `maniratna123roy/pixel-perfect-match`.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, set:
   - `VITE_API_URL`: `https://hackthecard-api.onrender.com` (your backend URL)
6. Click **Deploy**.

---

## 4. Option B: Unified Deployment on Vercel

If you prefer running both Frontend and Backend on Vercel under a single domain:

1. In the project root, ensure `vercel.json` exists:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" }
  ]
}
```
2. Export the Express application via `api/index.ts`:
```typescript
import app from "../backend/src/app.js";
export default app;
```
3. In Vercel Project Settings → **Environment Variables**:
   - `GITHUB_TOKEN`: `<your-github-token>`
4. Deploy using `vercel --prod` or by pushing to `main`.

---

## 5. Option C: Docker Deployment

You can containerize the application for deployment on Fly.io, AWS ECS, or DigitalOcean App Platform.

### `backend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

Build and run:
```bash
docker build -t hackthecard-backend ./backend
docker run -p 3001:3001 -e GITHUB_TOKEN="your_token" hackthecard-backend
```

---

## 6. Post-Deployment Verification Checklist

Once deployed, run these 4 verification tests (as recommended in the build guide):

### 1. Health Probe Test
```bash
curl -i https://<your-backend-domain>/api/health
```
- **Expected response**: `200 OK`
- **Body**: `{"ok":true}`

### 2. High-Activity User Test (e.g., Torvalds)
```bash
curl -i https://<your-backend-domain>/api/card/torvalds
```
- **Expected response**: `200 OK`
- **Verification**: Profile object populated, `topRepos` has 5 ranked repositories, `languages` has byte percentages, and `meta.cached: false` on first request.
- Repeat the curl immediately: `meta.cached` should now be `true` (served from the 10-minute in-memory cache).

### 3. Small / Fork-Heavy Account Test
```bash
curl -i https://<your-backend-domain>/api/card/<small-username>
```
- **Expected response**: `200 OK`
- **Verification**: If an account has few repos or mostly forks, the fallback logic ensures a card is still produced without breaking.

### 4. Non-Existent User Test (404 Handling)
```bash
curl -i https://<your-backend-domain>/api/card/this-user-does-not-exist-xyz-999
```
- **Expected response**: `404 Not Found`
- **Body**: `{"error":"GitHub user not found"}`

### 5. Invalid Username Regex Test (400 Handling)
```bash
curl -i https://<your-backend-domain>/api/card/-bad-username-
```
- **Expected response**: `400 Bad Request`
- **Body**: `{"error":"Invalid GitHub username"}`

---

## 7. Production Troubleshooting & FAQ

### Q: Why do I get a 429 "GitHub rate limit reached"?
**Cause**: The server is either missing `GITHUB_TOKEN` or is running in a shared IP pool without a token.  
**Fix**: Ensure `GITHUB_TOKEN` is set in the host dashboard. Verify in the logs that requests are sent with the `Authorization` header.

### Q: Why do language calls sometimes take 1-2 seconds?
**Cause**: The backend fetches languages for the top 10 repos in parallel (`Promise.allSettled`).  
**Fix**: Once fetched, results are cached for 10 minutes in memory. Subsequent calls for the same user return in `<10ms`.

### Q: Are stack traces exposed on 500 errors?
**No**: The central error handler in `backend/src/app.ts` checks:
```typescript
res.status(status).json({
  error: status === 500 ? 'Internal server error' : err.message,
});
```
Server internals and stack traces are logged server-side only and never leaked to the client.
