# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace configurations
COPY packages ./packages

# Copy CLI app
COPY apps/cli ./apps/cli

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build --workspace=apps/cli

# Production stage
FROM node:18-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 rescript

# Set working directory
WORKDIR /app

# Copy built application and dependencies
COPY --from=builder --chown=rescript:nodejs /app/apps/cli/dist ./dist
COPY --from=builder --chown=rescript:nodejs /app/apps/cli/package*.json ./
COPY --from=builder --chown=rescript:nodejs /app/packages ./packages
COPY --from=builder --chown=rescript:nodejs /app/node_modules ./node_modules

# Create directory for processing files
RUN mkdir -p /app/workspace && chown rescript:nodejs /app/workspace

# Switch to non-root user
USER rescript

# Set environment variables
ENV NODE_ENV=production

# Health check (verify CLI can start)
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=2 \
  CMD node dist/cli/index.js --version || exit 1

# Set working directory for processing
WORKDIR /app/workspace

# Start the CLI (default command)
ENTRYPOINT ["dumb-init", "--", "node", "/app/dist/cli/index.js"]
CMD ["--help"]