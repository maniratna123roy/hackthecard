import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import * as cache from "./cache.js";
import { HttpError } from "./errors.js";
import { buildCard, type CardData } from "./services/card.js";
import { config } from "./config.js";

export const app: Express = express();

app.set("trust proxy", 1); // correct client IP behind reverse proxy / Vercel
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

// Rate limiter: 30 requests per minute per IP
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, slow down" },
  }),
);

// GitHub rule: 1-39 chars, letters/digits/hyphens, no leading/trailing hyphen
const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Card generation endpoint handler
async function handleCardRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUsername = req.params.username;
    const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;
    if (!username || typeof username !== "string" || !USERNAME_RE.test(username)) {
      throw new HttpError(400, "Invalid GitHub username");
    }

    const key = username.toLowerCase();
    const hit = cache.get<CardData>(key);
    if (hit) {
      return res.json({
        ...hit,
        meta: { ...hit.meta, cached: true },
      });
    }

    const card = await buildCard(username);
    cache.set(key, card, config.CACHE_TTL_MS);

    res.set("Cache-Control", "public, max-age=300");
    res.json(card);
  } catch (err) {
    next(err);
  }
}

app.get("/api/card/:username", handleCardRequest);
app.get("/api/developer/:username", handleCardRequest);

// 404 handler for API routes
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err.status === "number" ? err.status : 500;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
});

export default app;
