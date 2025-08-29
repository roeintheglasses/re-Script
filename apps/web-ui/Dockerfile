# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace configurations
COPY packages ./packages

# Copy web-ui app
COPY apps/web-ui ./apps/web-ui

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build --workspace=apps/web-ui

# Production stage
FROM node:18-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-ui/.next/static ./apps/web-ui/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-ui/public ./apps/web-ui/public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web-ui/server.js"]