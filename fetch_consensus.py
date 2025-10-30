#!/usr/bin/env python3
"""
Python script to fetch consensus crop and orientation data from the SvelteKit web app.
Use this in your pose analysis pipeline to get crowd-sourced crop coordinates and orientation.
"""

import requests
import json
from typing import Dict, Any, Optional


class CropConsensusAPI:
    """Client for fetching consensus crop data from the web app."""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')
    
    def get_consensus(self, filename: str) -> Optional[Dict[str, Any]]:
        """
        Get consensus crop and orientation for a specific image.
        
        Args:
            filename: Name of the image file (e.g., 'image001.jpg')
        
        Returns:
            Dictionary containing:
                - consensusCrop: {x, y, width, height}
                - consensusOrientation: 'side' or 'front'
                - submissionCount: number of submissions
                - orientationCounts: counts for each orientation
            Returns None if image not found or no consensus available.
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/consensus",
                params={'filename': filename}
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                print(f"No consensus data found for {filename}")
                return None
            else:
                print(f"Error fetching consensus: {response.status_code}")
                return None
        except Exception as e:
            print(f"Error connecting to API: {e}")
            return None
    
    def apply_consensus_crop(self, image_path: str, output_path: str) -> bool:
        """
        Apply consensus crop to an image and save it.
        
        Args:
            image_path: Path to the input image
            output_path: Path to save the cropped image
        
        Returns:
            True if successful, False otherwise
        """
        import os
        from PIL import Image
        
        filename = os.path.basename(image_path)
        consensus = self.get_consensus(filename)
        
        if not consensus:
            return False
        
        crop = consensus['consensusCrop']
        orientation = consensus['consensusOrientation']
        
        try:
            img = Image.open(image_path)
            cropped = img.crop((
                crop['x'],
                crop['y'],
                crop['x'] + crop['width'],
                crop['y'] + crop['height']
            ))
            cropped.save(output_path)
            
            print(f"Cropped {filename} with consensus data:")
            print(f"  Crop: {crop}")
            print(f"  Orientation: {orientation}")
            print(f"  Based on {consensus['submissionCount']} submissions")
            return True
        except Exception as e:
            print(f"Error cropping image: {e}")
            return False


def main():
    """Example usage of the consensus API."""
    import sys
    
    api = CropConsensusAPI()
    
    if len(sys.argv) < 2:
        print("Usage: python fetch_consensus.py <image_filename>")
        print("Example: python fetch_consensus.py image001.jpg")
        sys.exit(1)
    
    filename = sys.argv[1]
    consensus = api.get_consensus(filename)
    
    if consensus:
        print(json.dumps(consensus, indent=2))
    else:
        print("No consensus data available")
        sys.exit(1)


if __name__ == "__main__":
    main()
