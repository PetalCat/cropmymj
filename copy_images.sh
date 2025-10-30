#!/bin/bash
# Helper script to copy images from your pose analysis folder to the web app

# Source directory (adjust this path to your pose images location)
SOURCE_DIR="/Users/hasenkap/Developer/pose/images"

# Destination directory
DEST_DIR="./static/images"

# Create destination if it doesn't exist
mkdir -p "$DEST_DIR"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Source directory not found: $SOURCE_DIR"
    echo "Please update SOURCE_DIR in this script to point to your images"
    exit 1
fi

# Copy images
echo "Copying images from $SOURCE_DIR to $DEST_DIR..."
cp "$SOURCE_DIR"/*.{jpg,jpeg,png,JPG,JPEG,PNG} "$DEST_DIR" 2>/dev/null || true

# Count copied files
count=$(ls -1 "$DEST_DIR"/*.{jpg,jpeg,png,JPG,JPEG,PNG} 2>/dev/null | wc -l)
echo "Copied $count images"

if [ $count -eq 0 ]; then
    echo "No images found. Please check the SOURCE_DIR path in this script."
    exit 1
fi

echo "Done! Run 'pnpm run dev' to start the web app."
