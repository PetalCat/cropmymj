#!/bin/bash
# Production startup script

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set defaults if not specified
export PORT=${PORT:-3000}
export HOST=${HOST:-0.0.0.0}

echo "Starting production server on $HOST:$PORT..."

# Run the built application
node build/index.js
