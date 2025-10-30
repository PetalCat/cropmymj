# 🚀 Unlimited Bulk Upload - Ready!

Your bulk upload system now supports **UNLIMITED images** per request!

## What Changed

### ✅ Removed Upload Limits

- **Before**: Maximum 100 images per request
- **After**: No limit - upload as many as you need!

### ✅ Smart Memory Management

- Server processes images in chunks of 50
- Prevents memory issues with very large batches
- Progress logged to console for monitoring

### ✅ Improved Performance

- Default batch size increased from 5 to 20
- Better concurrency in shell script
- Enhanced progress reporting in Python script

## How to Use

### Upload 10,000 Images? No Problem!

```bash
# Shell script (recommended for simplicity)
./bulk_upload.sh /huge/photo/collection my-token

# Python script (recommended for progress tracking)
python3 bulk_upload.py /huge/photo/collection --token my-token --batch-size 50
```

### Performance Tips by Scale

**< 100 images:**

```bash
./bulk_upload.sh /photos my-token
# Fast and simple
```

**100-1,000 images:**

```bash
BATCH_SIZE=30 ./bulk_upload.sh /photos my-token
# Or use Python for better progress tracking
python3 bulk_upload.py /photos --token my-token --batch-size 30
```

**1,000-10,000 images:**

```bash
# Larger batches for efficiency
python3 bulk_upload.py /photos --token my-token --batch-size 50
```

**10,000+ images:**

```bash
# Consider splitting into multiple runs for best reliability
# But if you want to do it all at once:
python3 bulk_upload.py /photos --token my-token --batch-size 100
```

## Server Processing

The server automatically:

1. Accepts any number of images in one request
2. Processes them in chunks of 50 (internal)
3. Logs progress: `Processing chunk X/Y...`
4. Returns complete success/failure report

## Monitoring Large Uploads

Watch server logs in real-time:

```bash
# In one terminal, start server
pnpm run dev

# In another terminal, upload
./bulk_upload.sh /photos my-token

# You'll see:
# "Processing bulk upload of 5000 images"
# "Processing chunk 1/100 (50 images)..."
# "Chunk 1 complete: 50 successful, 0 failed"
# etc.
```

## Example: Upload 5,000 Photos

```bash
# 1. Set your token
export API_TOKEN=$(openssl rand -hex 32)
echo "API_TOKENS=$API_TOKEN" >> .env

# 2. Start server (in one terminal)
pnpm run dev

# 3. Upload all photos (in another terminal)
python3 bulk_upload.py ~/Downloads/all-photos --token $API_TOKEN --batch-size 50

# Expected output:
# 📁 Found 5000 images in ~/Downloads/all-photos
# 📦 Preparing images...
# ✅ Prepared 5000 images
# 🚀 Uploading 5000 images in batches of 50...
# 📤 Uploading batch 1/100 (50 images)... ✅ 50 successful, 0 failed
# 📤 Uploading batch 2/100 (50 images)... ✅ 50 successful, 0 failed
# ...
# 🎉 Upload complete!
```

## Time Estimates

Approximate upload times (depends on image size and connection):

- 100 images: 1-2 minutes
- 1,000 images: 10-20 minutes
- 5,000 images: 50-90 minutes
- 10,000 images: 2-3 hours

## Technical Details

### Request Format

```json
{
	"images": [
		// No limit on array size!
		{ "filename": "img1.jpg", "imageData": "...", "width": 1920, "height": 1080 },
		{ "filename": "img2.jpg", "imageData": "...", "width": 1920, "height": 1080 }
		// ... thousands more ...
	]
}
```

### Response Format

```json
{
  "success": true,
  "total": 5000,
  "successful": 4998,
  "failed": 2,
  "results": {
    "successful": ["img1.jpg", "img2.jpg", ...],
    "failed": [
      {"filename": "corrupt.jpg", "error": "Invalid image data"}
    ]
  }
}
```

## Troubleshooting

### Upload seems stuck

- Check server logs - it's likely processing
- Each 50-image chunk takes 10-30 seconds
- Be patient with large batches

### Out of memory errors

- Reduce client batch size: `--batch-size 20`
- Server handles memory automatically
- Consider more RAM if uploading 100MB+ images

### Timeout errors

- Increase timeout in scripts (already 300s for Python)
- Split very large uploads into 2-3 separate runs
- Check network stability

## Need Help?

See complete documentation:

- [BULK_UPLOAD.md](./BULK_UPLOAD.md) - Full API docs
- [QUICK_START_BULK.md](./QUICK_START_BULK.md) - Quick start guide
- [AUTH.md](./AUTH.md) - Authentication setup

## Ready to Go! 🎉

Your system can now handle unlimited bulk uploads. Start with a test batch, then go wild!

```bash
# Test with 3 images
./test_bulk_upload.sh my-token

# Then upload everything!
./bulk_upload.sh /all/my/photos my-token
```
