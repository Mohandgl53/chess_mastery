import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authContext } from './middleware/authContext.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration — exact origins only, credentials required for session cookies
  const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, server-to-server, automated tests)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // Body Parsing with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Cookie Parser — required for session cookie reading
  app.use(cookieParser());

  // CSRF Protection — validates Origin header for unsafe methods
  app.use(csrfProtection);

  // Session Authentication Context
  // Attempts to authenticate the request via session cookie.
  // Does not reject unauthenticated requests — requireAuth middleware does that.
  app.use(authContext);

  // Mount API Routes
  app.use('/api', apiRouter);

  // 404 & Centralized Error Handlers
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
