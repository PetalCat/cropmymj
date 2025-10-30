# Docker Deployment Guide

## Quick Start with Docker

### Option 1: Using docker-compose (Recommended)

1. **Clone the repository**:

   ```bash
   git clone https://github.com/PetalCat/cropmymj.git
   cd cropmymj
   ```

2. **Start the application**:

   ```bash
   docker-compose up -d
   ```

3. **Access the app**:
   Open your browser to `http://localhost:8547`

4. **View logs**:

   ```bash
   docker-compose logs -f
   ```

5. **Stop the application**:
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker commands

1. **Build the image**:

   ```bash
   docker build -t cropmymj .
   ```

2. **Run with default settings**:

   ```bash
   docker run -d -p 8547:8547 \
     -e PORT=8547 \
     -e HOST=0.0.0.0 \
     --name cropmymj-container cropmymj
   ```

3. **Run with custom environment variables**:

   ```bash
   docker run -d -p 8547:8547 \
     -e PORT=8547 \
     -e HOST=0.0.0.0 \
     -e SITE_PASSWORD=mysecurepassword \
     -e API_TOKENS=token1,token2 \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/static/images:/app/images \
     --name cropmymj-container cropmymj
   ```

4. **Run with .env file**:
   ```bash
   docker run -d -p 8547:8547 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/static/images:/app/images \
     --name cropmymj-container cropmymj
   ```

## PowerShell Commands (Windows)

```powershell
# Build
docker build -t cropmymj .

# Run with environment variables
docker run -d -p 8547:8547 `
  -e PORT=8547 `
  -e HOST=0.0.0.0 `
  -e SITE_PASSWORD=mysecurepassword `
  -v ${PWD}/data:/app/data `
  -v ${PWD}/static/images:/app/images `
  --name cropmymj-container cropmymj

# View logs
docker logs cropmymj-container

# Stop and remove
docker stop cropmymj-container
docker rm cropmymj-container
```

## Environment Variables

All environment variables can be set at runtime:

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `SITE_PASSWORD` - Optional password protection
- `API_TOKENS` - Comma-separated API tokens
- `DB_PATH` - Database path (default: /app/data/crops.db)
- `IMAGES_PATH` - Images directory (default: /app/images)

See `.env.example` for more details.

## Updating Environment Variables

To change environment variables without rebuilding:

```bash
# Stop and remove the old container
docker stop cropmymj-container
docker rm cropmymj-container

# Run with new variables
docker run -d -p 9000:9000 \
  -e PORT=9000 \
  -e HOST=0.0.0.0 \
  --name cropmymj-container cropmymj
```

## Persisting Data

Use volume mounts to persist your database and images:

```bash
-v $(pwd)/data:/app/data \
-v $(pwd)/static/images:/app/images
```

This ensures your data survives container restarts and updates.
