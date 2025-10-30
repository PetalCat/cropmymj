# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN pnpm prisma generate

# Copy source code
COPY . .

# Create data directory for database before building
RUN mkdir -p ./data

# Set DATABASE_URL for build time (Prisma needs it)
ENV DATABASE_URL="file:./data/crops.db"

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally in the production stage
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install ALL dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client for production
COPY prisma ./prisma
RUN pnpm prisma generate

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/.svelte-kit ./.svelte-kit

# Create directories for data and example images
RUN mkdir -p /app/data/images /app/build/client/images

# Expose port (default, can be changed at runtime)
EXPOSE 8547

# Environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV DATABASE_URL="file:./data/crops.db"
ENV IMAGES_PATH="./data/images"
ENV BODY_SIZE_LIMIT=104857600

# Start the application
CMD ["node", "build"]