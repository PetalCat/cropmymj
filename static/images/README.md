# Instructions for Testing

## Add Your Images

To test the cropping and classification web app:

1. Copy your posture analysis images to `static/images/`
   ```bash
   cp /path/to/your/images/*.jpg static/images/
   ```

2. Start the dev server (if not already running):
   ```bash
   pnpm run dev
   ```

3. Open http://localhost:5174 (or whatever port Vite assigns)

4. Start cropping and classifying images!

## Next Steps

Once you have multiple submissions for images, you can test the consensus API:

```bash
# Test the consensus endpoint
curl "http://localhost:5174/api/consensus?filename=your_image.jpg"
```

Or use the Python script:

```bash
python fetch_consensus.py your_image.jpg
```

The consensus data can then be integrated into your pose analysis pipeline at `/Users/hasenkap/Developer/pose/` to automatically crop images using crowd-sourced data instead of manual or unreliable automatic cropping.
