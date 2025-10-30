#!/usr/bin/env python3
"""
Bulk Image Uploader for Posture Cropping Web App

Upload unlimited images to the API in batches.
Supports reading images from a directory and uploading with optional metadata.

Examples:
    # Upload to localhost (default port 5174)
    python3 bulk_upload.py /path/to/images --token YOUR_TOKEN
    
    # Upload to remote server (auto-appends /api/v1/images/upload-bulk)
    python3 bulk_upload.py /path/to/images --url https://example.com --token YOUR_TOKEN
    
    # Upload to localhost on different port
    python3 bulk_upload.py /path/to/images --url http://localhost:3000 --token YOUR_TOKEN
    
    # Full API endpoint (no auto-append)
    python3 bulk_upload.py /path/to/images --url https://example.com/api/v1/images/upload-bulk --token YOUR_TOKEN
    
    # Dry run to see what would be uploaded
    python3 bulk_upload.py /path/to/images --token YOUR_TOKEN --dry-run
"""

import os
import sys
import base64
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import requests

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: PIL not available. Install with: pip install pillow")
    print("Will use fallback dimensions (1920x1080) for all images.\n")

def encode_image_to_base64(image_path: str) -> str:
    """Encode image file to base64 string."""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

def get_image_dimensions(image_path: str) -> tuple:
    """Get image width and height."""
    if PIL_AVAILABLE:
        try:
            with Image.open(image_path) as img:
                return img.size
        except Exception as e:
            print(f"Warning: Could not get dimensions for {image_path}: {e}")
    return (1920, 1080)  # Fallback

def prepare_image_data(image_path: str, user_id: Optional[str] = None) -> Dict:
    """Prepare image data for upload."""
    filename = os.path.basename(image_path)
    width, height = get_image_dimensions(image_path)
    image_data = encode_image_to_base64(image_path)
    
    data = {
        'filename': filename,
        'imageData': image_data,
        'width': width,
        'height': height
    }
    
    # Add optional metadata if provided
    if user_id:
        data['crops'] = []
        data['orientations'] = []
    
    return data

