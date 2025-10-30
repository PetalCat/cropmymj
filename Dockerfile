# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Rebuild better-sqlite3 with node-gyp directly in the pnpm store
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release

# Copy source code
COPY . .

# Create data directory for database before building
RUN mkdir -p ./data

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install pnpm globally in the production stage
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install production dependencies using pnpm
RUN pnpm install --prod --frozen-lockfile

# Rebuild better-sqlite3 for the production container architecture
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/.svelte-kit ./.svelte-kit

# Create directories for data and images
RUN mkdir -p /app/data /app/images

# Expose port (default, can be changed at runtime)
EXPOSE 8547

# Environment variables (can be overridden at runtime)
ENV NODE_ENV=production

# Start the application
CMD ["node", "build"]