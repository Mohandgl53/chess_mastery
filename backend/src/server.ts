import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Chess Coach API server running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`API Base URL: http://localhost:${env.PORT}/api`);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
