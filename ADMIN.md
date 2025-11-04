# Admin Dashboard

The admin dashboard provides a comprehensive interface for managing and analyzing crowd-sourced image crop submissions.

## Features

### 1. **API Key Authentication**

- Secure access using API tokens defined in `.env`
- API key is stored in browser localStorage for convenience
- One-click logout to clear session

### 2. **Submission Statistics**

- **Total Images**: Number of images with submissions
- **Total Submissions**: Total number of crop submissions across all images
- **Total Outliers**: Number of submissions that deviate significantly from averages

### 3. **Per-Image Analytics**

#### Crop Statistics

For each image, view averaged crop coordinates with standard deviations:

- **Position X**: Average X coordinate ± standard deviation
- **Position Y**: Average Y coordinate ± standard deviation
- **Width**: Average width ± standard deviation
- **Height**: Average height ± standard deviation

#### Orientation Analysis

- Most common orientation (side/front)
- Vote count and percentage
- Distribution of all orientation votes

#### Outlier Detection

Automatically identifies submissions that deviate from the average:

- **Outlier Threshold**: Configurable (default: 2σ standard deviations)
- **Deviation Score**: Shows how many standard deviations away from average
- **Highlighted Fields**: Visual indicators for which coordinates are outliers (x, y, width, or height)

### 4. **Outlier Management**

- Review suspicious submissions
- Delete individual outlier submissions
- Filter and sort by:
  - Filename (alphabetical)
  - Most outliers first
  - Most submissions first

### 5. **Unfit Image Tracking**

- See how many users marked each image as "unfit"
- Helps identify problematic images

## Access

Navigate to: `http://your-domain/admin`

## Setup

1. **Set API Token** in `.env`:

   ```bash
   API_TOKENS=your-secret-admin-key-here
   ```

2. **Restart the application** to load the new token

3. **Navigate to** `/admin` and enter your API token

## Usage Tips

### Finding Problem Submissions

1. **Sort by "Most Outliers"** to find images with the most suspicious data
2. **Adjust the threshold** (1-5σ) to make outlier detection more or less strict:
   - Lower threshold (1-1.5σ): More sensitive, catches smaller deviations
   - Higher threshold (2.5-3σ): Less sensitive, only catches major outliers
3. **Review deviation scores** - higher scores indicate more extreme outliers

### Understanding Statistics

- **Standard Deviation (±)**: Shows how much variation exists in the submissions
  - Small std dev (< 20px): Good consensus among users
  - Large std dev (> 50px): High disagreement, may need review
- **Outlier Fields**: Highlighted in red
  - If only position (x/y) is outlier: User may have selected different subject
  - If only size (width/height) is outlier: User may have cropped too tight/loose
  - All fields outlier: Likely a mistake or misunderstanding

### When to Delete Outliers

Consider deleting when:

- Deviation score > 3σ
- Multiple fields are outliers
- Clearly inconsistent with other submissions
- Suspicious user_id patterns (e.g., rapid submissions)

## API Endpoints

The admin dashboard uses these API endpoints:

### Get All Submissions Statistics

```http
GET /api/admin/submissions?threshold=2
Authorization: Bearer YOUR_API_TOKEN
```

Query Parameters:

- `threshold` (optional): Outlier detection threshold in standard deviations (default: 2)
- `imageId` (optional): Filter to specific image ID

### Delete a Crop Submission

```http
DELETE /api/admin/submissions/{cropId}
Authorization: Bearer YOUR_API_TOKEN
```

## Security Notes

- API tokens are stored in browser localStorage
- All admin endpoints require valid API token
- Tokens should be kept secret and rotated periodically
- Consider using HTTPS in production
- No password recovery - if token is lost, generate new one in `.env`

## Troubleshooting

### "Invalid API key" error

- Check `.env` file has `API_TOKENS` set
- Ensure application was restarted after changing `.env`
- Verify token doesn't have extra spaces or quotes

### "Session expired" error

- Re-enter your API key
- Check if `.env` token was changed/removed
- Try clearing browser localStorage and re-authenticating

### Outliers not showing

- Increase the outlier threshold
- Check if image has enough submissions (need at least 2-3 for statistics)
- Verify submissions exist for that image
