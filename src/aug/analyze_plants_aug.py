#!/usr/bin/env python3
"""
Analyze plants_aug folder structure and count images per class
"""

import json
from pathlib import Path
from collections import defaultdict

def main():
    plants_aug_dir = Path("samples/plants_aug")

    # Count images per class
    class_counts = {}
    total_images = 0

    # Get all folders
    folders = sorted([f for f in plants_aug_dir.iterdir() if f.is_dir()])

    print(f"Analyzing {len(folders)} classes in plants_aug/")
    print("=" * 70)

    for folder in folders:
        # Count image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
        images = [f for f in folder.iterdir() if f.is_file() and f.suffix in image_extensions]

        class_name = folder.name
        image_count = len(images)
        class_counts[class_name] = {
            "count": image_count,
            "images": [img.name for img in sorted(images)]
        }
        total_images += image_count

        print(f"{class_name:40s} : {image_count:3d} images")

    print("=" * 70)
    print(f"Total: {len(folders)} classes, {total_images} images")
    print(f"Average: {total_images / len(folders):.1f} images per class")

    # Find min and max
    counts_only = [v["count"] for v in class_counts.values()]
    print(f"Range: {min(counts_only)} - {max(counts_only)} images per class")

    # Save analysis
    output_file = Path("plants_aug_analysis.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(class_counts, f, indent=2, ensure_ascii=False)

    print(f"\n[SAVED] Analysis saved to {output_file}")

if __name__ == "__main__":
    main()
