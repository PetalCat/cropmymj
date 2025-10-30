# Posture Image Cropping & Classification Web App

A SvelteKit-based web application for crowd-sourced image cropping and orientation classification for posture analysis.

## Features

- 🖼️ Display images from a folder for cropping
- ✂️ Interactive canvas-based rectangle crop selection
- 🔄 Side/Front orientation classification
- 💾 Store multiple user submissions per image in SQLite
- 📊 Calculate consensus crops (average coordinates)
- 🎯 Determine most common orientation
- 🐍 Python API client for fetching consensus data

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create required directories:

```bash
mkdir -p data static/images
```

3. Place your images in `static/images/`

4. Configure environment variables:

```bash
cp .env.example .env
# Edit .env to customize:
# - PORT (default: 3000)
# - HOST (default: 0.0.0.0)
# - DB_PATH (default: ./data/crops.db)
# - IMAGES_PATH (default: ./static/images)
```

## Running the App

### Development Mode

Start the development server:

```bash
pnpm run dev
```

Visit http://localhost:5173 to start cropping and classifying images.

### Production Mode

Build and run in production:

```bash
# Build the application
pnpm run build

# Start the production server
pnpm start
# Or use the startup script
./start.sh
```

The production server will run on the port specified in `.env` (default: 3000).
Visit http://localhost:3000

## Using Consensus Data in Python

The web app provides an API endpoint to fetch consensus crop and orientation data for use in your Python posture analysis pipeline.

### Example Usage

```python
from fetch_consensus import CropConsensusAPI

api = CropConsensusAPI()
consensus = api.get_consensus('image001.jpg')

if consensus:
    crop = consensus['consensusCrop']
    orientation = consensus['consensusOrientation']
    print(f"Crop: x={crop['x']}, y={crop['y']}, w={crop['width']}, h={crop['height']}")
    print(f"Orientation: {orientation}")
```

### API Endpoints

- `GET /api/images` - List all available images
- `POST /api/submit` - Submit a crop and orientation (used by web UI)
- `GET /api/consensus?filename=image.jpg` - Get consensus data for an image

### Consensus Response Format

```json
{
	"filename": "image001.jpg",
	"imageWidth": 1920,
	"imageHeight": 1080,
	"consensusCrop": {
		"x": 450,
		"y": 120,
		"width": 800,
		"height": 900
	},
	"consensusOrientation": "side",
	"submissionCount": 5,
	"orientationCounts": {
		"side": 4,
		"front": 1
	}
}
```

## Project Structure

```
├── src/
│   ├── lib/
│   │   └── server/
│   │       └── db.ts              # SQLite database setup
│   └── routes/
│       ├── +page.svelte           # Main cropping interface
│       └── api/
│           ├── images/+server.ts  # List images endpoint
│           ├── submit/+server.ts  # Submit crop endpoint
│           └── consensus/+server.ts # Get consensus endpoint
├── static/
│   └── images/                    # Place images here
├── data/
│   └── crops.db                   # SQLite database (auto-created)
└── fetch_consensus.py             # Python client for API
```

## Database Schema

**images**

- id, filename, width, height, created_at

**crops**

- id, image_id, user_id, x, y, width, height, created_at

**orientations**

- id, image_id, user_id, orientation (side/front), created_at

## Workflow

1. Users visit the web app and see images one by one
2. Users draw a crop rectangle around the person's body
3. Users select whether the image is a side or front view
4. Data is stored in SQLite with a unique user ID
5. Python scripts can query the consensus endpoint to get averaged crops and most common orientation
6. Integrate consensus data into your pose analysis pipeline

## Integration with Pose Analysis

Use the consensus data to automatically crop images in your pipeline:

```python
# In your pose_overlay_v2.py or similar
from fetch_consensus import CropConsensusAPI

api = CropConsensusAPI()

for image_file in image_files:
    consensus = api.get_consensus(image_file)
    if consensus:
        crop = consensus['consensusCrop']
        orientation = consensus['consensusOrientation']
        # Use crop coordinates to process image
        # Use orientation instead of automatic detection
    else:
        # Fall back to automatic detection or skip
        pass
```
