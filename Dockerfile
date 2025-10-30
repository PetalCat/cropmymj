# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm globally in the production stage
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./

# Install production dependencies using pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/.svelte-kit ./.svelte-kit

# Create directories for data and images
RUN mkdir -p /app/data /app/images

# Expose port
EXPOSE 8547

# Environment variables (can be overridden at runtime)
ENV NODE_ENV=production