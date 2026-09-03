import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServerInstance {
  httpServer: http.Server;
  shutdown: () => Promise<void>;
}

// ─── Unhandled Rejection / Exception Guards ───────────────────────────────────
// Register these BEFORE anything async so even startup errors are caught.

process.on('uncaughtException', (error: Error) => {
  console.error('[Server] Uncaught Exception — shutting down.', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;

  console.error('[Server] Unhandled Promise Rejection — shutting down.', { message, stack });
  process.exit(1);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function gracefulShutdown(
  signal: string,
  server: http.Server
): Promise<void> {
  console.info(`\n[Server] ${signal} received — starting graceful shutdown...`);

  return new Promise((resolve) => {
    // Stop accepting new connections; wait for in-flight requests to finish
    server.close(async (err) => {
      if (err) {
        console.error('[Server] Error closing HTTP server:', err.message);
      } else {
        console.info('[Server] HTTP server closed.');
      }

      try {
        await disconnectDB();
        console.info('[Server] Shutdown complete.');
      } catch (dbErr) {
        const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
        console.error('[Server] Error disconnecting DB during shutdown:', message);
      } finally {
        resolve();
        process.exit(0);
      }
    });

    // Force-kill if graceful shutdown takes too long (30s)
    setTimeout(() => {
      console.error('[Server] Graceful shutdown timed out — forcing exit.');
      process.exit(1);
    }, 30_000);
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<ServerInstance> {
  console.info(`[Server] Starting AI Poster Generator API...`);
  console.info(`[Server] Environment: ${env.NODE_ENV}`);
  console.info(`[Server] Node.js: ${process.version}`);

  // 1. Connect to PostgreSQL
  await connectDB();

  // 2. Build Express app
  const app = createApp();

  // 3. Create HTTP server
  const httpServer = http.createServer(app);

  // 4. Configure keep-alive settings (important for production reverse proxies)
  httpServer.keepAliveTimeout = 65_000;   // Must be > typical LB idle timeout (60s)
  httpServer.headersTimeout = 70_000;     // Must be > keepAliveTimeout

  // 5. Start listening
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(env.PORT, () => {
      console.info(
        `[Server] HTTP server is listening on port ${env.PORT} | http://localhost:${env.PORT}`
      );
      console.info(`[Server] API Base: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
      console.info(`[Server] Health:   http://localhost:${env.PORT}/health`);
      resolve();
    });

    httpServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${env.PORT} is already in use.`);
      }
      reject(err);
    });
  });

  // 6. Register shutdown signals
  const shutdown = () => gracefulShutdown('SIGTERM', httpServer);

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', httpServer));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', httpServer));

  return { httpServer, shutdown };
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

bootstrap().catch((error: Error) => {
  console.error('[Server] Failed to start:', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
