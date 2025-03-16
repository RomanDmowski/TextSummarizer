import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

interface RateLimitStore {
  timestamp: number;
  count: number;
}

const rateLimits = new Map<string, RateLimitStore>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 2; // Changed from 10 to 2 for testing

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const ip = req.ip;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const current = rateLimits.get(ip);
  if (!current || current.timestamp < windowStart) {
    // First request or window expired
    rateLimits.set(ip, { timestamp: now, count: 1 });
    return next();
  }

  if (current.count >= MAX_REQUESTS) {
    return res.status(429).json({
      message: "Too many requests. Please try again in a minute.",
      retryAfter: Math.ceil((current.timestamp + WINDOW_MS - now) / 1000)
    });
  }

  // Increment the counter
  current.count++;
  rateLimits.set(ip, current);
  next();
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add rate limiting middleware
app.use(rateLimit);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();