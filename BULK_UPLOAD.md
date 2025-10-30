# Bulk Image Upload Guide

Upload multiple images to your posture cropping web app using the bulk upload API endpoint.

## API Endpoint

**URL**: `/api/v1/images/upload-bulk`  
**Method**: `POST`  
**Authentication**: Bearer token required  
**Content-Type**: `application/json`

## Request Format

```json
{
  "images": [
    {
      "filename": "image1.jpg",
      "imageData": "base64_encoded_image_data",
      "width": 1920,
      "height": 1080,
      "crops": [
        {
          "user_id": "user123",
          "x": 100,
          "y": 200,
          "width": 500,
          "height": 800
        }
      ],
      "orientations": [
        {
          "user_id": "user123",
          "orientation": "front"
        }
      ]
    }
  ]
}
```

### Fields

- `filename` (required): Name of the image file
- `imageData` (required): Base64-encoded image data
- `width` (required): Image width in pixels
- `height` (required): Image height in pixels
- `crops` (optional): Array of crop submissions
- `orientations` (optional): Array of orientation classifications ("side" or "front")

### Limits

- **No maximum limit** - Upload as many images as needed in one request
- Images processed in chunks of 50 for optimal memory management
- Recommended batch size for clients: 20-50 images per request for best performance
- Very large batches (1000+) may take longer but will complete successfully

## Response Format

```json
{
  "success": true,
  "total": 50,
  "successful": 48,
  "failed": 2,
  "results": {
    "successful": ["image1.jpg", "image2.jpg", ...],
    "failed": [
      {
        "filename": "bad_image.jpg",
        "error": "Invalid filename"
      }
    ]
  }
}
```

## Upload Methods

### Method 1: Shell Script (Simple, No Dependencies)

Use the provided shell script for quick uploads:

```bash
# Make executable
chmod +x bulk_upload.sh

# Upload all images from a directory
./bulk_upload.sh /path/to/images your-api-token

# With custom API URL
API_URL=https://yourapp.com/api/v1/images/upload ./bulk_upload.sh /path/to/images token123

# Adjust batch size
BATCH_SIZE=3 ./bulk_upload.sh /path/to/images token123
```

**Requirements**: macOS with `sips` (pre-installed) or Linux with ImageMagick

### Method 2: Python Script (Advanced)

Use the Python script for more control:

```bash
# Install dependencies
pip install requests pillow

# Upload with default settings
python3 bulk_upload.py /path/to/images --token your-api-token

# Custom options
python3 bulk_upload.py /path/to/images \
  --token your-api-token \
  --api-url http://localhost:5174/api/v1/images/upload-bulk \
  --batch-size 10 \
  --extensions .jpg .png .webp

# Dry run (show what would be uploaded)
python3 bulk_upload.py /path/to/images --token token123 --dry-run
```

### Method 3: curl (Single Batch)

For manual testing or small batches:

```bash
# Get your API token from .env
TOKEN="your-api-token"

# Encode an image to base64
IMAGE_BASE64=$(base64 -i image.jpg | tr -d '\n')

# Get dimensions (macOS)
WIDTH=$(sips -g pixelWidth image.jpg | grep pixelWidth | awk '{print $2}')
HEIGHT=$(sips -g pixelHeight image.jpg | grep pixelHeight | awk '{print $2}')

# Upload
curl -X POST http://localhost:5174/api/v1/images/upload-bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"images\": [
      {
        \"filename\": \"image.jpg\",
        \"imageData\": \"$IMAGE_BASE64\",
        \"width\": $WIDTH,
        \"height\": $HEIGHT
      }
    ]
  }"
```

## Common Issues

### Upload taking a long time
- This is normal for large batches (500+ images)
- Server processes in chunks of 50 for memory efficiency
- Check server logs to see progress: `Processing chunk X/Y...`
- Each 50 images typically takes 10-30 seconds depending on size

### "Maximum 100 images per request"
- This limit has been **removed** - upload unlimited images!
- Old error message may appear in cached documentation

### "Invalid filename"
- Filenames cannot contain `..`, `/`, or `\`
- Use simple alphanumeric filenames with standard extensions

### "Failed to upload image"
- Check that the image is valid and not corrupted
- Ensure base64 encoding is correct
- Verify file permissions on the images directory

### Authentication errors
- Verify your API token is correct (check `.env` file)
- Ensure token is included in `Authorization: Bearer <token>` header
- Token must be listed in `API_TOKENS` environment variable

## Performance Tips

1. **Batch Size**: 
   - 20-50 images per batch is optimal for network reliability
   - Server handles any size batch, but larger batches take longer
   - Smaller batches provide faster feedback on progress
   - Consider splitting very large uploads (10,000+) into multiple requests

2. **Image Size**: 
   - Consider resizing very large images before upload
   - Base64 encoding increases data size by ~33%
   - Compressed JPEGs work better than PNGs for photos

3. **Parallel Uploads**:
   - Shell script handles parallelism automatically
   - Don't run multiple instances simultaneously
   - Monitor memory usage for very large batches

## Example Workflow

```bash
# 1. Set up your environment
cd /Users/hasenkap/Developer/pose/website
source .env  # Load API token

# 2. Prepare your images
mkdir -p /path/to/upload
# Copy images to this directory

# 3. Start your server
pnpm run dev

# 4. Upload images
./bulk_upload.sh /path/to/upload $API_TOKENS

# 5. Verify in database
curl -H "Authorization: Bearer $API_TOKENS" \
  http://localhost:5174/api/v1/images/list | jq '.total'
```

## Integration with Python

```python
import requests
import base64
from PIL import Image

def upload_images(image_paths: list, api_token: str):
    """Upload multiple images to the API"""
    
    images = []
    for path in image_paths:
        # Get dimensions
        with Image.open(path) as img:
            width, height = img.size
        
        # Encode to base64
        with open(path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        images.append({
            'filename': os.path.basename(path),
            'imageData': image_data,
            'width': width,
            'height': height
        })
    
    # Upload in batches of 10
    for i in range(0, len(images), 10):
        batch = images[i:i+10]
        
        response = requests.post(
            'http://localhost:5174/api/v1/images/upload-bulk',
            headers={'Authorization': f'Bearer {api_token}'},
            json={'images': batch}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Batch {i//10 + 1}: {result['successful']} successful")
        else:
            print(f"Batch {i//10 + 1} failed: {response.text}")

# Usage
upload_images(['img1.jpg', 'img2.jpg'], 'your-token')
```

## See Also

- [AUTH.md](./AUTH.md) - Authentication setup
- [PRISMA.md](./PRISMA.md) - Database documentation
- [README.md](./README.md) - General documentation
