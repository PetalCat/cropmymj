#!/usr/bin/env python3
"""
Verify image uploads and check classification data

This script fetches data from the server to confirm:
1. Images were uploaded successfully
2. Crop data is being stored
3. Orientation classifications are working
"""

import sys
import requests
import json
from typing import Optional

def check_api_health(base_url: str, token: str) -> bool:
    """Check if API is accessible"""
    try:
        response = requests.get(
            f"{base_url}/api/v1/images/list",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        return response.status_code == 200
    except Exception as e:
        print(f"❌ API not accessible: {e}")
        return False

def get_image_list(base_url: str, token: str, include_data: bool = False) -> dict:
    """Get list of all images"""
    url = f"{base_url}/api/v1/images/list"
    if include_data:
        url += "?include_data=true"
    
    response = requests.get(
        url,
        headers={'Authorization': f'Bearer {token}'},
        timeout=30
    )
    response.raise_for_status()
    return response.json()

def get_image_data(base_url: str, token: str, filename: str) -> dict:
    """Get detailed data for a specific image"""
    response = requests.get(
        f"{base_url}/api/v1/images/data",
        params={'filename': filename},
        headers={'Authorization': f'Bearer {token}'},
        timeout=10
    )
    response.raise_for_status()
    return response.json()

def get_consensus_data(base_url: str, filename: str) -> Optional[dict]:
    """Get consensus data (public endpoint)"""
    try:
        response = requests.get(
            f"{base_url}/api/consensus",
            params={'filename': filename},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

def main():
    # Configuration
    BASE_URL = "http://localhost:5174"
    TOKEN = "w-0er0wetv-rnti0ew-rit-0enwitc0-ewitre0w-rhi"
    
    print("=" * 70)
    print("🔍 Image Upload & Classification Verification")
    print("=" * 70)
    print()
    
    # Check API health
    print("1️⃣  Checking API connectivity...")
    if not check_api_health(BASE_URL, TOKEN):
        print("❌ Cannot connect to API. Make sure server is running:")
        print("   cd /Users/hasenkap/Developer/pose/website && pnpm run dev")
        sys.exit(1)
    print("✅ API is accessible")
    print()
    
    # Get image list
    print("2️⃣  Fetching image list...")
    try:
        data = get_image_list(BASE_URL, TOKEN)
        total_images = data.get('total', 0)
        print(f"✅ Found {total_images} images in database")
    except Exception as e:
        print(f"❌ Failed to fetch image list: {e}")
        sys.exit(1)
    print()
    
    if total_images == 0:
        print("⚠️  No images found. Upload some images first:")
        print("   python3 ./website/bulk_upload.py ./set-unfiltered-uncropped --token w-0er0wetv-rnti0ew-rit-0enwitc0-ewitre0w-rhi --batch-size 50")
        sys.exit(0)
    
    # Get detailed data with classifications
    print("3️⃣  Fetching detailed image data with classifications...")
    try:
        detailed_data = get_image_list(BASE_URL, TOKEN, include_data=True)
        images = detailed_data.get('images', [])
        
        # Count images with classifications
        with_crops = sum(1 for img in images if img.get('crops') and len(img['crops']) > 0)
        with_orientations = sum(1 for img in images if img.get('orientations') and len(img['orientations']) > 0)
        with_consensus = sum(1 for img in images if img.get('consensusCrop') is not None)
        
        print(f"✅ Retrieved {len(images)} images with data")
        print()
        print("📊 Classification Statistics:")
        print(f"   • Images with crop data: {with_crops}/{total_images} ({with_crops/total_images*100:.1f}%)")
        print(f"   • Images with orientation data: {with_orientations}/{total_images} ({with_orientations/total_images*100:.1f}%)")
        print(f"   • Images with consensus: {with_consensus}/{total_images} ({with_consensus/total_images*100:.1f}%)")
        print()
        
    except Exception as e:
        print(f"❌ Failed to fetch detailed data: {e}")
        sys.exit(1)
    
    # Show sample data
    print("4️⃣  Sample images with classifications:")
    print()
    
    classified_images = [img for img in images if img.get('crops') and len(img['crops']) > 0]
    
    if not classified_images:
        print("⚠️  No classified images yet. To add classifications:")
        print("   1. Visit http://localhost:5174")
        print("   2. Login with password: ratemymj")
        print("   3. Start cropping and classifying images!")
        print()
    else:
        for i, img in enumerate(classified_images[:5], 1):
            print(f"   [{i}] {img['filename']}")
            print(f"       Size: {img['width']}x{img['height']}")
            print(f"       Submissions: {img.get('submissionCount', 0)}")
            
            if img.get('consensusCrop'):
                crop = img['consensusCrop']
                print(f"       Consensus crop: x={crop['x']}, y={crop['y']}, w={crop['width']}, h={crop['height']}")
            
            if img.get('consensusOrientation'):
                print(f"       Consensus orientation: {img['consensusOrientation']}")
            
            print()
    
    # Test individual image fetch
    if images:
        test_image = images[0]['filename']
        print(f"5️⃣  Testing individual image fetch: {test_image}")
        try:
            img_data = get_image_data(BASE_URL, TOKEN, test_image)
            print(f"✅ Successfully fetched data for {test_image}")
            print(f"   • Crops: {len(img_data.get('crops', []))}")
            print(f"   • Orientations: {len(img_data.get('orientations', []))}")
            print(f"   • Unfits: {len(img_data.get('unfits', []))}")
        except Exception as e:
            print(f"❌ Failed: {e}")
        print()
    
    # Test consensus endpoint
    if classified_images:
        test_image = classified_images[0]['filename']
        print(f"6️⃣  Testing consensus endpoint: {test_image}")
        consensus = get_consensus_data(BASE_URL, test_image)
        if consensus:
            print(f"✅ Consensus data available")
            if consensus.get('consensus_crop'):
                crop = consensus['consensus_crop']
                print(f"   • Crop: ({crop['x']}, {crop['y']}, {crop['width']}, {crop['height']})")
            if consensus.get('consensus_orientation'):
                print(f"   • Orientation: {consensus['consensus_orientation']}")
            print(f"   • Submission count: {consensus.get('submission_count', 0)}")
        else:
            print("⚠️  No consensus data yet (needs multiple submissions)")
        print()
    
    # Summary
    print("=" * 70)
    print("📈 Summary")
    print("=" * 70)
    print(f"✅ Total images: {total_images}")
    print(f"✅ Images with classifications: {with_crops}")
    print(f"✅ API working correctly: YES")
    print()
    
    if with_crops == 0:
        print("🎯 Next Steps:")
        print("   1. Visit http://localhost:5174 and login")
        print("   2. Start cropping and classifying images")
        print("   3. Run this script again to see classifications")
    else:
        print("🎉 Classification system is working!")
        print()
        print("💡 You can also:")
        print("   • Download consensus data: fetch_consensus.py")
        print("   • View in UI: http://localhost:5174")
        print("   • Get bulk data: curl -H 'Authorization: Bearer TOKEN' http://localhost:5174/api/v1/images/list?include_data=true")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
