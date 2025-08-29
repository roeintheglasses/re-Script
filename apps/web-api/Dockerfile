# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace configurations
COPY packages ./packages

# Copy web-api app
COPY apps/web-api ./apps/web-api

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build --workspace=apps/web-api

# Production stage
FROM node:18-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Set working directory
WORKDIR /app

# Copy built application and dependencies
COPY --from=builder --chown=fastify:nodejs /app/apps/web-api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/apps/web-api/package*.json ./
COPY --from=builder --chown=fastify:nodejs /app/packages ./packages
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER fastify

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV HOST="0.0.0.0"
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3001, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]