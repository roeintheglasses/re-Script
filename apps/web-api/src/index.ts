/**
 * Main entry point for re-script web API server
 */

import { createServer } from './server.js';
import { config } from './config/env.js';

async function start() {
  try {
    const server = await createServer();
    
    await server.listen({
      port: config.PORT,
      host: config.HOST,
    });

    console.log(`🚀 Web API server running on http://${config.HOST}:${config.PORT}`);
    console.log(`📊 Environment: ${config.NODE_ENV}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

start();