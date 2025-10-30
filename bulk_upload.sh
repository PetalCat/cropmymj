#!/bin/bash
# Simple bulk image uploader using curl
# Usage: ./bulk_upload.sh <directory> <api_token>

set -e

DIRECTORY="${1:-.}"
API_TOKEN="${2}"
API_URL="${API_URL:-http://localhost:5174/api/v1/images/upload}"
BATCH_SIZE="${BATCH_SIZE:-20}"

if [ -z "$API_TOKEN" ]; then
    echo "Usage: $0 <directory> <api_token>"
    echo ""
    echo "Environment variables:"
    echo "  API_URL       - API endpoint (default: http://localhost:5174/api/v1/images/upload)"
    echo "  BATCH_SIZE    - Number of concurrent uploads (default: 20)"
    echo ""
    echo "Note: Server has no upload limit. Adjust BATCH_SIZE based on your connection."
    echo ""
    echo "Example:"
    echo "  $0 ./my-images my-api-token"
    echo "  BATCH_SIZE=50 $0 ./images token123  # Upload 50 at a time"
    exit 1
fi

if [ ! -d "$DIRECTORY" ]; then
    echo "Error: Directory '$DIRECTORY' does not exist"
    exit 1
fi

echo "=================================================="
echo "Bulk Image Upload"
echo "=================================================="
echo "Directory: $DIRECTORY"
echo "API URL: $API_URL"
echo "Batch size: $BATCH_SIZE"
echo "=================================================="
echo ""

# Find all image files
shopt -s nullglob nocaseglob
IMAGE_FILES=("$DIRECTORY"/*.{jpg,jpeg,png,gif,webp})

if [ ${#IMAGE_FILES[@]} -eq 0 ]; then
    echo "No image files found in $DIRECTORY"
    exit 1
fi

echo "Found ${#IMAGE_FILES[@]} images"
echo ""

# Get image dimensions using sips (macOS) or identify (ImageMagick)
get_dimensions() {
    local file="$1"
    
    if command -v sips &> /dev/null; then
        # macOS
        local width=$(sips -g pixelWidth "$file" | grep pixelWidth | awk '{print $2}')
        local height=$(sips -g pixelHeight "$file" | grep pixelHeight | awk '{print $2}')
        echo "$width $height"
    elif command -v identify &> /dev/null; then
        # ImageMagick
        identify -format "%w %h" "$file"
    else
        echo "1920 1080"  # Default fallback
    fi
}

# Upload single image
upload_image() {
    local file="$1"
    local filename=$(basename "$file")
    
    # Get dimensions
    read -r width height <<< $(get_dimensions "$file")
    
    # Encode to base64
    local base64_data=$(base64 < "$file" | tr -d '\n')
    
    # Create JSON payload
    local json_payload=$(cat <<EOF
{
  "filename": "$filename",
  "imageData": "$base64_data",
  "width": $width,
  "height": $height
}
EOF
)
    
    # Upload
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST "$API_URL" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$json_payload")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ]; then
        echo "✓ $filename ($width x $height)"
        return 0
    else
        echo "✗ $filename - HTTP $http_code: $body"
        return 1
    fi
}

# Upload images in batches
successful=0
failed=0
current_batch=0

for file in "${IMAGE_FILES[@]}"; do
    upload_image "$file" &
    
    ((current_batch++))
    
    # Wait after each batch
    if [ $((current_batch % BATCH_SIZE)) -eq 0 ]; then
        wait
        echo ""
        echo "Completed batch of $BATCH_SIZE images..."
        echo ""
    fi
done

# Wait for remaining uploads
wait

echo ""
echo "=================================================="
echo "Upload Complete"
echo "=================================================="
echo "Total images: ${#IMAGE_FILES[@]}"
echo ""
echo "Check the API response above for success/failure details"
