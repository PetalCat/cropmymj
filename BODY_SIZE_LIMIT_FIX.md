# Body Size Limit Fix

## Problem

The SvelteKit application was rejecting bulk image uploads with error:
```
SvelteKitError: Content-length of XXXXXX exceeds limit of 524288 bytes.
```

This happened because the default body size limit in `@sveltejs/adapter-node` is 512KB (524288 bytes), which is too small for image uploads.

## Solution

Set the `BODY_SIZE_LIMIT` environment variable to a larger value (100MB by default).

### For Docker Deployment

1. The `BODY_SIZE_LIMIT` environment variable is set in `docker-compose.yml`:
   ```yaml
   environment:
     - BODY_SIZE_LIMIT=${BODY_SIZE_LIMIT:-104857600}
   ```

2. The `start.sh` script ensures it's properly exported before starting node:
   ```sh
   : ${BODY_SIZE_LIMIT:=104857600}
   export BODY_SIZE_LIMIT
   ```

3. The Docker image automatically uses this script as the entry point.

### For Local Development

Run the dev server with the environment variable:

```bash
BODY_SIZE_LIMIT=104857600 pnpm run dev
```

Or add it to your `.env` file:

```bash
BODY_SIZE_LIMIT=104857600
```

### For Production (non-Docker)

Set the environment variable before starting the built application:

```bash
export BODY_SIZE_LIMIT=104857600
node build
```

## Rebuild Required

After changing this value, you **must rebuild and redeploy**:

```bash
# Rebuild Docker image
docker-compose down -v
docker build --no-cache -t cropmymj .
docker-compose up -d
```

## Current Setting

Default: **100MB** (104857600 bytes)

This allows for:
- Single large images up to 100MB
- Multiple smaller images in bulk uploads
- Base64 encoded images (which are ~33% larger than raw)

## Adjusting the Limit

To increase the limit, set a different value in your `.env` file or environment:

```bash
# 200MB
BODY_SIZE_LIMIT=209715200

# 500MB
BODY_SIZE_LIMIT=524288000

# 1GB
BODY_SIZE_LIMIT=1073741824
```

**Note:** Very large limits may impact server memory usage, especially when processing multiple uploads simultaneously.

## Verification

Check the startup logs to verify the limit is set correctly:

```
=== Environment Variables Debug ===
BODY_SIZE_LIMIT: 104857600 bytes (~100MB)
===================================
```

## Technical Details

- The `BODY_SIZE_LIMIT` environment variable is read by `@sveltejs/adapter-node` at runtime
- It must be available in the Node.js process environment
- The limit applies to the entire request body, not individual files
- Base64 encoding increases size by ~33%, so plan accordingly
