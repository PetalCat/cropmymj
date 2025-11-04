# Build stage
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN pnpm prisma generate

# Copy source code
COPY . .

# Set a dummy DATABASE_URL for build time (required by Prisma Client)
ENV DATABASE_URL="file:./data/crops.db"

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy prisma schema
COPY prisma ./prisma

# Install production dependencies AND Prisma CLI
RUN pnpm install --prod --frozen-lockfile && pnpm add -D prisma

# Generate Prisma Client
RUN pnpm prisma generate

# Copy built application from builder
COPY --from=builder /app/build ./build

# Create directories for SQLite database and images
RUN mkdir -p /app/data/images

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/crops.db"
ENV IMAGES_PATH="/app/data/images"
ENV BODY_SIZE_LIMIT=104857600
ENV PORT=8547
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8547

# Start the application
CMD ["node", "build"]