def upload_bulk(
    api_url: str,
    api_token: str,
    images: List[Dict],
    batch_size: int = 10
) -> Dict:
    """Upload images in batches with automatic retry on payload too large."""
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json'
    }
    
    total_successful = 0
    total_failed = 0
    all_results = []
    current_batch_size = batch_size
    
    print(f"\n🚀 Uploading {len(images)} images in batches of {batch_size}...")
    print(f"📦 Server processes in chunks of 50 for memory efficiency.\n")
    
    # Process in batches
    i = 0
    while i < len(images):
        batch = images[i:i + current_batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(images) + batch_size - 1) // batch_size
        
        print(f"📤 Uploading batch {batch_num}/{total_batches} ({len(batch)} images)...", end=' ', flush=True)
        
        payload = {'images': batch}
        
        try:
            response = requests.post(api_url, headers=headers, json=payload, timeout=300)
            response.raise_for_status()
            result = response.json()
            
            total_successful += result.get('successful', 0)
            total_failed += result.get('failed', 0)
            all_results.append(result)
            
            print(f"✅ {result.get('successful', 0)} successful, {result.get('failed', 0)} failed")
            
            # Print failed uploads
            if result.get('results', {}).get('failed'):
                for fail in result['results']['failed']:
                    print(f"    ❌ {fail['filename']}: {fail['error']}")
            
            # Move to next batch
            i += current_batch_size
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 413 and current_batch_size > 1:
                # Payload too large - retry with smaller batch
                new_batch_size = max(1, current_batch_size // 2)
                print(f"⚠️  Payload too large, retrying with batch size {new_batch_size}")
                current_batch_size = new_batch_size
                # Don't increment i - retry same batch with smaller size
            else:
                print(f"❌ Failed: {e}")
                total_failed += len(batch)
                i += current_batch_size
                    
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed: {e}")
            total_failed += len(batch)
            i += current_batch_size
    
    return {
        'total_successful': total_successful,
        'total_failed': total_failed,
        'batches': all_results
    }

def main():
    parser = argparse.ArgumentParser(
        description='Bulk upload unlimited images to the posture cropping web app'
    )
    parser.add_argument(
        'directory',
        help='Directory containing images to upload'
    )
    parser.add_argument(
        '--url',
        '--api-url',
        dest='api_url',
        default='http://localhost:5174',
        help='Base URL or full API endpoint (default: http://localhost:5174). Auto-appends /api/v1/images/upload-bulk if not present.'
    )
    parser.add_argument(
        '--token',
        required=True,
        help='API authentication token'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='Number of images per batch (default: 10). Use smaller batches for remote servers to avoid 413 errors.'
    )
    parser.add_argument(
        '--extensions',
        nargs='+',
        default=['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        help='Image file extensions to include (default: .jpg .jpeg .png .gif .webp)'
    )
    parser.add_argument(
        '--user-id',
        help='Optional user ID for metadata'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be uploaded without actually uploading'
    )
    
    args = parser.parse_args()
    
    # Auto-construct API URL if just base URL provided
    api_url = args.api_url
    if not api_url.endswith('/upload-bulk'):
        # Remove trailing slash if present
        api_url = api_url.rstrip('/')
        # Append the API endpoint
        api_url = f"{api_url}/api/v1/images/upload-bulk"
    
    print(f"🌐 API Endpoint: {api_url}")
    
    # Validate directory
    directory = Path(args.directory)
    if not directory.exists() or not directory.is_dir():
        print(f"❌ Error: Directory '{args.directory}' does not exist")
        sys.exit(1)
    
    # Find all image files
    extensions = [ext.lower() for ext in args.extensions]
    image_files = []
    for ext in extensions:
        image_files.extend(directory.glob(f'*{ext}'))
        image_files.extend(directory.glob(f'*{ext.upper()}'))
    
    if not image_files:
        print(f"❌ No image files found in {args.directory}")
        print(f"Looking for extensions: {', '.join(extensions)}")
        sys.exit(1)
    
    print(f"📁 Found {len(image_files)} images in {args.directory}")
    
    if args.dry_run:
        print("\n🔍 Dry run - would upload:")
        for img_file in image_files:
            print(f"  • {img_file.name}")
        print(f"\nTotal: {len(image_files)} images")
        sys.exit(0)
    
    # Prepare image data
    print("\n📦 Preparing images...")
    images = []
    failed_to_prepare = []
    
    for idx, img_file in enumerate(image_files, 1):
        try:
            img_data = prepare_image_data(str(img_file), args.user_id)
            images.append(img_data)
            if idx % 50 == 0:
                print(f"  ✓ Prepared {idx}/{len(image_files)} images...")
        except Exception as e:
            failed_to_prepare.append((img_file.name, str(e)))
            print(f"  ❌ {img_file.name}: {e}")
    
    print(f"✅ Prepared {len(images)} images")
    
    if failed_to_prepare:
        print(f"⚠️  Warning: Failed to prepare {len(failed_to_prepare)} images")
    
    if not images:
        print("❌ No images to upload")
        sys.exit(1)
    
    # Upload
    print("─" * 60)
    result = upload_bulk(api_url, args.token, images, args.batch_size)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Upload Summary")
    print("=" * 60)
    print(f"Total images processed: {len(images)}")
    print(f"✅ Successful uploads: {result['total_successful']}")
    print(f"❌ Failed uploads: {result['total_failed']}")
    
    if failed_to_prepare:
        print(f"⚠️  Failed to prepare: {len(failed_to_prepare)}")
        for filename, error in failed_to_prepare:
            print(f"  • {filename}: {error}")
    
    if result['total_failed'] > 0:
        sys.exit(1)
    
    print("\n🎉 Upload complete!")

if __name__ == '__main__':
    main()
