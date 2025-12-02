#!/usr/bin/env python3
"""
Split plants_aug dataset into train and test.
Move test images to plants_test folder (NOT copy, to prevent data leakage).
"""

import json
import random
import shutil
from pathlib import Path
from datetime import datetime

def main():
    # Configuration
    TEST_RATIO = 0.15  # 15% for test
    MIN_TEST_IMAGES = 1  # At least 1 test image per class
    RANDOM_SEED = 42

    random.seed(RANDOM_SEED)

    # Load analysis
    analysis_file = Path("plants_aug_analysis.json")
    with open(analysis_file, "r", encoding="utf-8") as f:
        class_data = json.load(f)

    plants_aug_dir = Path("samples/plants_aug")
    plants_test_dir = Path("samples/plants_test")

    # Create plants_test directory
    plants_test_dir.mkdir(exist_ok=True)

    # Prepare split metadata
    split_metadata = {
        "created_at": datetime.now().isoformat(),
        "test_ratio": TEST_RATIO,
        "min_test_images": MIN_TEST_IMAGES,
        "random_seed": RANDOM_SEED,
        "classes": {}
    }

    total_moved = 0
    total_remaining = 0

    print("Splitting plants_aug dataset...")
    print("=" * 70)

    for class_name, data in sorted(class_data.items()):
        images = data["images"]
        total_count = len(images)

        # Calculate test count
        test_count = max(MIN_TEST_IMAGES, int(total_count * TEST_RATIO))

        # Ensure we don't take all images (leave at least 1 for training)
        if test_count >= total_count:
            test_count = max(1, total_count - 1)

        # Random shuffle and split
        shuffled_images = images.copy()
        random.shuffle(shuffled_images)

        test_images = shuffled_images[:test_count]
        train_images = shuffled_images[test_count:]

        # Create class directory in plants_test
        src_class_dir = plants_aug_dir / class_name
        dst_class_dir = plants_test_dir / class_name
        dst_class_dir.mkdir(exist_ok=True)

        # Move test images (NOT copy!)
        moved_count = 0
        for img_name in test_images:
            src_path = src_class_dir / img_name
            dst_path = dst_class_dir / img_name

            if src_path.exists():
                shutil.move(str(src_path), str(dst_path))
                moved_count += 1

        total_moved += moved_count
        total_remaining += len(train_images)

        # Save metadata
        split_metadata["classes"][class_name] = {
            "total": total_count,
            "train": len(train_images),
            "test": moved_count,
            "test_images": test_images
        }

        print(f"{class_name:40s} : {total_count:3d} total -> "
              f"{len(train_images):3d} train, {moved_count:2d} test")

    print("=" * 70)
    print(f"Total: {total_remaining} train, {total_moved} test")
    print(f"Test ratio: {total_moved / (total_remaining + total_moved) * 100:.1f}%")

    # Save split metadata
    metadata_file = Path("plants_split_metadata.json")
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(split_metadata, f, indent=2, ensure_ascii=False)

    print(f"\n[SAVED] Split metadata saved to {metadata_file}")
    print(f"[SAVED] Test images moved to {plants_test_dir}")
    print("\n[WARNING] Test images have been MOVED (not copied) from plants_aug.")
    print("          plants_aug now contains only training images.")

if __name__ == "__main__":
    main()
