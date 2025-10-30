#!/bin/bash
# Quick test of bulk upload functionality
# This uploads a few test images to verify the API works

set -e

echo "==================================================="
echo "Bulk Upload Test"
echo "==================================================="
echo ""

# Check if API token is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <api-token> [image-directory]"
    echo ""
    echo "Example:"
    echo "  $0 my-secret-token ./test-images"
    echo ""
    echo "First, add your token to .env:"
    echo "  API_TOKENS=my-secret-token"
    exit 1
fi

API_TOKEN="$1"
IMAGE_DIR="${2:-./static/images}"
API_URL="${API_URL:-http://localhost:5174/api/v1/images/upload-bulk}"

if [ ! -d "$IMAGE_DIR" ]; then
    echo "Error: Directory '$IMAGE_DIR' not found"
    exit 1
fi

# Find first 3 images as a test
shopt -s nullglob
TEST_IMAGES=("$IMAGE_DIR"/*.{jpg,jpeg,png,JPG,JPEG,PNG})

if [ ${#TEST_IMAGES[@]} -eq 0 ]; then
    echo "No images found in $IMAGE_DIR"
    exit 1
fi

# Limit to 3 images for testing
TEST_COUNT=3
if [ ${#TEST_IMAGES[@]} -lt $TEST_COUNT ]; then
    TEST_COUNT=${#TEST_IMAGES[@]}
fi

echo "Found ${#TEST_IMAGES[@]} total images"
echo "Testing with first $TEST_COUNT images..."
echo ""

# Build JSON payload
JSON_START='{"images":['
JSON_END=']}'
JSON_IMAGES=""

for i in $(seq 0 $((TEST_COUNT - 1))); do
    IMAGE="${TEST_IMAGES[$i]}"
    FILENAME=$(basename "$IMAGE")
    
    echo "Processing $FILENAME..."
    
    # Get dimensions (fallback to 1920x1080 if sips not available)
    if command -v sips &> /dev/null; then
        WIDTH=$(sips -g pixelWidth "$IMAGE" | grep pixelWidth | awk '{print $2}')
        HEIGHT=$(sips -g pixelHeight "$IMAGE" | grep pixelHeight | awk '{print $2}')
    else
        WIDTH=1920
        HEIGHT=1080
    fi
    
    # Encode to base64
    BASE64_DATA=$(base64 < "$IMAGE" | tr -d '\n')
    
    # Add to JSON array
    if [ -n "$JSON_IMAGES" ]; then
        JSON_IMAGES="$JSON_IMAGES,"
    fi
    
    JSON_IMAGES="$JSON_IMAGES{\"filename\":\"$FILENAME\",\"imageData\":\"$BASE64_DATA\",\"width\":$WIDTH,\"height\":$HEIGHT}"
done

# Complete JSON
PAYLOAD="${JSON_START}${JSON_IMAGES}${JSON_END}"

echo ""
echo "Uploading $TEST_COUNT images to $API_URL..."
echo ""

# Upload
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

echo ""
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Bulk upload successful!"
    echo ""
    echo "To upload all images in a directory, use:"
    echo "  ./bulk_upload.sh $IMAGE_DIR $API_TOKEN"
else
    echo "❌ Upload failed with HTTP $HTTP_CODE"
    exit 1
fi
