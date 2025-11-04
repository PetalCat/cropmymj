# Database Persistence Fix - Deployment Guide

## Problem

The database is clearing on deployment. This happens because:

1. **Docker containers are ephemeral** - data inside containers is lost when they're recreated
2. **Serverless platforms don't support SQLite** - file-based databases don't persist
3. **Named volumes are required** for Docker to persist data across deployments

## ✅ Solution: Proper Docker Setup (Recommended)

**Your Docker configuration now uses named volumes to persist data across deployments.**

### How It Works

The `docker-compose.yml` uses a **named volume** (`cropmymj-data`) instead of a bind mount:

```yaml
volumes:
  # This persists across container rebuilds and restarts
  - cropmymj-data:/app/data
```

The `command` ensures the database is initialized on first run:

```yaml
command: >
  sh -c "pnpm prisma db push --skip-generate &&
         node build"
```

### Deploying with Persistent Database

```bash
# 1. Start the application (first time)
docker-compose up -d

# Database will be automatically initialized
# Data persists in the named volume "cropmymj-data"

# 2. On subsequent deployments (rebuilding)
docker-compose down
docker-compose build
docker-compose up -d

# ✅ Your data in the named volume persists!
```

### Key Points

- **Named volumes** (`cropmymj-data`) persist even when containers are removed
- Database is automatically initialized with `prisma db push` on startup
- Data survives `docker-compose down` (as long as you don't use `-v` flag)
- Images and database are stored in the Docker-managed volume

### Important Commands

```bash
# Deploy/rebuild (SAFE - preserves data)
docker-compose down
docker-compose build
docker-compose up -d

# ❌ DANGER - This deletes all data!
docker-compose down -v

# View logs
docker-compose logs -f

# Check volume
docker volume inspect cropmymj-data

# Backup database from volume
docker run --rm -v cropmymj-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# Restore database to volume
docker run --rm -v cropmymj-data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /
```

## Alternative: VPS/Server Deployment (No Docker)

**For deploying directly on a VPS (DigitalOcean, AWS EC2, etc.):**

```bash
# 1. Clone repository
git clone https://github.com/PetalCat/cropmymj.git
cd cropmymj

# 2. Install dependencies
pnpm install

# 3. Create data directory
mkdir -p ./data/images

# 4. Set up environment
cp .env.example .env
nano .env  # Edit with your settings

# 5. Initialize database
pnpm prisma db push

# 6. Build application
pnpm run build

# 7. Run with PM2 (for persistence)
pm2 start build/index.js --name cropmymj

# 8. Make PM2 restart on server reboot
pm2 startup
pm2 save
```

**On subsequent deployments:**

```bash
cd cropmymj
git pull
pnpm install
pnpm prisma generate
pnpm run build
pm2 restart cropmymj
# Database now persists automatically!
```

### ⚠️ Serverless Platforms (NOT Recommended for SQLite)

**Platforms like Vercel, Netlify, Cloudflare Pages DON'T support SQLite because:**

- File system is read-only or ephemeral
- Each request may run on a different server
- No persistent storage for files

**If you must use serverless, you need to migrate to a hosted database:**

#### Option A: Use Turso (SQLite-compatible, serverless)

```bash
# 1. Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Create database
turso db create cropmymj

# 3. Get connection URL
turso db show cropmymj --url

# 4. Update .env
DATABASE_URL="libsql://your-database.turso.io?authToken=your-token"

# 5. Deploy to Vercel/Netlify
# Database now persists across deployments!
```

#### Option B: Use PostgreSQL (Railway, Supabase, etc.)

```bash
# 1. Update prisma/schema.prisma
datasource db {
  provider = "postgresql"  # Changed from sqlite
  url      = env("DATABASE_URL")
}

# 2. Get PostgreSQL URL from your provider
# Example: postgresql://user:pass@host:5432/dbname

# 3. Update .env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 4. Create migration
pnpm prisma migrate dev --name init

# 5. Deploy
# Database now persists in the cloud!
```

## Backup and Restore

**If you've lost data and want to prevent it:**

#### Create automated backups:

```bash
#!/bin/bash
# backup.sh - Run this daily with cron

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp ./data/crops.db "$BACKUP_DIR/crops_$DATE.db"

# Backup images
tar -czf "$BACKUP_DIR/images_$DATE.tar.gz" ./data/images

# Keep only last 7 days
find $BACKUP_DIR -name "crops_*.db" -mtime +7 -delete
find $BACKUP_DIR -name "images_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Set up cron job:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/cropmymj/backup.sh >> /path/to/cropmymj/backup.log 2>&1
```

#### Restore from backup:

```bash
# Stop application
docker-compose down
# or
pm2 stop cropmymj

# Restore database
cp ./backups/crops_20251104_020000.db ./data/crops.db

# Restore images
tar -xzf ./backups/images_20251104_020000.tar.gz -C ./data

# Restart application
docker-compose up -d
# or
pm2 start cropmymj
```

## Troubleshooting

### Database keeps resetting after rebuilding Docker image

**Problem:** Running `docker-compose down` removes volumes

**Solution:** Use `docker-compose down` (WITHOUT `-v` flag)

```bash
# ❌ DON'T DO THIS (deletes volumes)
docker-compose down -v

# ✅ DO THIS (preserves volumes)
docker-compose down
```

### Database file exists but has no data

**Problem:** Database not initialized

**Solution:**

```bash
# For Docker
docker-compose run cropmymj pnpm prisma db push

# For non-Docker
pnpm prisma db push
```

### Permission denied errors with database

**Problem:** Docker container can't write to mounted volume

**Solution:**

```bash
# Fix permissions on host
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data

# Or run container with user
docker-compose run --user $(id -u):$(id -g) cropmymj pnpm prisma db push
```

### Database locked errors

**Problem:** Multiple processes accessing SQLite database

**Solution:**

```bash
# Check running processes
docker ps
pm2 list

# Stop all instances
docker-compose down
pm2 stop all

# Start only one instance
docker-compose up -d
```

## Best Practices

1. **Always use volume mounts** in Docker
2. **Never use `-v` flag** with `docker-compose down`
3. **Set up automated backups** (daily recommended)
4. **Keep backups in different location** than production server
5. **Test restore process** regularly
6. **Use migrations** for schema changes (see PRISMA.md)
7. **Monitor disk space** in `./data` directory

## Quick Check: Is My Database Persistent?

Run this test:

```bash
# 1. Create a test submission through the web UI

# 2. Check database has data
sqlite3 ./data/crops.db "SELECT COUNT(*) FROM crops;"
# Should show number > 0

# 3. Restart your deployment
docker-compose restart
# or
pm2 restart cropmymj

# 4. Check database again
sqlite3 ./data/crops.db "SELECT COUNT(*) FROM crops;"
# Should show SAME number

# 5. Rebuild and restart
docker-compose down && docker-compose up -d --build
# or
pm2 stop cropmymj && pnpm run build && pm2 start cropmymj

# 6. Check database one more time
sqlite3 ./data/crops.db "SELECT COUNT(*) FROM crops;"
# Should STILL show same number!
```

If the count drops to 0 at any step, your database is NOT persistent.

## Migration from Non-Persistent Setup

If you're currently losing data and want to fix it:

```bash
# 1. Export current data (before next deployment)
node -e "const prisma = require('@prisma/client').PrismaClient; const db = new prisma(); db.crop.findMany().then(d => console.log(JSON.stringify(d)))" > crops_export.json

# 2. Set up proper volume mounts (see Solution 1)

# 3. Deploy with persistent setup

# 4. Import old data (if needed)
# Create a script to re-import from crops_export.json
```

## Still Having Issues?

Check:

1. **Where are you deploying?** (Docker, VPS, Vercel, etc.)
2. **Do you see `./data` directory with `crops.db` inside?**
3. **Does `docker-compose.yml` have volume mounts?**
4. **Are you using `-v` flag with `docker-compose down`?**
5. **Is your deployment platform compatible with SQLite?**

Share the answers and we can diagnose further!
