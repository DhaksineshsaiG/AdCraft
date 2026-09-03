import express, { Application, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'express-async-errors'; // Patches Express to catch async errors automatically

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';
import { getDBStatus } from './config/db';

import authRoutes from './routes/auth.routes';
import storeRoutes from './routes/store.routes';
import productRoutes from './routes/product.routes';
import generatedContentRoutes from './routes/generatedContent.routes';
import posterRoutes from './routes/poster.routes';
import exportRoutes from './routes/export.routes';
import growthRoutes from './routes/growth.routes';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  database: {
    isConnected: boolean;
    readyState: number;
    readyStateLabel: string;
  };
}

// â”€â”€â”€ App Factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function createApp(): Application {
  const app: Application = express();

  // â”€â”€ Trust Proxy (required when behind Nginx / load balancer in production)
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // â”€â”€ Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false, // Allow image/video embeds (needed for poster preview)
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: env.NODE_ENV === 'production',
    })
  );

  // â”€â”€ CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        if (env.ALLOWED_ORIGINS.includes(origin) || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error(`CORS: Origin "${origin}" is not allowed.`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
      exposedHeaders: [
        'X-Total-Count',
        'X-Request-ID',
        'Content-Disposition',
        'Content-Type',
        'Content-Length',
      ],
      credentials: true,
      maxAge: 600, // Preflight cache: 10 minutes
    })
  );

  // â”€â”€ Request Compression
  app.use(compression());

  // â”€â”€ HTTP Request Logger
  const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat));

  // â”€â”€ Body Parsers
  app.use(express.json({ limit: '10mb' }));        // JSON bodies (posters may include base64 data)
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (env.NODE_ENV === 'development') {
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');

    app.use('/uploads', express.static(uploadsRoot));
    app.use('/downloads', express.static(uploadsRoot, {
      setHeaders: (res, filePath) => {
        if (path.extname(filePath).toLowerCase() === '.zip') {
          res.setHeader('Content-Type', 'application/zip');
        }
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${path.basename(filePath)}"`
        );
      },
    }));
  }

  // â”€â”€ PostgreSQL Query Injection Sanitizer
  // Strips keys starting with '$' or containing '.' from req.body, req.params, req.query

  // â”€â”€ Global Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,  // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message: 'Too many requests from this IP. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
      },
    },
    skip: (req: Request) => env.NODE_ENV === 'test' || req.ip === '127.0.0.1',
  });
  app.use(globalLimiter);

  // â”€â”€ Request ID Propagation
  app.use((req: Request, res: Response, next) => {
    const requestId =
      (req.headers['x-request-id'] as string) ??
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€ Routes
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const apiBase = `/api/${env.API_VERSION}`;

  // â”€â”€ Health Check
  app.get('/health', (_req: Request, res: Response) => {
    const dbStatus = getDBStatus();

    const payload: HealthCheckResponse = {
      status: dbStatus.isConnected ? 'ok' : 'degraded',
      version: env.API_VERSION,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
    };

    const statusCode = dbStatus.isConnected ? 200 : 503;
    res.status(statusCode).json(payload);
  });

  // â”€â”€ API Root Info
  app.get(apiBase, (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'AI Poster Generator API',
      version: env.API_VERSION,
      docs: `${apiBase}/docs`,
    });
  });

  // â”€â”€ Feature Routes (to be mounted as the project grows)
  app.use(`${apiBase}/auth`,     authRoutes);
  //app.use(`${apiBase}/users`,    userRoutes);
  app.use(`${apiBase}/stores`,   storeRoutes);      // API Integration Service
  app.use(`${apiBase}/products`, productRoutes);    // Product Processing Service
  app.use(`${apiBase}/generated-content`, generatedContentRoutes);
  app.use(`${apiBase}/posters`,  posterRoutes);     // AI Poster Generation Engine
  app.use(`${apiBase}/export`,   exportRoutes);     // Storage and Export Services
  app.use(`${apiBase}/growth`,   growthRoutes);     // AI Growth Agent Service

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€ Error Handling (must be last)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Catch unmatched routes â†’ 404
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
