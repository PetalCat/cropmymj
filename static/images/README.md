# Static Images Directory

⚠️ **Note:** This directory is for static web assets only (logos, icons, UI images, etc.).

## Uploaded Images Location

User-uploaded images are stored in `data/images/`, NOT here.

- **Static assets** (logos, UI): `static/images/` ✓
- **Uploaded images** (posture photos): `data/images/` ✓

## Why the Separation?

- `static/` is bundled with the build and served directly by the web server
- `data/` is mounted as a volume, persisting across deployments
- Large datasets shouldn't be in `static/` to avoid bloating the Docker image

## For Testing

If you want to manually add test images, place them in `data/images/`:

```bash
mkdir -p data/images
cp /path/to/your/test-images/*.jpg data/images/
```

Then access them through the web app or API.

```bash
python fetch_consensus.py your_image.jpg
```

The consensus data can then be integrated into your pose analysis pipeline at `/Users/hasenkap/Developer/pose/` to automatically crop images using crowd-sourced data instead of manual or unreliable automatic cropping.
