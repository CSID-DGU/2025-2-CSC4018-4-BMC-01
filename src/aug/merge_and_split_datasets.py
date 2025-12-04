#!/usr/bin/env python3
"""
Merge plants and plants_aug datasets with weighted sampling strategy.
Split test set ONLY from plants_aug (real-world evaluation).

Strategy:
  - plants: 8,189 images → 100% for training/validation
  - plants_aug: 3,311 images → 80% training, 20% test
  - Training total: ~10,838 images (plants + 80% plants_aug)
  - Test: ~662 images (20% plants_aug only)
  - plants_aug samples get 2x weight during training
"""

import json
import random
import shutil
from pathlib import Path
from datetime import datetime
from collections import defaultdict


def main():
    # Configuration
    TEST_RATIO = 0.20  # 20% of plants_aug for test
    MIN_TEST_IMAGES = 1  # At least 1 test image per class
    RANDOM_SEED = 42

    random.seed(RANDOM_SEED)

    # Paths
    plants_dir = Path("samples/plants")
    plants_aug_dir = Path("samples/plants_aug")
    mixed_dir = Path("samples/plants_mixed")
    test_dir = Path("samples/plants_test")

    # Create output directories
    mixed_dir.mkdir(exist_ok=True)
    test_dir.mkdir(exist_ok=True)

    # Metadata
    metadata = {
        "created_at": datetime.now().isoformat(),
        "test_ratio": TEST_RATIO,
        "random_seed": RANDOM_SEED,
        "strategy": "Mixed training with weighted sampling, test from plants_aug only",
        "classes": {},
        "summary": {
            "plants_total": 0,
            "plants_aug_total": 0,
            "plants_aug_train": 0,
            "plants_aug_test": 0,
            "mixed_train_total": 0,
            "test_total": 0
        }
    }

    print("=" * 80)
    print("Merging plants + plants_aug and splitting test set")
    print("=" * 80)
    print(f"Strategy:")
    print(f"  - plants: 100% → training/validation")
    print(f"  - plants_aug: {int((1-TEST_RATIO)*100)}% → training (2x weight)")
    print(f"  - plants_aug: {int(TEST_RATIO*100)}% → test")
    print("=" * 80)
    print(f"{'Class':<40} {'plants':>8} {'aug_train':>10} {'aug_test':>9} {'mixed':>8}")
    print("-" * 80)

    # Get all classes from both datasets
    plants_classes = sorted([d.name for d in plants_dir.iterdir()
                            if d.is_dir() and not d.name.lower().startswith('zz')])

    for class_name in plants_classes:
        plants_class_dir = plants_dir / class_name
        plants_aug_class_dir = plants_aug_dir / class_name
        mixed_class_dir = mixed_dir / class_name
        test_class_dir = test_dir / class_name

        # Create class directories
        mixed_class_dir.mkdir(exist_ok=True)

        # Get image files
        def get_images(path):
            if not path.exists():
                return []
            return sorted([f.name for f in path.iterdir()
                          if f.suffix.lower() in ['.jpg', '.jpeg', '.png']])

        plants_images = get_images(plants_class_dir)
        plants_aug_images = get_images(plants_aug_class_dir)

        # Copy all plants images to mixed (prefix: plants_)
        plants_copied = 0
        for img_name in plants_images:
            src = plants_class_dir / img_name
            dst = mixed_class_dir / f"plants_{img_name}"
            shutil.copy2(src, dst)
            plants_copied += 1

        # Split plants_aug into train/test
        aug_train_count = 0
        aug_test_count = 0

        if plants_aug_images:
            # Calculate test count
            total_aug = len(plants_aug_images)
            test_count = max(MIN_TEST_IMAGES, int(total_aug * TEST_RATIO))

            # Don't take all images for test (leave at least 1 for training)
            if test_count >= total_aug:
                test_count = max(1, total_aug - 1)

            # Random shuffle and split
            shuffled = plants_aug_images.copy()
            random.shuffle(shuffled)

            test_images = shuffled[:test_count]
            train_images = shuffled[test_count:]

            # Copy train images to mixed (prefix: aug_)
            for img_name in train_images:
                src = plants_aug_class_dir / img_name
                dst = mixed_class_dir / f"aug_{img_name}"
                shutil.copy2(src, dst)
                aug_train_count += 1

            # Move test images to test directory
            if test_images:
                test_class_dir.mkdir(exist_ok=True)
                for img_name in test_images:
                    src = plants_aug_class_dir / img_name
                    dst = test_class_dir / img_name
                    shutil.copy2(src, dst)
                    aug_test_count += 1

        # Update metadata
        mixed_total = plants_copied + aug_train_count
        metadata["classes"][class_name] = {
            "plants": plants_copied,
            "plants_aug_train": aug_train_count,
            "plants_aug_test": aug_test_count,
            "mixed_train_total": mixed_total
        }

        # Update summary
        metadata["summary"]["plants_total"] += plants_copied
        metadata["summary"]["plants_aug_train"] += aug_train_count
        metadata["summary"]["plants_aug_test"] += aug_test_count
        metadata["summary"]["mixed_train_total"] += mixed_total
        metadata["summary"]["test_total"] += aug_test_count

        print(f"{class_name:<40} {plants_copied:>8} {aug_train_count:>10} "
              f"{aug_test_count:>9} {mixed_total:>8}")

    # Calculate total plants_aug
    metadata["summary"]["plants_aug_total"] = (
        metadata["summary"]["plants_aug_train"] +
        metadata["summary"]["plants_aug_test"]
    )

    print("=" * 80)
    print(f"Summary:")
    print(f"  plants:              {metadata['summary']['plants_total']:>6} images (100% training)")
    print(f"  plants_aug (train):  {metadata['summary']['plants_aug_train']:>6} images "
          f"({int((1-TEST_RATIO)*100)}%, 2x weight)")
    print(f"  plants_aug (test):   {metadata['summary']['plants_aug_test']:>6} images ({int(TEST_RATIO*100)}%)")
    print(f"  ─────────────────────────────")
    print(f"  Mixed training set:  {metadata['summary']['mixed_train_total']:>6} images")
    print(f"  Test set:            {metadata['summary']['test_total']:>6} images")
    print("=" * 80)

    # Save metadata
    metadata_file = Path("src/aug/plants_mixed_metadata.json")
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"\n[SAVED] Metadata saved to {metadata_file}")
    print(f"[SAVED] Mixed training data: {mixed_dir}")
    print(f"[SAVED] Test data: {test_dir}")
    print("\nNext steps:")
    print(f"  1. Train with weighted sampling:")
    print(f"     python src/train/train_classifier.py \\")
    print(f"       --data samples/plants_mixed \\")
    print(f"       --arch tf_efficientnetv2_b1 \\")
    print(f"       --img-size 240 \\")
    print(f"       --epochs 70 \\")
    print(f"       --weighted-sampling \\")
    print(f"       --aug-weight 2.0")
    print(f"\n  2. Evaluate on test set:")
    print(f"     python src/eval/evaluate_plants_test.py")


if __name__ == "__main__":
    main()
