# Quick Start: Bulk Upload Photos

This guide will get you uploading **unlimited photos** in bulk in under 2 minutes!

## Step 1: Set Up Your API Token

Edit your `.env` file and add an API token:

```bash
# Open .env in your editor
nano .env

# Add or update this line:
API_TOKENS=my-secret-token-123

# Save and close (Ctrl+X, Y, Enter in nano)
```

💡 **Tip**: Use a strong random token. Generate one with:

```bash
openssl rand -hex 32
```

## Step 2: Start Your Server

```bash
pnpm run dev
```

The server should start on http://localhost:5174

## Step 3: Upload Photos

### Option A: Test with 3 Images (Quick Test)

```bash
./test_bulk_upload.sh my-secret-token-123
```

This will upload the first 3 images from `./data/images` to verify everything works.

### Option B: Upload All Images from a Directory

```bash
./bulk_upload.sh /path/to/your/photos my-secret-token-123
```

This uploads ALL images from the specified directory. **No limit on number of images!**

### Option C: Upload Large Batches (1000+)

```bash
# Upload in larger batches for better performance
BATCH_SIZE=50 ./bulk_upload.sh /path/to/your/photos my-secret-token-123
```

### Option C: Use Python Script (More Features)

```bash
# Install dependencies (one-time only)
pip3 install requests pillow

# Upload unlimited images with progress tracking
python3 bulk_upload.py /path/to/your/photos --token my-secret-token-123

# For very large uploads (5000+ images), use larger batches
python3 bulk_upload.py /path/to/your/photos --token my-secret-token-123 --batch-size 50
```

## Examples

**Upload from a USB drive:**

```bash
./bulk_upload.sh /Volumes/MyUSB/Photos my-secret-token-123
```

**Upload from Downloads folder:**

```bash
./bulk_upload.sh ~/Downloads/posture-photos my-secret-token-123
```

**Upload with custom batch size (5 at a time):**

```bash
BATCH_SIZE=5 ./bulk_upload.sh ~/Pictures my-secret-token-123
```

**Dry run to see what would be uploaded:**

```bash
python3 bulk_upload.py ~/Pictures --token my-secret-token-123 --dry-run
```

## Verify Upload

Check how many images are in your database:

```bash
curl -H "Authorization: Bearer my-secret-token-123" \
  http://localhost:5174/api/v1/images/list | grep -o '"total":[0-9]*'
```

## Troubleshooting

### "Authorization failed"

- Check that your token in `.env` matches what you're using
- Restart the dev server after changing `.env`

### "No images found"

- Check the directory path is correct
- Verify it contains .jpg, .png, .gif, or .webp files
- File extensions are case-sensitive on Linux

### "Failed to upload image"

- Check disk space on your server
- Verify `./data/images` directory exists and is writable
- Check server logs for detailed error messages

### Script not running

- Make sure scripts are executable: `chmod +x *.sh`
- For Python script: ensure Python 3.7+ is installed

## What's Next?

After uploading, you can:

1. **View images on the web UI**: http://localhost:5174 (login with your SITE_PASSWORD)
2. **Get image data via API**:
   ```bash
   curl -H "Authorization: Bearer my-secret-token-123" \
     "http://localhost:5174/api/v1/images/data?filename=image.jpg"
   ```
3. **Download images**:
   ```bash
   curl -H "Authorization: Bearer my-secret-token-123" \
     "http://localhost:5174/api/v1/images/download/image.jpg" \
     -o downloaded.jpg
   ```

## Full Documentation

See [BULK_UPLOAD.md](./BULK_UPLOAD.md) for complete API documentation and advanced usage.
