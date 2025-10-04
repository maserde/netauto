# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and configuration files
COPY tsconfig.json tsconfig.dev.json ./
COPY eslint.config.mjs ./
COPY src ./src

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies and tsconfig-paths for runtime
RUN pnpm install --prod --frozen-lockfile && \
    pnpm add tsconfig-paths && \
    pnpm store prune

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy tsconfig.json for tsconfig-paths to resolve path mappings at runtime
COPY --chown=nodejs:nodejs tsconfig.json ./

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Switch to non-root user
USER nodejs

# Expose application port (will be overridden by env)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').request({host: 'localhost', port: process.env.PORT || 3000, path: '/v1/health', timeout: 5000}, (res) => {process.exit(res.statusCode === 200 ? 0 : 1);}).on('error', () => {process.exit(1);}).end();"

# Start the application
CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]