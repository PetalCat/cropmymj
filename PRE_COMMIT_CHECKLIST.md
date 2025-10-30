# Pre-Commit Checklist for Website Directory

## Security ✅

- [x] `.env` file in `.gitignore`
- [x] `.env.example` created with safe defaults
- [x] No hardcoded passwords or tokens in code
- [x] Debug endpoint removed
- [x] Database files in `.gitignore`

## Code Quality ✅

- [x] TypeScript configured properly
- [x] Prettier formatting configured
- [x] Console.log statements conditional/removed
- [x] Environment variables via `$env/static/private`
- [x] Proper error handling in API routes

## Docker ✅

- [x] Dockerfile created with multi-stage build
- [x] .dockerignore configured
- [x] Health check implemented
- [x] Node adapter configured in svelte.config.js
- [x] @sveltejs/adapter-node in package.json

## Documentation ✅

- [x] README.md with setup instructions
- [x] API documentation complete
- [x] .env.example with all variables
- [x] Comments in key files

## Testing Before Commit

```bash
# 1. Check TypeScript
npm run check

# 2. Format code
npm run format

# 3. Build for production
npm run build

# 4. Test production build
npm run preview

# 5. Test Docker build
docker build -t crop-my-mj .

# 6. Test Docker run (adjust paths)
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e SITE_PASSWORD=test \
  -e API_TOKENS=test \
  crop-my-mj

# 7. Test endpoints
curl http://localhost:3000/api/images
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test"}'
```

## Files to Commit

### Core Application

- `src/` - All source code
- `static/` - Static assets
- `package.json` & `package-lock.json`
- `svelte.config.js`
- `vite.config.ts`
- `tsconfig.json`

### Docker

- `Dockerfile`
- `.dockerignore`

### Configuration

- `.env.example` (NOT .env)
- `.gitignore`

### Documentation

- `README.md`
- `docs/` directory

### Data Structure (empty/README only)

- `data/README.md` (not .db files)

## Files NOT to Commit

- `.env` (actual secrets)
- `node_modules/`
- `build/`
- `.svelte-kit/`
- `data/*.db` (databases)
- `*.log`

## Git Commands

```bash
# Review what will be committed
git status

# Add all appropriate files
git add -A

# Review again
git status

# Commit
git commit -m "Initial release: Image classification web app with API"

# Tag release
git tag -a v1.0.0 -m "Version 1.0.0"

# Push
git push origin main
git push origin v1.0.0
```

## Post-Commit Verification

```bash
# Clone fresh and test
cd /tmp
git clone YOUR_REPO test-clone
cd test-clone/website
npm install
docker build -t test .
```

## GitHub Repository Settings

- [ ] Add description
- [ ] Add topics: `sveltekit`, `image-classification`, `docker`, `typescript`
- [ ] Enable Issues
- [ ] Add LICENSE file (MIT recommended)
- [ ] Set up branch protection if needed
