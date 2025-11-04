# Posture Image Cropping & Classification Web App

A SvelteKit-based web application for crowd-sourced image cropping and orientation classification for posture analysis.

## Features

- 🖼️ Display images from a folder for cropping
- ✂️ Interactive canvas-based rectangle crop selection
- 🔄 Side/Front orientation classification
- 💾 Store multiple user submissions per image with Prisma ORM
- 📊 Calculate consensus crops (average coordinates)
- 🎯 Determine most common orientation
- 🔐 Dual authentication: session-based UI + Bearer token API
- 📤 **Bulk upload API** - Upload hundreds of images at once
- 🐍 Python API client for fetching consensus data
- 🚀 RESTful API for programmatic image uploads and downloads
- 👨‍💼 **Admin dashboard** - Manage submissions, view averages, detect outliers

## Tech Stack

- **Framework**: SvelteKit 2.48.3
- **Database**: SQLite with Prisma ORM 6.18.0
- **Runtime**: Node.js with adapter-node
- **Authentication**: Session cookies + Bearer tokens
- **Build**: Vite 7.1.12

## Quick Start

### Using Docker (Recommended for Production)

```bash
# 1. Clone the repository
git clone https://github.com/PetalCat/cropmymj.git
cd cropmymj

# 2. Configure environment (optional)
cp .env.example .env
# Edit .env with your SITE_PASSWORD, API_TOKENS, etc.

# 3. Start with docker-compose
docker-compose up -d

# Database automatically initializes and persists in named volume
# Visit http://localhost:8547
```

See [DOCKER.md](./DOCKER.md) and [DATABASE_PERSISTENCE.md](./DATABASE_PERSISTENCE.md) for details.

### Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Setup environment variables:

```bash
cat > .env << 'EOF'
DATABASE_URL="file:./data/crops.db"
IMAGES_PATH=./data/images
SITE_PASSWORD=your-secure-password
API_TOKENS=token1,token2,token3
EOF
```

3. Create required directories:

```bash
mkdir -p data/images
```

4. Initialize database:

```bash
pnpm prisma db push
```

5. Start development server:

```bash
pnpm run dev
```

Visit http://localhost:5174 to start cropping and classifying images.

## Bulk Upload Images

Upload multiple images at once! See [QUICK_START_BULK.md](./QUICK_START_BULK.md) for a 2-minute guide.

**Quick example:**

```bash
# Add API token to .env
echo "API_TOKENS=my-secret-token" >> .env

# Upload all images from a directory
./bulk_upload.sh /path/to/photos my-secret-token
```

See [BULK_UPLOAD.md](./BULK_UPLOAD.md) for complete documentation.

## Authentication

See [AUTH.md](./AUTH.md) for detailed authentication documentation.

### Web UI Access

- Protected by `SITE_PASSWORD` when set
- Login at `/login`
- Session cookie-based authentication

### API Access

- Protected by `API_TOKENS`
- Use `Authorization: Bearer <token>` header
- Access v1 endpoints: upload, download, list, data, bulk

## Database

See [PRISMA.md](./PRISMA.md) for Prisma migration details.

- **ORM**: Prisma with TypeScript type safety
- **Location**: `./data/crops.db` (SQLite)
- **Schema**: 4 models (Image, Crop, Orientation, Unfit)
- **Migrations**: Currently using `db push` for development

## Admin Dashboard

Manage and analyze submissions with the admin dashboard. See [ADMIN.md](./ADMIN.md) for complete documentation.

**Quick access:**

1. Set `API_TOKENS` in `.env`
2. Navigate to `/admin`
3. Enter your API token

**Features:**

- View submission statistics and averages
- Detect outlier submissions (configurable threshold)
- Delete suspicious submissions
- Track orientation consensus
- Identify problematic images

## Using Consensus Data in Python

The web app provides API endpoints to fetch consensus crop and orientation data for use in your Python posture analysis pipeline.

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
├── static/                        # Static web assets only (logos, CSS, etc)
├── data/
│   ├── crops.db                   # SQLite database (auto-created)
│   └── images/                    # Uploaded images stored here
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
