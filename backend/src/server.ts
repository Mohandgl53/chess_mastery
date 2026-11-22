import { createApp } from './app.js';
import { env } from './config/env.js';
import { emailService } from './services/email.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Chess Coach API server running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`API Base URL: http://localhost:${env.PORT}/api`);

  // Verify email transport connection asynchronously on startup
  emailService.verifyConnection().then((res) => {
    if (res.ok) {
      console.log(`[EmailService] Connection status: ${res.message}`);
    } else {
      console.warn(`[EmailService] Connection warning: ${res.message}`);
    }
  }).catch((err) => {
    console.warn(`[EmailService] Connection check failed: ${err?.message}`);
  });
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
