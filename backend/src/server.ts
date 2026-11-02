import "dotenv/config";
import app from "./app.js";
import { config } from "./config.js";
import { checkGitHubAuth } from "./github.js";

const PORT = config.PORT;

app.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`);
  try {
    const auth = await checkGitHubAuth();
    console.log(
      `GitHub API Rate Limit: ${auth.limit}/hr (remaining: ${auth.remaining}) — ${
        auth.authenticated ? "Authenticated (Token Active)" : "Unauthenticated (Anonymous, 60 req/hr)"
      }`
    );
  } catch (err) {
    console.warn("Could not check GitHub rate limit on startup:", err);
  }
});
