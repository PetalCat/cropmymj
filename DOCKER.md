# Docker Deployment Guide

## Quick Start with Docker

### Using docker-compose (Recommended)

**This setup uses a named volume for automatic database persistence.**

1. **Clone the repository**:

   ```bash
   git clone https://github.com/PetalCat/cropmymj.git
   cd cropmymj
   ```

2. **Configure environment** (optional):

   ```bash
   cp .env.example .env
   # Edit .env with your settings (SITE_PASSWORD, API_TOKENS, etc.)
   ```

3. **Start the application**:

   ```bash
   docker-compose up -d
   ```

   This will:
   - Build the Docker image
   - Create a named volume (`cropmymj-data`) for persistent storage
   - Initialize the database automatically with `prisma db push`
   - Start the application

4. **Access the app**:
   Open your browser to `http://localhost:8547`

5. **View logs**:

   ```bash
   docker-compose logs -f
   ```

6. **Stop the application**:
   ```bash
   docker-compose down  # Data persists in the named volume
   ```

### Deploying Updates (Rebuild)

```bash
# Stop containers
docker-compose down

# Rebuild image with latest code
docker-compose build

# Start with new image (database persists automatically!)
docker-compose up -d
```

**Important:** Do NOT use `docker-compose down -v` as this will delete your data volume!

## Data Persistence

Your database and uploaded images are stored in a Docker named volume (`cropmymj-data`). This volume:

- Persists across container restarts and rebuilds
- Survives `docker-compose down`
- Only gets deleted if you explicitly use `-v` flag or run `docker volume rm cropmymj-data`

To inspect the volume:

```bash
docker volume inspect cropmymj-data
```

To backup the volume:

```bash
docker run --rm -v cropmymj-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
```

To restore from backup:

```bash
docker run --rm -v cropmymj-data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /
```

## Advanced: Docker Run Commands

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
     --name cropmymj-container cropmymj
   ```

4. **Run with .env file**:
   ```bash
   docker run -d -p 8547:8547 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
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
-v $(pwd)/data:/app/data
```

This mounts your local `data/` directory to the container, which includes:

- `data/crops.db` - SQLite database
- `data/images/` - Uploaded images

This ensures your data survives container restarts and updates.
