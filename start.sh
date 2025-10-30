#!/bin/sh

# Set default body size limit to 100MB (in bytes) if not provided
# This is required for bulk image uploads
: ${BODY_SIZE_LIMIT:=104857600}
export BODY_SIZE_LIMIT

# Debug environment variables
echo "=== Environment Variables Debug ==="
echo "SITE_PASSWORD exists: $([ -n "$SITE_PASSWORD" ] && echo true || echo false)"
echo "PASSWORD_ENABLED: $([ -n "$SITE_PASSWORD" ] && [ "$SITE_PASSWORD" != "" ] && echo true || echo false)"
echo "DB_PATH: ${DB_PATH:-[NOT SET]}"
echo "BODY_SIZE_LIMIT: $BODY_SIZE_LIMIT bytes (~$((BODY_SIZE_LIMIT / 1024 / 1024))MB)"
echo "==================================="

# Start the Node.js application
exec node build
