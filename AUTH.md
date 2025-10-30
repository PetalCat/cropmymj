# Authentication System

## Overview

The application uses a dual authentication system:
1. **Session-based authentication** for UI access (main page, image categorizing)
2. **Bearer token authentication** for API v1 endpoints (upload, download, data)

## Configuration

Set these environment variables in `.env`:

```env
SITE_PASSWORD=your-secure-password-here
API_TOKENS=token1,token2,token3
```

### SITE_PASSWORD
- Used for web UI login
- Users must enter this password at `/login` to access the main categorizing interface
- Creates a hashed session cookie (`session_auth`)
- Leave empty to disable password protection for the UI

### API_TOKENS
- Comma-separated list of valid Bearer tokens
- Used for programmatic access to `/api/v1/*` endpoints
- Each token can be any string (recommend using UUIDs or long random strings)
- Example: `API_TOKENS=abc123,def456,ghi789`

## Access Control

### Public Routes (No Authentication)
- `/login` - Login page
- `/api/login` - Login endpoint
- `/api/logout` - Logout endpoint

### Session-Protected Routes (Requires SITE_PASSWORD login)
- `/` - Main UI for image categorizing
- `/api/images` - List images for UI
- `/api/images/[filename]` - Serve images for UI
- `/api/submit` - Submit crop/orientation data
- `/api/unfit` - Mark image as unfit
- `/api/user-progress` - Get user progress
- `/api/consensus` - Get consensus data

### Token-Protected Routes (Requires API_TOKENS)
- `/api/v1/images/upload` - Upload new images with crops/orientations
- `/api/v1/images/upload-bulk` - **Upload multiple images in one request**
- `/api/v1/images/list` - List all images with data
- `/api/v1/images/data` - Get data for specific image
- `/api/v1/images/bulk` - Get data for multiple images
- `/api/v1/images/download/[filename]` - Download original image

## Usage Examples

### Web UI Access
1. Navigate to `http://localhost:5174/`
2. If password is set, you'll be redirected to `/login`
3. Enter the `SITE_PASSWORD`
4. Access granted - can now categorize images

### API Token Access

Upload an image with crop data:
```bash
curl -X POST http://localhost:5174/api/v1/images/upload \
  -H "Authorization: Bearer abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "image_base64": "...",
    "width": 1920,
    "height": 1080,
    "crops": [{
      "user_id": "test-user",
      "x": 100,
      "y": 100,
      "width": 500,
      "height": 800
    }],
    "orientations": [{
      "user_id": "test-user",
      "orientation": "front"
    }]
  }'
```

Download consensus data:
```bash
curl http://localhost:5174/api/v1/images/data?filename=test.jpg \
  -H "Authorization: Bearer abc123"
```

List all images:
```bash
curl http://localhost:5174/api/v1/images/list?include_data=true \
  -H "Authorization: Bearer abc123"
```

Download original image:
```bash
curl http://localhost:5174/api/v1/images/download/test.jpg \
  -H "Authorization: Bearer abc123" \
  -o test.jpg
```

## Implementation Details

Authentication logic is in `src/hooks.server.ts`:

1. **Path classification**:
   - `ALWAYS_PUBLIC_PATHS`: Never require auth
   - `API_TOKEN_PATHS`: Require Bearer token (checked in individual endpoints)
   - All other paths: Require session cookie when `SITE_PASSWORD` is set

2. **Session validation**:
   - Password is hashed with SHA-256
   - Hash is stored in `session_auth` cookie
   - Cookie is validated on each request

3. **Token validation**:
   - Each v1 endpoint calls `validateApiToken(event)`
   - Checks `Authorization: Bearer <token>` header
   - Returns error response if invalid or missing

## Security Notes

- Use strong, unique passwords for `SITE_PASSWORD`
- Generate cryptographically random tokens for `API_TOKENS`
- Use HTTPS in production to protect credentials in transit
- Rotate tokens periodically
- Consider using environment-specific token files instead of .env
- Session cookies are HTTP-only (not accessible to JavaScript)
