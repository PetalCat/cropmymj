#!/usr/bin/env python3
"""
Export all classification data to JSON/CSV

This script exports all image data including crops and orientations
for further analysis or backup.
"""

import sys
import requests
import json
import csv
from datetime import datetime
from pathlib import Path

TOKEN = "w-0er0wetv-rnti0ew-rit-0enwitc0-ewitre0w-rhi"
BASE_URL = "http://localhost:5174"

def fetch_all_data():
    """Fetch all images with full classification data"""
    print("📥 Fetching all image data from server...")
    
    response = requests.get(
        f"{BASE_URL}/api/v1/images/list?include_data=true",
        headers={'Authorization': f'Bearer {TOKEN}'},
        timeout=60
    )
    response.raise_for_status()
    return response.json()

def export_to_json(data, output_file):
    """Export to JSON format"""
    print(f"💾 Exporting to JSON: {output_file}")
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Exported {len(data['images'])} images to {output_file}")

def export_to_csv(data, output_file):
    """Export summary to CSV format"""
    print(f"💾 Exporting summary to CSV: {output_file}")
    
    images = data['images']
    
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            'filename',
            'width',
            'height',
            'submission_count',
            'consensus_crop_x',
            'consensus_crop_y',
            'consensus_crop_width',
            'consensus_crop_height',
            'consensus_orientation',
            'total_crops',
            'total_orientations',
            'unfits'
        ])
        
        # Data rows
        for img in images:
            crop = img.get('consensusCrop') or {}
            writer.writerow([
                img['filename'],
                img['width'],
                img['height'],
                img.get('submissionCount', 0),
                crop.get('x', '') if crop else '',
                crop.get('y', '') if crop else '',
                crop.get('width', '') if crop else '',
                crop.get('height', '') if crop else '',
                img.get('consensusOrientation', ''),
                len(img.get('crops', [])),
                len(img.get('orientations', [])),
                len(img.get('unfits', []))
            ])
    
    print(f"✅ Exported {len(images)} images to {output_file}")

def export_detailed_csv(data, output_file):
    """Export detailed per-submission data to CSV"""
    print(f"💾 Exporting detailed submissions to CSV: {output_file}")
    
    images = data['images']
    
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            'filename',
            'image_width',
            'image_height',
            'user_id',
            'crop_x',
            'crop_y',
            'crop_width',
            'crop_height',
            'orientation'
        ])
        
        # Data rows - one per submission
        for img in images:
            filename = img['filename']
            img_width = img['width']
            img_height = img['height']
            
            # Match crops with orientations by user_id
            crops_by_user = {c['user_id']: c for c in img.get('crops', [])}
            orientations_by_user = {o['user_id']: o for o in img.get('orientations', [])}
            
            all_users = set(crops_by_user.keys()) | set(orientations_by_user.keys())
            
            for user_id in all_users:
                crop = crops_by_user.get(user_id, {})
                orientation = orientations_by_user.get(user_id, {})
                
                writer.writerow([
                    filename,
                    img_width,
                    img_height,
                    user_id,
                    crop.get('x', ''),
                    crop.get('y', ''),
                    crop.get('width', ''),
                    crop.get('height', ''),
                    orientation.get('orientation', '')
                ])
    
    print(f"✅ Exported detailed submission data to {output_file}")

def print_statistics(data):
    """Print summary statistics"""
    images = data['images']
    total = len(images)
    
    with_crops = sum(1 for img in images if img.get('crops') and len(img['crops']) > 0)
    with_orientations = sum(1 for img in images if img.get('orientations') and len(img['orientations']) > 0)
    with_consensus = sum(1 for img in images if img.get('consensusCrop') is not None)
    with_unfits = sum(1 for img in images if img.get('unfits') and len(img['unfits']) > 0)
    
    total_submissions = sum(img.get('submissionCount', 0) for img in images)
    
    # Count orientations
    front_count = sum(1 for img in images if img.get('consensusOrientation') == 'front')
    side_count = sum(1 for img in images if img.get('consensusOrientation') == 'side')
    
    print()
    print("=" * 70)
    print("📊 Classification Statistics")
    print("=" * 70)
    print(f"Total images: {total}")
    print(f"Images with crop data: {with_crops} ({with_crops/total*100:.1f}%)")
    print(f"Images with orientation data: {with_orientations} ({with_orientations/total*100:.1f}%)")
    print(f"Images with consensus: {with_consensus} ({with_consensus/total*100:.1f}%)")
    print(f"Images marked unfit: {with_unfits} ({with_unfits/total*100:.1f}%)")
    print()
    print(f"Total submissions: {total_submissions}")
    print(f"Average submissions per image: {total_submissions/total:.2f}")
    print()
    print("Consensus Orientations:")
    print(f"  • Front: {front_count} ({front_count/total*100:.1f}%)")
    print(f"  • Side: {side_count} ({side_count/total*100:.1f}%)")
    print(f"  • Unclassified: {total - front_count - side_count} ({(total-front_count-side_count)/total*100:.1f}%)")
    print("=" * 70)
    print()

def main():
    print("=" * 70)
    print("📤 Export Classification Data")
    print("=" * 70)
    print()
    
    # Create exports directory
    export_dir = Path("exports")
    export_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    try:
        # Fetch data
        data = fetch_all_data()
        
        # Print statistics
        print_statistics(data)
        
        # Export to different formats
        json_file = export_dir / f"classifications_{timestamp}.json"
        csv_summary_file = export_dir / f"classifications_summary_{timestamp}.csv"
        csv_detailed_file = export_dir / f"classifications_detailed_{timestamp}.csv"
        
        export_to_json(data, json_file)
        export_to_csv(data, csv_summary_file)
        export_detailed_csv(data, csv_detailed_file)
        
        print()
        print("✅ Export complete!")
        print()
        print("📁 Files created:")
        print(f"   • {json_file} (full data)")
        print(f"   • {csv_summary_file} (consensus summary)")
        print(f"   • {csv_detailed_file} (per-submission details)")
        print()
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to fetch data: {e}")
        print()
        print("Make sure the server is running:")
        print("   cd /Users/hasenkap/Developer/pose/website && pnpm run dev")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Interrupted by user")
        sys.exit(1)
